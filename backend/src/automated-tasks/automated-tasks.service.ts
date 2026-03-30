import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { assertTaskNameUniqueForUser } from "@/tasks/task-name-uniqueness";

@Injectable()
export class AutomatedTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      (this.prisma as any).automatedTask.findMany({
        where: { userId },
        include: {
          runs: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: { id: true, status: true, startedAt: true, completedAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (this.prisma as any).automatedTask.count({ where: { userId } }),
    ]);
    return { tasks, total, page, limit };
  }

  async get(userId: string, taskId: string) {
    const task = await (this.prisma as any).automatedTask.findFirst({
      where: { id: taskId, userId },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });
    if (!task) throw new NotFoundException("Automated task not found");
    return task;
  }

  async create(
    userId: string,
    data: {
      name: string;
      description?: string;
      prompt: string;
      composioApps?: string[];
      scheduledTimes?: string[];
      timezone?: string;
      deliveryConfig?: Record<string, unknown>;
      status?: string;
    }
  ) {
    const taskName = String(data.name ?? "").trim();
    if (!taskName) {
      throw new BadRequestException("Task name is required");
    }
    await assertTaskNameUniqueForUser(this.prisma, userId, taskName);

    return (this.prisma as any).automatedTask.create({
      data: {
        userId,
        name: taskName,
        description: data.description || null,
        prompt: data.prompt,
        composioApps: data.composioApps ?? [],
        scheduledTimes: data.scheduledTimes ?? [],
        timezone: data.timezone || "UTC",
        deliveryConfig: data.deliveryConfig || null,
        status: data.status || "ACTIVE",
      },
    });
  }

  async update(userId: string, taskId: string, data: Record<string, unknown>) {
    const task = await (this.prisma as any).automatedTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException("Automated task not found");

    if (data.name !== undefined && typeof data.name === "string") {
      const nextName = String(data.name).trim();
      if (!nextName) {
        throw new BadRequestException("Task name cannot be empty");
      }
      await assertTaskNameUniqueForUser(this.prisma, userId, nextName, {
        excludeAutomatedTaskId: taskId,
      });
      data = { ...data, name: nextName };
    }

    return (this.prisma as any).automatedTask.update({
      where: { id: taskId },
      data,
    });
  }

  async activate(userId: string, taskId: string) {
    const task = await (this.prisma as any).automatedTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException("Automated task not found");
    if (task.status !== "ARCHIVED") {
      throw new BadRequestException("Only archived automated tasks can be reactivated this way");
    }
    return (this.prisma as any).automatedTask.update({
      where: { id: taskId },
      data: { status: "ACTIVE" },
    });
  }

  async delete(userId: string, taskId: string) {
    const task = await (this.prisma as any).automatedTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) throw new NotFoundException("Automated task not found");

    await (this.prisma as any).automatedTask.delete({ where: { id: taskId } });
    return { success: true };
  }

  async listRuns(taskId: string, limit = 20) {
    return (this.prisma as any).automatedTaskRun.findMany({
      where: { automatedTaskId: taskId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }
}
