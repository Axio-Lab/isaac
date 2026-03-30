import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { ChannelMessagingService } from "@/channels/channel-messaging.service";
import {
  msgTaskArchivedNotice,
  msgTaskActivatedNotice,
} from "@/channels/bot-messages";
import { assertTaskNameUniqueForUser } from "./task-name-uniqueness";

export interface HumanTaskCreateInput {
  name: string;
  description?: string;
  evidenceType?: string;
  recurrenceType?: string;
  recurrenceInterval?: number;
  scheduledTimes?: string[];
  timezone?: string;
  acceptanceRules?: string[];
  requiredItems?: Array<{ label: string; evidenceType: string; referenceUrl?: string }>;
  sampleEvidenceUrl?: string;
  scoringEnabled?: boolean;
  passingScore?: number;
  graceMinutes?: number;
  resubmissionAllowed?: boolean;
  reportTime?: string;
  reportChannelId?: string;
  deliveryConfig?: Record<string, unknown>;
  status?: string;
}

export type HumanTaskUpdateInput = Partial<HumanTaskCreateInput> & {
  status?: string;
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: ChannelMessagingService,
  ) {}

  async listTasks(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      (this.prisma as any).humanTask.findMany({
        where: { userId },
        include: {
          taskChannel: { select: { id: true, platform: true, label: true } },
          _count: {
            select: {
              workers: true,
              submissions: {
                where: {
                  status: {
                    in: [
                      "SUBMITTED",
                      "VETTED",
                      "APPROVED",
                      "REJECTED",
                      "RESUBMITTED",
                    ],
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (this.prisma as any).humanTask.count({ where: { userId } }),
    ]);

    return { tasks, total, page, limit };
  }

  async getTask(userId: string, taskId: string) {
    const task = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
      include: {
        taskChannel: { select: { id: true, platform: true, label: true } },
        _count: {
          select: {
            workers: true,
            submissions: true,
            reports: true,
          },
        },
      },
    });

    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async createTask(userId: string, data: HumanTaskCreateInput) {
    const isDraft = data.status === "DRAFT";

    if (!isDraft) {
      this.validatePayload(data, "create");
    } else if (!data.name || !String(data.name).trim()) {
      throw new BadRequestException("Task name is required even for drafts");
    }

    const taskName = String(data.name).trim();
    await assertTaskNameUniqueForUser(this.prisma, userId, taskName);

    const channelId =
      data.reportChannelId?.trim() || null;

    return (this.prisma as any).humanTask.create({
      data: {
        userId,
        name: taskName,
        description: data.description ?? null,
        evidenceType: data.evidenceType ?? "PHOTO",
        recurrenceType: data.recurrenceType ?? "DAILY",
        recurrenceInterval: data.recurrenceInterval ?? null,
        scheduledTimes: data.scheduledTimes ?? [],
        timezone: data.timezone ?? "UTC",
        acceptanceRules: data.acceptanceRules ?? [],
        requiredItems: data.requiredItems ?? [],
        sampleEvidenceUrl: data.sampleEvidenceUrl ?? null,
        scoringEnabled: data.scoringEnabled ?? true,
        passingScore: data.passingScore ?? 70,
        graceMinutes: data.graceMinutes ?? 15,
        resubmissionAllowed: data.resubmissionAllowed ?? true,
        reportTime: data.reportTime ?? "18:00",
        taskChannelId: channelId,
        deliveryConfig: data.deliveryConfig ?? null,
        status: isDraft ? "DRAFT" : "ACTIVE",
      },
    });
  }

  async updateTask(
    userId: string,
    taskId: string,
    data: HumanTaskUpdateInput,
  ) {
    if (Object.keys(data).length > 0) {
      this.validatePayload(data, "update");
    }

    const raw = data as Record<string, unknown>;
    const {
      reportChannelId,
      taskChannelId: incomingTaskChannelId,
      ...rest
    } = raw;

    const prismaData: Record<string, unknown> = { ...rest };

    if (reportChannelId !== undefined || incomingTaskChannelId !== undefined) {
      const channelId =
        incomingTaskChannelId !== undefined
          ? incomingTaskChannelId
          : reportChannelId;
      const trimmed =
        channelId != null && String(channelId).trim()
          ? String(channelId).trim()
          : null;
      prismaData.taskChannelId = trimmed;
      prismaData.reportChannelId = null;
    }

    if (prismaData.name !== undefined && typeof prismaData.name === "string") {
      const nextName = String(prismaData.name).trim();
      prismaData.name = nextName;
      await assertTaskNameUniqueForUser(this.prisma, userId, nextName, {
        excludeHumanTaskId: taskId,
      });
    }

    const result = await (this.prisma as any).humanTask.updateMany({
      where: { id: taskId, userId },
      data: prismaData,
    });

    if (result.count === 0) throw new NotFoundException("Task not found");
    return result;
  }

  /** Archive: no reminders/submissions; workers are notified on the task channel. */
  async archiveTask(userId: string, taskId: string) {
    const task = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException("Task not found");
    if (task.status === "ARCHIVED") {
      throw new BadRequestException("Task is already archived");
    }
    await (this.prisma as any).humanTask.update({
      where: { id: taskId },
      data: { status: "ARCHIVED" },
    });
    await this.messaging.broadcastToTask(
      taskId,
      msgTaskArchivedNotice(task.name),
    );
    return { success: true };
  }

  /** Reactivate an archived task (back to ACTIVE); workers are notified. */
  async activateTask(userId: string, taskId: string) {
    const task = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException("Task not found");
    if (task.status !== "ARCHIVED") {
      throw new BadRequestException(
        "Only archived tasks can be reactivated this way",
      );
    }
    await (this.prisma as any).humanTask.update({
      where: { id: taskId },
      data: { status: "ACTIVE" },
    });
    await this.messaging.broadcastToTask(
      taskId,
      msgTaskActivatedNotice(task.name),
    );
    return { success: true };
  }

  /** Permanently remove task and related workers, submissions, reports (DB cascades). */
  async deleteTask(userId: string, taskId: string) {
    const existing = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!existing) throw new NotFoundException("Task not found");
    await (this.prisma as any).humanTask.delete({ where: { id: taskId } });
    return { success: true };
  }

  async pauseTask(userId: string, taskId: string) {
    const task = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException("Task not found");
    if (task.status === "ARCHIVED") {
      throw new BadRequestException("Cannot pause an archived task");
    }
    if (task.status !== "ACTIVE") {
      throw new BadRequestException("Only active tasks can be paused");
    }
    await (this.prisma as any).humanTask.update({
      where: { id: taskId },
      data: { status: "PAUSED" },
    });
    return { success: true };
  }

  async resumeTask(userId: string, taskId: string) {
    const task = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException("Task not found");
    if (task.status !== "PAUSED") {
      throw new BadRequestException("Only paused tasks can be resumed");
    }
    await (this.prisma as any).humanTask.update({
      where: { id: taskId },
      data: { status: "ACTIVE" },
    });
    return { success: true };
  }

  private validatePayload(
    data: Partial<HumanTaskCreateInput>,
    mode: "create" | "update",
  ) {
    if (mode === "create") {
      if (!data.name || !String(data.name).trim()) {
        throw new BadRequestException("Task name is required");
      }
      const rules = Array.isArray(data.acceptanceRules)
        ? data.acceptanceRules.map((r) => String(r).trim()).filter(Boolean)
        : [];
      if (rules.length === 0) {
        throw new BadRequestException(
          "At least one acceptance rule is required",
        );
      }
      if (!data.reportChannelId || !String(data.reportChannelId).trim()) {
        throw new BadRequestException(
          "Notification channel is required for worker messages and reminders",
        );
      }
      const recurrence = data.recurrenceType ?? "DAILY";
      const times = Array.isArray(data.scheduledTimes)
        ? data.scheduledTimes
        : [];
      if (recurrence === "DAILY" || recurrence === "WEEKLY") {
        if (times.length === 0 || !times.some((t) => String(t).trim())) {
          throw new BadRequestException(
            "At least one scheduled time is required for daily or weekly tasks",
          );
        }
      }
      if (recurrence === "INTERVAL") {
        const iv = data.recurrenceInterval ?? 60;
        if (!iv || iv < 1) {
          throw new BadRequestException("Interval must be at least 1 minute");
        }
      }
    } else {
      if ("acceptanceRules" in data && data.acceptanceRules !== undefined) {
        const rules = Array.isArray(data.acceptanceRules)
          ? data.acceptanceRules.map((r) => String(r).trim()).filter(Boolean)
          : [];
        if (rules.length === 0) {
          throw new BadRequestException(
            "At least one acceptance rule is required",
          );
        }
      }
      if ("reportChannelId" in data && data.reportChannelId !== undefined) {
        if (!data.reportChannelId || !String(data.reportChannelId).trim()) {
          throw new BadRequestException(
            "Notification channel is required for worker messages and reminders",
          );
        }
      }
      if (
        data.recurrenceType === "DAILY" ||
        data.recurrenceType === "WEEKLY"
      ) {
        if (data.scheduledTimes !== undefined) {
          const times = Array.isArray(data.scheduledTimes)
            ? data.scheduledTimes
            : [];
          if (times.length === 0 || !times.some((t) => String(t).trim())) {
            throw new BadRequestException(
              "At least one scheduled time is required for daily or weekly tasks",
            );
          }
        }
      }
      if (
        data.recurrenceType === "INTERVAL" &&
        data.recurrenceInterval !== undefined
      ) {
        if (!data.recurrenceInterval || data.recurrenceInterval < 1) {
          throw new BadRequestException(
            "Interval must be at least 1 minute",
          );
        }
      }
    }
  }
}
