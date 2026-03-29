import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "@/common/prisma.service";

/**
 * Task names must be unique per user across human and automated tasks (case-insensitive).
 * Archived tasks are ignored so names can be reused after archiving.
 */
export async function assertTaskNameUniqueForUser(
  prisma: PrismaService,
  userId: string,
  name: string,
  opts?: {
    excludeHumanTaskId?: string;
    excludeAutomatedTaskId?: string;
  },
): Promise<void> {
  const trimmed = String(name).trim();
  if (!trimmed) return;

  const nameFilter = { equals: trimmed, mode: "insensitive" as const };

  const humanConflict = await (prisma as any).humanTask.findFirst({
    where: {
      userId,
      status: { not: "ARCHIVED" },
      name: nameFilter,
      ...(opts?.excludeHumanTaskId
        ? { NOT: { id: opts.excludeHumanTaskId } }
        : {}),
    },
  });

  const autoConflict = await (prisma as any).automatedTask.findFirst({
    where: {
      userId,
      status: { not: "ARCHIVED" },
      name: nameFilter,
      ...(opts?.excludeAutomatedTaskId
        ? { NOT: { id: opts.excludeAutomatedTaskId } }
        : {}),
    },
  });

  if (humanConflict || autoConflict) {
    throw new BadRequestException(
      "A task with this name already exists. Choose a unique name.",
    );
  }
}
