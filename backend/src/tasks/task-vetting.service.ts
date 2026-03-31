import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { msgVettingFeedback } from "@/channels/bot-messages";
import { getTaskInstructions } from "@/agent/isaac-system-prompt";
import { TaskFlagService } from "./task-flag.service";

async function downloadImageAsBase64(
  url: string
): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const mediaType = contentType.split(";")[0].trim();
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString("base64"), mediaType };
  } catch {
    return null;
  }
}

function parseVettingJson(text: string): {
  score: number;
  passed: boolean;
  findings: string[];
  summary: string;
} | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const cleaned = jsonMatch[0].replace(/,\s*([\]}])/g, "$1").replace(/[\x00-\x1F]+/g, " ");
    const parsed = JSON.parse(cleaned);
    return {
      score: typeof parsed.score === "number" ? parsed.score : 50,
      passed: typeof parsed.passed === "boolean" ? parsed.passed : parsed.score >= 70,
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "Evaluation completed",
    };
  } catch {
    return null;
  }
}

@Injectable()
export class TaskVettingService {
  private readonly logger = new Logger(TaskVettingService.name);

  private generateText:
    | ((opts: {
        systemPrompt: string;
        userPrompt: string;
        images?: Array<{ base64: string; mediaType: string }>;
      }) => Promise<{ text: string }>)
    | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly flagService: TaskFlagService
  ) {}

  setGenerateText(
    fn: (opts: {
      systemPrompt: string;
      userPrompt: string;
      images?: Array<{ base64: string; mediaType: string }>;
    }) => Promise<{ text: string }>
  ) {
    this.generateText = fn;
  }

  async vetSubmission(submissionId: string): Promise<string> {
    if (!this.generateText) {
      throw new Error("AI text generation is not configured. Call setGenerateText first.");
    }

    const submission = await (this.prisma as any).taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        humanTask: { include: { user: { select: { id: true } } } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!submission) throw new NotFoundException("Submission not found");

    await (this.prisma as any).taskSubmission.update({
      where: { id: submissionId },
      data: { vetAttempts: { increment: 1 } },
    });

    const rules = Array.isArray(submission.humanTask.acceptanceRules)
      ? submission.humanTask.acceptanceRules
      : [];
    const rulesText =
      rules.length > 0
        ? rules.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")
        : "No specific rules defined. Evaluate general quality and completeness.";

    const systemPrompt = getTaskInstructions("vetting");
    const images: Array<{ base64: string; mediaType: string }> = [];
    const submissionItems: any[] = submission.items ?? [];

    let userPrompt: string;

    if (submissionItems.length > 0) {
      userPrompt = await this.buildMultiItemPrompt(submission, submissionItems, rulesText, images);
    } else {
      userPrompt = await this.buildSingleItemPrompt(submission, rulesText, images);
    }

    userPrompt += "\nRespond with ONLY the JSON evaluation object, no other text.";

    const { text: agentText } = await this.generateText({
      systemPrompt,
      userPrompt,
      images: images.length > 0 ? images : undefined,
    });

    let result = parseVettingJson(agentText);
    if (!result) {
      result = {
        score: 70,
        passed: true,
        findings: [
          "Evidence received — automated evaluation could not fully analyze the submission",
        ],
        summary: "Evidence submitted and recorded. Manual review may apply.",
      };
    }

    const passed = result.passed || result.score >= (submission.humanTask.passingScore || 70);
    const status = passed ? "APPROVED" : "REJECTED";

    await (this.prisma as any).taskSubmission.update({
      where: { id: submissionId },
      data: {
        aiScore: result.score,
        aiFindings: JSON.stringify(result.findings),
        aiFeedback: result.summary,
        status,
      },
    });

    if (!passed) {
      await this.flagService.flagLowScoreSubmission(submissionId).catch(() => null);
    }

    return msgVettingFeedback(
      result.score,
      passed,
      result.findings,
      result.summary,
      !passed && !!submission.humanTask.resubmissionAllowed,
      !passed ? rules : undefined
    );
  }

  private async buildSingleItemPrompt(
    submission: any,
    rulesText: string,
    images: Array<{ base64: string; mediaType: string }>
  ): Promise<string> {
    let userPrompt = `Evaluate this evidence against these acceptance rules:\n\n${rulesText}\n\n`;

    const sampleUrl = submission.humanTask.sampleEvidenceUrl;
    if (sampleUrl) {
      const sampleImg = await downloadImageAsBase64(sampleUrl);
      if (sampleImg) {
        images.push(sampleImg);
        userPrompt += `The first image is the REFERENCE/EXPECTED evidence. Compare the submission against it carefully.\n\n`;
      } else {
        userPrompt += `REFERENCE/EXPECTED EVIDENCE (could not load image): ${sampleUrl}\n\n`;
      }
    }

    if (submission.imageUrl) {
      const submittedImg = await downloadImageAsBase64(submission.imageUrl);
      if (submittedImg) {
        images.push(submittedImg);
        userPrompt += `${sampleUrl ? "The next image is the" : "The image is the"} SUBMITTED evidence. Analyze it against the acceptance rules.\n`;
      } else {
        this.logger.warn(`Could not download submission image: ${submission.imageUrl}`);
        userPrompt += `SUBMITTED IMAGE: Worker sent an image but it could not be downloaded for analysis.\n`;
        userPrompt += `Since the image is inaccessible, evaluate based on any text message provided. If no text, note that evidence could not be verified.\n`;
      }
    }

    if (submission.rawMessage) {
      userPrompt += `Worker's message: "${submission.rawMessage}"\n`;
    }

    return userPrompt;
  }

  private async buildMultiItemPrompt(
    submission: any,
    items: any[],
    rulesText: string,
    images: Array<{ base64: string; mediaType: string }>
  ): Promise<string> {
    const requiredItems: Array<{ label: string; evidenceType: string; referenceUrl?: string }> =
      Array.isArray(submission.humanTask.requiredItems) ? submission.humanTask.requiredItems : [];

    let userPrompt =
      `This submission contains ${items.length} required evidence items. ` +
      `Evaluate ALL items together against these acceptance rules:\n\n${rulesText}\n\n` +
      `Items submitted:\n`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const reqItem = requiredItems[i];
      const label = item.label || `Item ${i + 1}`;
      userPrompt += `\n--- ${label} ---\n`;

      if (reqItem?.referenceUrl) {
        const refImg = await downloadImageAsBase64(reqItem.referenceUrl);
        if (refImg) {
          images.push(refImg);
          userPrompt += `[REFERENCE image for ${label} attached]\n`;
        }
      }

      if (item.imageUrl) {
        const img = await downloadImageAsBase64(item.imageUrl);
        if (img) {
          images.push(img);
          userPrompt += `[SUBMITTED image for ${label} attached]\n`;
        } else {
          userPrompt += `[SUBMITTED image for ${label} could not be downloaded]\n`;
        }
      }

      if (item.rawMessage) {
        userPrompt += `Worker's note for ${label}: "${item.rawMessage}"\n`;
      }
    }

    return userPrompt;
  }
}
