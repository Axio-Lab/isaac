import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { ChannelMessagingService } from "./channel-messaging.service";
import { buildExternalIdCandidates } from "./platform-utils";

@Injectable()
export class InboundMessageService {
  private readonly logger = new Logger(InboundMessageService.name);

  private vetSubmission:
    | ((submissionId: string) => Promise<string>)
    | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: ChannelMessagingService,
  ) {}

  setVetSubmission(fn: (submissionId: string) => Promise<string>) {
    this.vetSubmission = fn;
  }

  async handleIncoming(params: {
    channelId: string;
    platform: string;
    senderExternalId: string;
    text?: string;
    imageUrl?: string;
  }): Promise<void> {
    const { channelId, platform, senderExternalId, text, imageUrl } = params;

    const externalIds = buildExternalIdCandidates(senderExternalId, platform);

    if (await this.handleOnboarding(channelId, externalIds, text)) return;
    await this.handleSubmission(channelId, platform, externalIds, senderExternalId, text, imageUrl);
  }

  // ─── Onboarding (READY flow) ────────────────────────────────────

  private async handleOnboarding(
    channelId: string,
    externalIds: string[],
    text?: string,
  ): Promise<boolean> {
    const worker = await (this.prisma as any).humanWorker.findFirst({
      where: {
        taskChannelId: channelId,
        externalId: { in: externalIds },
        status: "ONBOARDING",
      },
      include: { humanTask: true },
    });
    if (!worker) return false;

    const trimmed = (text || "").trim().toLowerCase();

    if (trimmed === "ready") {
      await (this.prisma as any).humanWorker.update({
        where: { id: worker.id },
        data: { status: "ACTIVE", onboardedAt: new Date() },
      });
      this.logger.log(`Worker ${worker.name} (${worker.id}) activated via "ready" reply`);
      await this.messaging.sendToWorker(
        worker.id,
        `Great, ${worker.name}! You're now active on "${worker.humanTask.name}". ` +
          `You'll receive task prompts at the scheduled times — just reply with the required evidence when prompted. Let's go!`,
      );
    } else {
      await this.messaging.sendToWorker(
        worker.id,
        `Hi ${worker.name}, please reply with "Ready" to confirm you're set up and start receiving tasks.`,
      );
    }

    return true;
  }

  // ─── Submission handling ─────────────────────────────────────────

  private async handleSubmission(
    channelId: string,
    platform: string,
    externalIds: string[],
    rawExternalId: string,
    text?: string,
    imageUrl?: string,
  ): Promise<void> {
    const worker = await (this.prisma as any).humanWorker.findFirst({
      where: {
        taskChannelId: channelId,
        externalId: { in: externalIds },
        status: "ACTIVE",
      },
      include: { humanTask: true },
    });

    if (!worker) {
      this.logger.debug(
        `No worker found for externalId=${rawExternalId} (candidates: ${externalIds.join(", ")}) on channel=${channelId}`,
      );
      return;
    }

    const pendingSubmission = await (this.prisma as any).taskSubmission.findFirst({
      where: {
        workerId: worker.id,
        humanTaskId: worker.humanTaskId,
        status: { in: ["PENDING", "REJECTED"] },
      },
      orderBy: { dueAt: "asc" },
    });

    if (!pendingSubmission) {
      const task = worker.humanTask as {
        name: string;
        scheduledTimes?: unknown;
        timezone?: string | null;
      };
      const times = Array.isArray(task.scheduledTimes)
        ? task.scheduledTimes.filter((t): t is string => typeof t === "string")
        : [];
      const tz = task.timezone || "UTC";
      const scheduleLine =
        times.length > 0
          ? `\n\nThis task is set to prompt you around: ${times.join(", ")} (${tz}).`
          : "\n\nNo fixed daily times are configured — you'll be notified when the next round opens.";

      await this.messaging.sendToWorker(
        worker.id,
        `Hi ${worker.name},\n\n` +
          `There isn't an open submission for "${task.name}" right now. ` +
          `We're not expecting evidence from you until the next assignment is created for you.` +
          scheduleLine +
          `\n\nWhen it's time, you'll get a message here asking for your proof — reply to that one with your evidence. ` +
          `If you already sent everything for the latest request, you're all set until the next round.`,
      );
      return;
    }

    const updateData: Record<string, unknown> = {
      status: "SUBMITTED",
      submittedAt: new Date(),
    };
    if (text) updateData.rawMessage = text;
    if (imageUrl) updateData.imageUrl = imageUrl;

    await (this.prisma as any).taskSubmission.update({
      where: { id: pendingSubmission.id },
      data: updateData,
    });

    this.logger.log(`Submission ${pendingSubmission.id} received from worker ${worker.name} (${platform})`);

    await this.sendVettingFeedback(worker, pendingSubmission.id);
  }

  // ─── AI vetting feedback ────────────────────────────────────────

  private async sendVettingFeedback(worker: any, submissionId: string): Promise<void> {
    if (!this.vetSubmission) {
      await this.messaging.sendToWorker(
        worker.id,
        `Thanks ${worker.name}, your submission has been received!`,
      );
      return;
    }

    try {
      const feedback = await this.vetSubmission(submissionId);
      await this.messaging.sendToWorker(worker.id, feedback);
    } catch (err: any) {
      this.logger.error(`Vetting failed for submission ${submissionId}`, err);
      await this.messaging.sendToWorker(
        worker.id,
        `Thanks ${worker.name}, your submission has been received and is being reviewed.`,
      );
    }
  }
}
