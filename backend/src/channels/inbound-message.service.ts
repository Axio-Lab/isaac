import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { ChannelMessagingService } from "./channel-messaging.service";
import { buildExternalIdCandidates } from "./platform-utils";
import {
  msgOnboardingSuccess,
  msgOnboardingPrompt,
  msgNoPendingSubmission,
  msgSubmissionReceived,
  msgSubmissionReceivedReview,
  msgCannotSubmitTaskArchived,
} from "./bot-messages";

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

    if (worker.humanTask.status === "ARCHIVED") {
      await this.messaging.sendToWorker(
        worker.id,
        msgCannotSubmitTaskArchived(worker.name, worker.humanTask.name),
      );
      return true;
    }

    if (trimmed === "ready") {
      await (this.prisma as any).humanWorker.update({
        where: { id: worker.id },
        data: { status: "ACTIVE", onboardedAt: new Date() },
      });
      this.logger.log(`Worker ${worker.name} (${worker.id}) activated via "ready" reply`);
      await this.messaging.sendToWorker(
        worker.id,
        msgOnboardingSuccess(worker.name, worker.humanTask.name),
      );
    } else {
      await this.messaging.sendToWorker(
        worker.id,
        msgOnboardingPrompt(worker.name),
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

    if (worker.humanTask.status === "ARCHIVED") {
      await this.messaging.sendToWorker(
        worker.id,
        msgCannotSubmitTaskArchived(worker.name, worker.humanTask.name),
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

      await this.messaging.sendToWorker(
        worker.id,
        msgNoPendingSubmission(worker.name, task.name, times, tz),
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
        msgSubmissionReceived(worker.name),
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
        msgSubmissionReceivedReview(worker.name),
      );
    }
  }
}
