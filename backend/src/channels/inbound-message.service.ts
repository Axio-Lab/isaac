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
  msgHelpResponse,
  msgItemReceived,
  msgAllItemsReceived,
  type TaskInfoForWorker,
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

    if (await this.handleHelp(channelId, externalIds, text)) return;
    if (await this.handleOnboarding(channelId, externalIds, text)) return;
    await this.handleSubmission(channelId, platform, externalIds, senderExternalId, text, imageUrl);
  }

  // ─── Help command ─────────────────────────────────────────────────

  private async handleHelp(
    channelId: string,
    externalIds: string[],
    text?: string,
  ): Promise<boolean> {
    const trimmed = (text || "").trim().toLowerCase();
    if (trimmed !== "help") return false;

    const worker = await (this.prisma as any).humanWorker.findFirst({
      where: {
        taskChannelId: channelId,
        externalId: { in: externalIds },
        status: { in: ["ONBOARDING", "ACTIVE"] },
      },
      include: { humanTask: true },
    });
    if (!worker) return false;

    const task = worker.humanTask;
    const info: TaskInfoForWorker = {
      name: task.name,
      description: task.description,
      evidenceType: task.evidenceType || "PHOTO",
      requiredItems: Array.isArray(task.requiredItems) ? task.requiredItems : [],
      acceptanceRules: Array.isArray(task.acceptanceRules) ? task.acceptanceRules : [],
      scheduledTimes: Array.isArray(task.scheduledTimes) ? task.scheduledTimes : [],
      timezone: task.timezone || "UTC",
      passingScore: task.passingScore ?? 70,
      resubmissionAllowed: task.resubmissionAllowed ?? true,
    };

    let pendingInfo: string | undefined;
    if (worker.status === "ACTIVE") {
      const pending = await (this.prisma as any).taskSubmission.findFirst({
        where: {
          workerId: worker.id,
          humanTaskId: worker.humanTaskId,
          status: { in: ["PENDING", "COLLECTING"] },
        },
        orderBy: { dueAt: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
      if (pending) {
        const items = pending.items ?? [];
        const received = items.filter((it: any) => it.receivedAt != null).length;
        if (items.length > 0 && received < items.length) {
          pendingInfo = `You have a pending submission (${received}/${items.length} items received).`;
        } else {
          pendingInfo = `You have a pending submission due at ${pending.dueAt.toISOString().slice(11, 16)} UTC.`;
        }
      } else {
        pendingInfo = "No pending submissions right now.";
      }
    }

    await this.messaging.sendToWorker(
      worker.id,
      msgHelpResponse(worker.name, info, worker.status, pendingInfo),
    );
    return true;
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
        status: { in: ["PENDING", "COLLECTING", "REJECTED"] },
      },
      orderBy: { dueAt: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
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

    const items: any[] = pendingSubmission.items ?? [];

    if (items.length === 0) {
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
      return;
    }

    // ── Multi-item sequential collection ──
    if (pendingSubmission.status === "REJECTED") {
      await (this.prisma as any).submissionItem.updateMany({
        where: { submissionId: pendingSubmission.id },
        data: { imageUrl: null, rawMessage: null, receivedAt: null },
      });
      await (this.prisma as any).taskSubmission.update({
        where: { id: pendingSubmission.id },
        data: { status: "PENDING", aiScore: null, aiFindings: null, aiFeedback: null, submittedAt: null },
      });
      for (const it of items) {
        it.imageUrl = null;
        it.rawMessage = null;
        it.receivedAt = null;
      }
    }

    const nextItem = items.find((it: any) => it.receivedAt == null);
    if (!nextItem) {
      await this.messaging.sendToWorker(worker.id, msgSubmissionReceived(worker.name));
      return;
    }

    const itemUpdate: Record<string, unknown> = { receivedAt: new Date() };
    if (imageUrl) itemUpdate.imageUrl = imageUrl;
    if (text) itemUpdate.rawMessage = text;

    await (this.prisma as any).submissionItem.update({
      where: { id: nextItem.id },
      data: itemUpdate,
    });

    const receivedCount = items.filter((it: any) => it.receivedAt != null).length + 1;
    const totalCount = items.length;

    if (receivedCount < totalCount) {
      const nextPending = items.find((it: any) => it.receivedAt == null && it.id !== nextItem.id);
      await (this.prisma as any).taskSubmission.update({
        where: { id: pendingSubmission.id },
        data: { status: "COLLECTING" },
      });
      await this.messaging.sendToWorker(
        worker.id,
        msgItemReceived(nextItem.label, receivedCount, totalCount, nextPending?.label ?? "next item"),
      );
    } else {
      await (this.prisma as any).taskSubmission.update({
        where: { id: pendingSubmission.id },
        data: { status: "SUBMITTED", submittedAt: new Date() },
      });
      this.logger.log(`All ${totalCount} items received for submission ${pendingSubmission.id} from worker ${worker.name}`);
      await this.messaging.sendToWorker(worker.id, msgAllItemsReceived(worker.name));
      await this.sendVettingFeedback(worker, pendingSubmission.id);
    }
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
