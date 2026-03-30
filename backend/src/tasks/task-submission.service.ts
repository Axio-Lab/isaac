import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";

@Injectable()
export class TaskSubmissionService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubmissions(
    taskId: string,
    filters?: {
      workerId?: string;
      status?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    const where: Record<string, unknown> = { humanTaskId: taskId };
    if (filters?.workerId) where.workerId = filters.workerId;
    if (filters?.status) where.status = filters.status;

    if (filters?.dateFrom || filters?.dateTo) {
      const dueAt: Record<string, Date> = {};
      if (filters.dateFrom) dueAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setDate(end.getDate() + 1);
        dueAt.lt = end;
      }
      where.dueAt = dueAt;
    } else if (filters?.date) {
      const day = new Date(filters.date);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      where.dueAt = { gte: day, lt: nextDay };
    }

    return (this.prisma as any).taskSubmission.findMany({
      where,
      include: {
        worker: { select: { id: true, name: true, platform: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { dueAt: "desc" },
      take: 500,
    });
  }

  async getSubmission(submissionId: string) {
    const submission = await (this.prisma as any).taskSubmission.findUnique({
      where: { id: submissionId },
      include: { worker: true, humanTask: true },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    return submission;
  }

  async createSubmission(data: {
    humanTaskId: string;
    workerId: string;
    dueAt: Date;
    status?: string;
  }) {
    return (this.prisma as any).taskSubmission.create({
      data: {
        humanTaskId: data.humanTaskId,
        workerId: data.workerId,
        dueAt: data.dueAt,
        status: data.status ?? "PENDING",
      },
    });
  }

  async updateSubmission(submissionId: string, data: { status?: string; aiScore?: number }) {
    const submission = await (this.prisma as any).taskSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException("Submission not found");

    return (this.prisma as any).taskSubmission.update({
      where: { id: submissionId },
      data,
    });
  }

  async getSubmissionsForReport(taskId: string, periodStart: Date, periodEnd: Date) {
    return (this.prisma as any).taskSubmission.findMany({
      where: {
        humanTaskId: taskId,
        dueAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        worker: { select: { id: true, name: true, platform: true } },
      },
      orderBy: { dueAt: "asc" },
    });
  }
}
