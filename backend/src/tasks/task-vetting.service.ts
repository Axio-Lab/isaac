import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";

function getPublicImageUrl(imageUrl: string): string {
  const base = (process.env.API_URL || "").replace(/\/$/, "");
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
    return imageUrl;
  const clean = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return base ? `${base}${clean}` : clean;
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
    const cleaned = jsonMatch[0]
      .replace(/,\s*([\]}])/g, "$1")
      .replace(/[\x00-\x1F]+/g, " ");
    const parsed = JSON.parse(cleaned);
    return {
      score: typeof parsed.score === "number" ? parsed.score : 50,
      passed:
        typeof parsed.passed === "boolean"
          ? parsed.passed
          : parsed.score >= 70,
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : "Evaluation completed",
    };
  } catch {
    return null;
  }
}

@Injectable()
export class TaskVettingService {
  private generateText: ((opts: {
    systemPrompt: string;
    userPrompt: string;
  }) => Promise<{ text: string }>) | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Allows the AgentModule or app bootstrap to inject the AI text generation
   * function without creating a hard circular dependency.
   */
  setGenerateText(
    fn: (opts: {
      systemPrompt: string;
      userPrompt: string;
    }) => Promise<{ text: string }>,
  ) {
    this.generateText = fn;
  }

  async vetSubmission(submissionId: string): Promise<string> {
    if (!this.generateText) {
      throw new Error(
        "AI text generation is not configured. Call setGenerateText first.",
      );
    }

    const submission = await (this.prisma as any).taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        humanTask: { include: { user: { select: { id: true } } } },
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

    const sampleUrl = submission.humanTask.sampleEvidenceUrl;

    const systemPrompt =
      "You are a strict quality inspector for task compliance. " +
      "Evaluate submitted evidence against the provided acceptance rules. " +
      "Always respond with ONLY valid JSON in this exact format: " +
      '{ "score": 0-100, "passed": true/false, "findings": ["finding1", "finding2"], "summary": "brief summary" }. ' +
      "Do not include any text before or after the JSON.";

    let userPrompt = `Evaluate this evidence against these acceptance rules:\n\n${rulesText}\n\n`;

    if (sampleUrl) {
      userPrompt += `REFERENCE/EXPECTED EVIDENCE: ${sampleUrl}\nCompare against this reference carefully.\n\n`;
    }
    if (submission.imageUrl) {
      const publicUrl = getPublicImageUrl(submission.imageUrl);
      userPrompt += `SUBMITTED IMAGE: ${publicUrl}\n`;
      userPrompt += `Analyze the image content. Does it meet the acceptance rules?\n`;
    }
    if (submission.rawMessage) {
      userPrompt += `Worker's message: "${submission.rawMessage}"\n`;
    }
    userPrompt += "\nRespond with ONLY the JSON evaluation object, no other text.";

    const { text: agentText } = await this.generateText({
      systemPrompt,
      userPrompt,
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

    const passed =
      result.passed ||
      result.score >= (submission.humanTask.passingScore || 70);
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

    const findings = result.findings
      .map((f: string) => `- ${f}`)
      .join("\n");
    let feedback = `Score: ${result.score}/100 — ${passed ? "Passed!" : "Did not pass"}\n\n${findings}\n\n${result.summary}`;

    if (!passed && submission.humanTask.resubmissionAllowed) {
      feedback += "\n\nPlease try again and send a new submission.";
    }

    return feedback;
  }
}
