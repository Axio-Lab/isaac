import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { ChannelMessagingService } from "@/channels/channel-messaging.service";
import {
  msgOnboardingWelcome,
  msgWorkerPaused,
  msgWorkerReactivated,
  msgWorkerRemoved,
  type TaskInfoForWorker,
} from "@/channels/bot-messages";

export interface WorkerCreateInput {
  name: string;
  phone?: string;
  platform: string;
  externalId: string;
  role?: string;
}

@Injectable()
export class TaskWorkerService {
  private readonly logger = new Logger(TaskWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: ChannelMessagingService
  ) {}

  async listWorkers(taskId: string) {
    return (this.prisma as any).humanWorker.findMany({
      where: { humanTaskId: taskId },
      include: {
        submissions: {
          orderBy: { dueAt: "desc" },
          take: 1,
          select: { status: true, dueAt: true, aiScore: true },
        },
        flagEvents: {
          where: { status: "OPEN" },
          orderBy: { triggeredAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async addWorker(taskId: string, data: WorkerCreateInput) {
    const normalized = this.normalizeInput(data);

    const task = await (this.prisma as any).humanTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException("Task not found");
    if (!task.taskChannelId) {
      throw new BadRequestException(
        "This task has no notification channel. Add one before inviting members."
      );
    }

    let phone = normalized.phone ?? null;
    if (!phone && normalized.externalId) {
      const digits = normalized.externalId.replace(/\D/g, "");
      if (digits.length >= 8) {
        phone = normalized.externalId.startsWith("+") ? normalized.externalId : `+${digits}`;
      }
    }

    const worker = await (this.prisma as any).humanWorker.create({
      data: {
        humanTaskId: taskId,
        name: normalized.name,
        phone,
        platform: normalized.platform,
        externalId: normalized.externalId,
        role: normalized.role ?? null,
        status: "ONBOARDING",
        taskChannelId: task.taskChannelId,
      },
    });

    this.sendOnboardingMessage(worker.id, worker.name, taskId).catch((err) =>
      this.logger.warn(`Onboarding message failed for worker ${worker.id}: ${err.message}`)
    );

    return worker;
  }

  private async sendOnboardingMessage(
    workerId: string,
    workerName: string,
    taskId: string
  ): Promise<void> {
    const task = await (this.prisma as any).humanTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      await this.messaging.sendToWorker(workerId, msgOnboardingWelcome(workerName, "Unknown Task"));
      return;
    }
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
    await this.messaging.sendToWorker(workerId, msgOnboardingWelcome(workerName, info));
  }

  async updateWorker(
    taskId: string,
    workerId: string,
    data: { status?: "ACTIVE" | "INACTIVE"; role?: string }
  ) {
    const worker = await (this.prisma as any).humanWorker.findFirst({
      where: { id: workerId, humanTaskId: taskId },
      include: { humanTask: true },
    });
    if (!worker) throw new NotFoundException("Worker not found");

    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.role !== undefined) updateData.role = data.role;

    const updated = await (this.prisma as any).humanWorker.update({
      where: { id: workerId },
      data: updateData,
    });

    if (data.status && data.status !== worker.status) {
      this.notifyStatusChange(workerId, worker.name, worker.humanTask.name, data.status).catch(
        (err) =>
          this.logger.warn(`Status notification failed for worker ${workerId}: ${err.message}`)
      );
    }

    return updated;
  }

  private async notifyStatusChange(
    workerId: string,
    workerName: string,
    taskName: string,
    newStatus: string
  ): Promise<void> {
    let text: string;
    if (newStatus === "INACTIVE") {
      text = msgWorkerPaused(workerName, taskName);
    } else if (newStatus === "ACTIVE") {
      text = msgWorkerReactivated(workerName, taskName);
    } else {
      return;
    }
    await this.messaging.sendToWorker(workerId, text);
  }

  async removeWorker(taskId: string, workerId: string) {
    const worker = await (this.prisma as any).humanWorker.findFirst({
      where: { id: workerId, humanTaskId: taskId },
      include: { humanTask: true },
    });
    if (!worker) throw new NotFoundException("Worker not found");

    this.messaging
      .sendToWorker(workerId, msgWorkerRemoved(worker.name, worker.humanTask.name))
      .catch((err) =>
        this.logger.warn(`Removal notification failed for worker ${workerId}: ${err.message}`)
      );

    await (this.prisma as any).humanWorker.delete({ where: { id: workerId } });
    return { success: true };
  }

  private normalizeInput(data: WorkerCreateInput): WorkerCreateInput {
    const platform = String(data.platform || "")
      .trim()
      .toUpperCase();
    const name = String(data.name || "").trim();
    const externalRaw = String(data.externalId || "").trim();
    const phoneRaw = data.phone != null ? String(data.phone).trim() : "";
    const role = data.role != null ? String(data.role).trim() : "";

    if (!name) throw new BadRequestException("Member name is required.");
    if (!platform) throw new BadRequestException("Platform is required.");
    if (!externalRaw) throw new BadRequestException("ID/phone is required.");
    if (/\s/.test(externalRaw)) throw new BadRequestException("ID/phone cannot contain spaces.");
    if (phoneRaw && /\s/.test(phoneRaw))
      throw new BadRequestException("Phone number cannot contain spaces.");

    let externalId = externalRaw;
    let phone = phoneRaw || undefined;

    if (platform === "WHATSAPP") {
      const jid = externalRaw.replace(/:.*@/, "@");
      if (/@/.test(jid)) {
        if (!/^\d{7,20}@(s\.whatsapp\.net|lid)$/.test(jid)) {
          throw new BadRequestException("WhatsApp ID must be a valid phone number or JID.");
        }
        externalId = jid;
        if (!phone && jid.endsWith("@s.whatsapp.net")) {
          phone = `+${jid.replace(/@s\.whatsapp\.net$/, "")}`;
        }
      } else {
        const digits = externalRaw.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 20) {
          throw new BadRequestException("WhatsApp number must be 7-20 digits.");
        }
        externalId = `+${digits}`;
        phone = phone || `+${digits}`;
      }
    } else if (platform === "TELEGRAM") {
      if (!/^-?\d{4,20}$/.test(externalRaw)) {
        throw new BadRequestException("Telegram chat/user ID must be numeric.");
      }
    } else if (platform === "SLACK") {
      if (!/^[A-Za-z0-9_-]{6,40}$/.test(externalRaw)) {
        throw new BadRequestException("Slack ID format is invalid.");
      }
    } else if (platform === "DISCORD") {
      if (!/^\d{6,30}$/.test(externalRaw)) {
        throw new BadRequestException("Discord user ID must be numeric.");
      }
    }

    if (phone) {
      const pDigits = phone.replace(/\D/g, "");
      if (pDigits.length < 7 || pDigits.length > 20) {
        throw new BadRequestException("Phone number must be 7-20 digits.");
      }
      phone = `+${pDigits}`;
    }

    return { ...data, platform, name, externalId, phone, role: role || undefined };
  }
}
