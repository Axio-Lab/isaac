import { z } from "zod";

export interface ToolContext {
  userId: string;
  prisma: any;
  services?: {
    reportService?: {
      generateDailyReport(taskId: string, userId: string): Promise<any>;
      deliverAndRecord(reportId: string, taskId: string, userId: string): Promise<any>;
    };
    channelsService?: {
      createChannel(
        userId: string,
        data: {
          label: string;
          platform: any;
          telegramBotToken?: string;
          telegramBotUsername?: string;
          slackBotToken?: string;
          slackSigningSecret?: string;
          slackTeamId?: string;
          slackChannelId?: string;
          discordBotToken?: string;
          discordGuildId?: string;
          discordChannelId?: string;
          webhookUrl?: string;
        }
      ): Promise<any>;
    };
    whatsappService?: {
      getQrObservable(channelId: string): import("rxjs").Observable<{
        type: "qr" | "connected" | "error" | "close";
        data?: string;
        phoneNumber?: string;
        message?: string;
      }>;
      startSession(channelId: string): Promise<void>;
    };
    composioService?: {
      initiateAppConnection(
        userId: string,
        appSlug: string
      ): Promise<{ redirectUrl: string | null; connectionId: string }>;
      listAvailableApps(): Promise<any[]>;
    };
  };
}

export interface IsaacTool {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  execute: (args: any, context: ToolContext) => Promise<any>;
}

// ============================================
// Task Tools
// ============================================

const listTasks: IsaacTool = {
  name: "listTasks",
  description:
    "List tasks with optional filters. Returns task summaries including id, title, status, " +
    "priority, assignee, and due date.",
  inputSchema: z.object({
    status: z
      .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "PAUSED", "CANCELLED"])
      .optional()
      .describe("Filter by task status"),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .optional()
      .describe("Filter by priority level"),
    assigneeId: z.string().optional().describe("Filter by assigned worker ID"),
    dueBefore: z.string().optional().describe("Filter tasks due before this ISO date"),
    dueAfter: z.string().optional().describe("Filter tasks due after this ISO date"),
    limit: z.number().optional().describe("Maximum number of tasks to return (default 50)"),
    offset: z.number().optional().describe("Number of tasks to skip for pagination"),
  }),
  execute: async (args, context) => {
    const where: any = { userId: context.userId };

    if (args.status) where.status = args.status;
    if (args.priority) where.priority = args.priority;
    if (args.assigneeId) where.assignedToId = args.assigneeId;
    if (args.dueBefore || args.dueAfter) {
      where.dueDate = {};
      if (args.dueBefore) where.dueDate.lte = new Date(args.dueBefore);
      if (args.dueAfter) where.dueDate.gte = new Date(args.dueAfter);
    }

    const tasks = await context.prisma.task.findMany({
      where,
      take: args.limit || 50,
      skip: args.offset || 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    const total = await context.prisma.task.count({ where });

    return { tasks, total, limit: args.limit || 50, offset: args.offset || 0 };
  },
};

const getTask: IsaacTool = {
  name: "getTask",
  description: "Get full details of a specific task including submissions and activity history.",
  inputSchema: z.object({
    taskId: z.string().describe("The task ID to retrieve"),
  }),
  execute: async (args, context) => {
    const task = await context.prisma.task.findFirst({
      where: { id: args.taskId, userId: context.userId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            content: true,
            status: true,
            createdAt: true,
            submittedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    return task;
  },
};

const createTask: IsaacTool = {
  name: "createTask",
  description:
    "Create a new task with title, description, priority, due date, and optional assignment.",
  inputSchema: z.object({
    title: z.string().describe("Task title"),
    description: z.string().optional().describe("Detailed task description"),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .optional()
      .describe("Task priority (default MEDIUM)"),
    dueDate: z.string().optional().describe("Due date in ISO format"),
    assigneeId: z.string().optional().describe("Worker ID to assign the task to"),
    tags: z.array(z.string()).optional().describe("Tags for categorization"),
  }),
  execute: async (args, context) => {
    const data: any = {
      title: args.title,
      userId: context.userId,
      status: "PENDING",
      priority: args.priority || "MEDIUM",
    };

    if (args.description) data.description = args.description;
    if (args.dueDate) data.dueDate = new Date(args.dueDate);
    if (args.assigneeId) data.assignedToId = args.assigneeId;
    if (args.tags) data.tags = args.tags;

    const task = await context.prisma.task.create({ data });
    return { created: true, task };
  },
};

const updateTask: IsaacTool = {
  name: "updateTask",
  description: "Update an existing task's fields (title, description, status, priority, etc.).",
  inputSchema: z.object({
    taskId: z.string().describe("The task ID to update"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    status: z
      .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "PAUSED", "CANCELLED"])
      .optional()
      .describe("New status"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("New priority"),
    dueDate: z.string().optional().describe("New due date in ISO format"),
    assigneeId: z.string().optional().describe("New assignee worker ID"),
  }),
  execute: async (args, context) => {
    const existing = await context.prisma.task.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });

    if (!existing) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    const data: any = {};
    if (args.title !== undefined) data.title = args.title;
    if (args.description !== undefined) data.description = args.description;
    if (args.status !== undefined) data.status = args.status;
    if (args.priority !== undefined) data.priority = args.priority;
    if (args.dueDate !== undefined) data.dueDate = new Date(args.dueDate);
    if (args.assigneeId !== undefined) data.assignedToId = args.assigneeId;

    const task = await context.prisma.task.update({
      where: { id: args.taskId },
      data,
    });

    return { updated: true, task };
  },
};

const deleteTask: IsaacTool = {
  name: "deleteTask",
  description: "Permanently delete a task.",
  inputSchema: z.object({
    taskId: z.string().describe("The task ID to delete"),
  }),
  execute: async (args, context) => {
    const existing = await context.prisma.task.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });

    if (!existing) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    await context.prisma.task.delete({ where: { id: args.taskId } });
    return { deleted: true, taskId: args.taskId };
  },
};

const pauseTask: IsaacTool = {
  name: "pauseTask",
  description: "Pause an active or pending task.",
  inputSchema: z.object({
    taskId: z.string().describe("The task ID to pause"),
    reason: z.string().optional().describe("Reason for pausing"),
  }),
  execute: async (args, context) => {
    const existing = await context.prisma.task.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });

    if (!existing) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new Error(`Cannot pause a task with status: ${existing.status}`);
    }

    const task = await context.prisma.task.update({
      where: { id: args.taskId },
      data: { status: "PAUSED" },
    });

    return { paused: true, task, reason: args.reason };
  },
};

const resumeTask: IsaacTool = {
  name: "resumeTask",
  description: "Resume a paused task.",
  inputSchema: z.object({
    taskId: z.string().describe("The task ID to resume"),
  }),
  execute: async (args, context) => {
    const existing = await context.prisma.task.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });

    if (!existing) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    if (existing.status !== "PAUSED") {
      throw new Error(`Task is not paused (current status: ${existing.status})`);
    }

    const task = await context.prisma.task.update({
      where: { id: args.taskId },
      data: { status: "IN_PROGRESS" },
    });

    return { resumed: true, task };
  },
};

// ============================================
// Worker Tools
// ============================================

const listWorkers: IsaacTool = {
  name: "listWorkers",
  description: "List all workers/team members associated with the current user.",
  inputSchema: z.object({
    includeStats: z.boolean().optional().describe("Include task completion stats per worker"),
  }),
  execute: async (args, context) => {
    const workers = await context.prisma.worker.findMany({
      where: { userId: context.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (args.includeStats) {
      const enriched = await Promise.all(
        workers.map(async (worker: any) => {
          const [total, completed, inProgress] = await Promise.all([
            context.prisma.task.count({
              where: { assignedToId: worker.id, userId: context.userId },
            }),
            context.prisma.task.count({
              where: {
                assignedToId: worker.id,
                userId: context.userId,
                status: "COMPLETED",
              },
            }),
            context.prisma.task.count({
              where: {
                assignedToId: worker.id,
                userId: context.userId,
                status: "IN_PROGRESS",
              },
            }),
          ]);

          return { ...worker, stats: { total, completed, inProgress } };
        })
      );
      return { workers: enriched };
    }

    return { workers };
  },
};

const addWorker: IsaacTool = {
  name: "addWorker",
  description: "Add a new worker/team member.",
  inputSchema: z.object({
    name: z.string().describe("Worker's full name"),
    email: z.string().describe("Worker's email address"),
    role: z.string().optional().describe("Worker's role/title"),
  }),
  execute: async (args, context) => {
    const worker = await context.prisma.worker.create({
      data: {
        name: args.name,
        email: args.email,
        role: args.role,
        userId: context.userId,
        status: "ACTIVE",
      },
    });

    return { created: true, worker };
  },
};

const removeWorker: IsaacTool = {
  name: "removeWorker",
  description: "Remove a worker from the team.",
  inputSchema: z.object({
    workerId: z.string().describe("The worker ID to remove"),
  }),
  execute: async (args, context) => {
    const existing = await context.prisma.worker.findFirst({
      where: { id: args.workerId, userId: context.userId },
    });

    if (!existing) {
      throw new Error(`Worker not found: ${args.workerId}`);
    }

    await context.prisma.worker.delete({ where: { id: args.workerId } });
    return { removed: true, workerId: args.workerId };
  },
};

// ============================================
// Submission Tools
// ============================================

const listSubmissions: IsaacTool = {
  name: "listSubmissions",
  description: "List task submissions with optional filters.",
  inputSchema: z.object({
    taskId: z.string().optional().describe("Filter by task ID"),
    status: z
      .enum(["PENDING", "APPROVED", "REJECTED", "REVISION_REQUESTED"])
      .optional()
      .describe("Filter by submission status"),
    limit: z.number().optional().describe("Maximum number of submissions (default 20)"),
  }),
  execute: async (args, context) => {
    const where: any = {};

    if (args.taskId) {
      where.taskId = args.taskId;
      const task = await context.prisma.task.findFirst({
        where: { id: args.taskId, userId: context.userId },
      });
      if (!task) throw new Error(`Task not found: ${args.taskId}`);
    } else {
      where.task = { userId: context.userId };
    }

    if (args.status) where.status = args.status;

    const submissions = await context.prisma.submission.findMany({
      where,
      take: args.limit || 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        taskId: true,
        submittedBy: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return { submissions, count: submissions.length };
  },
};

// ============================================
// Report Tools
// ============================================

const generateReport: IsaacTool = {
  name: "generateReport",
  description:
    "Generate a performance or analytics report. Returns structured data about task " +
    "completion rates, worker performance, and operational metrics.",
  inputSchema: z.object({
    type: z
      .enum(["summary", "performance", "overdue", "worker-stats"])
      .describe(
        "Report type: summary (overall overview), performance (completion metrics), " +
          "overdue (overdue task analysis), worker-stats (per-worker breakdown)"
      ),
    dateFrom: z.string().optional().describe("Start date for report period (ISO format)"),
    dateTo: z.string().optional().describe("End date for report period (ISO format)"),
    workerId: z.string().optional().describe("Filter report to a specific worker"),
  }),
  execute: async (args, context) => {
    const dateFilter: any = {};
    if (args.dateFrom) dateFilter.gte = new Date(args.dateFrom);
    if (args.dateTo) dateFilter.lte = new Date(args.dateTo);

    const basWhere: any = { userId: context.userId };
    if (Object.keys(dateFilter).length > 0) basWhere.createdAt = dateFilter;
    if (args.workerId) basWhere.assignedToId = args.workerId;

    const [total, completed, inProgress, overdue, failed] = await Promise.all([
      context.prisma.task.count({ where: basWhere }),
      context.prisma.task.count({ where: { ...basWhere, status: "COMPLETED" } }),
      context.prisma.task.count({ where: { ...basWhere, status: "IN_PROGRESS" } }),
      context.prisma.task.count({
        where: {
          ...basWhere,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { lt: new Date() },
        },
      }),
      context.prisma.task.count({ where: { ...basWhere, status: "FAILED" } }),
    ]);

    const report: any = {
      type: args.type,
      period: {
        from: args.dateFrom || "all time",
        to: args.dateTo || "now",
      },
      metrics: {
        total,
        completed,
        inProgress,
        overdue,
        failed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };

    if (args.type === "overdue") {
      report.overdueTasks = await context.prisma.task.findMany({
        where: {
          ...basWhere,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { lt: new Date() },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          assignedTo: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
      });
    }

    if (args.type === "worker-stats") {
      const workers = await context.prisma.worker.findMany({
        where: { userId: context.userId },
        select: { id: true, name: true },
      });

      report.workerStats = await Promise.all(
        workers.map(async (w: any) => {
          const workerWhere = { ...basWhere, assignedToId: w.id };
          const [wTotal, wCompleted] = await Promise.all([
            context.prisma.task.count({ where: workerWhere }),
            context.prisma.task.count({ where: { ...workerWhere, status: "COMPLETED" } }),
          ]);
          return {
            worker: w,
            tasks: wTotal,
            completed: wCompleted,
            completionRate: wTotal > 0 ? Math.round((wCompleted / wTotal) * 100) : 0,
          };
        })
      );
    }

    return report;
  },
};

// ============================================
// Skill Tools
// ============================================

const listSkills: IsaacTool = {
  name: "listSkills",
  description: "List all user skills/knowledge bases.",
  inputSchema: z.object({}),
  execute: async (_args, context) => {
    const skills = await context.prisma.userSkill.findMany({
      where: { userId: context.userId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { skills, count: skills.length };
  },
};

const createSkill: IsaacTool = {
  name: "createSkill",
  description: "Create a new skill/knowledge base entry.",
  inputSchema: z.object({
    name: z.string().describe("Skill name"),
    description: z.string().optional().describe("Brief description of the skill"),
    content: z.string().describe("Full skill content (markdown supported)"),
  }),
  execute: async (args, context) => {
    const skill = await context.prisma.userSkill.create({
      data: {
        name: args.name,
        description: args.description || "",
        content: args.content,
        userId: context.userId,
      },
    });

    return { created: true, skill };
  },
};

const updateSkill: IsaacTool = {
  name: "updateSkill",
  description: "Update an existing skill's content or metadata.",
  inputSchema: z.object({
    skillId: z.string().describe("The skill ID to update"),
    name: z.string().optional().describe("New skill name"),
    description: z.string().optional().describe("New description"),
    content: z.string().optional().describe("New content"),
  }),
  execute: async (args, context) => {
    const existing = await context.prisma.userSkill.findFirst({
      where: { id: args.skillId, userId: context.userId },
    });

    if (!existing) {
      throw new Error(`Skill not found: ${args.skillId}`);
    }

    const data: any = {};
    if (args.name !== undefined) data.name = args.name;
    if (args.description !== undefined) data.description = args.description;
    if (args.content !== undefined) data.content = args.content;

    const skill = await context.prisma.userSkill.update({
      where: { id: args.skillId },
      data,
    });

    return { updated: true, skill };
  },
};

const deleteSkill: IsaacTool = {
  name: "deleteSkill",
  description: "Delete a skill/knowledge base entry.",
  inputSchema: z.object({
    skillId: z.string().describe("The skill ID to delete"),
  }),
  execute: async (args, context) => {
    const existing = await context.prisma.userSkill.findFirst({
      where: { id: args.skillId, userId: context.userId },
    });

    if (!existing) {
      throw new Error(`Skill not found: ${args.skillId}`);
    }

    await context.prisma.userSkill.delete({ where: { id: args.skillId } });
    return { deleted: true, skillId: args.skillId };
  },
};

// ============================================
// Automated Task Tools
// ============================================

const listAutomatedTasks: IsaacTool = {
  name: "listAutomatedTasks",
  description: "List all automated tasks for the current user, with their latest run status.",
  inputSchema: z.object({
    status: z.enum(["ACTIVE", "PAUSED", "DRAFT"]).optional().describe("Filter by task status"),
  }),
  execute: async (args, context) => {
    const where: any = { userId: context.userId };
    if (args.status) where.status = args.status;

    const tasks = await (context.prisma as any).automatedTask.findMany({
      where,
      include: {
        runs: { orderBy: { startedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    return { tasks, count: tasks.length };
  },
};

const runAutomatedTask: IsaacTool = {
  name: "runAutomatedTask",
  description:
    "Trigger an automated task to run immediately. The task uses Composio-connected apps " +
    "to perform its action (e.g. check email, fetch GitHub activity) and returns a report.",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the automated task to run"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).automatedTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });
    if (!task) throw new Error(`Automated task not found: ${args.taskId}`);

    const run = await (context.prisma as any).automatedTaskRun.create({
      data: {
        automatedTaskId: task.id,
        triggeredBy: "CHAT",
        status: "PENDING",
      },
    });

    return {
      runId: run.id,
      taskName: task.name,
      status: "PENDING",
      message: `Task "${task.name}" has been queued for execution. It will run using: ${
        Array.isArray(task.composioApps) ? task.composioApps.join(", ") : "connected apps"
      }.`,
    };
  },
};

// ============================================
// Operational Tools (HumanTask / Compliance layer)
// ============================================

const listHumanTasks: IsaacTool = {
  name: "listHumanTasks",
  description:
    "List all human (worker) tasks you manage. Returns name, status, worker count, " +
    "flagged worker count, timezone, and recurrence details. Use this to get task IDs " +
    "needed for other human-task operations.",
  inputSchema: z.object({
    status: z
      .enum(["ACTIVE", "PAUSED", "DRAFT", "ARCHIVED"])
      .optional()
      .describe("Filter by task status"),
    limit: z.number().optional().describe("Max tasks to return (default 50)"),
  }),
  execute: async (args, context) => {
    const where: any = { userId: context.userId };
    if (args.status) where.status = args.status;

    const tasks = await (context.prisma as any).humanTask.findMany({
      where,
      take: args.limit || 50,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { workers: true } },
        workers: { select: { activeFlagCount: true }, where: { status: "ACTIVE" } },
      },
    });

    return {
      tasks: tasks.map((t: any) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        timezone: t.timezone,
        recurrenceType: t.recurrenceType,
        workerCount: t._count?.workers ?? 0,
        flaggedWorkerCount: (t.workers ?? []).filter((w: any) => (w.activeFlagCount ?? 0) > 0)
          .length,
      })),
    };
  },
};

const getHumanTask: IsaacTool = {
  name: "getHumanTask",
  description:
    "Get full details of a specific human task including active workers, today's submission " +
    "status, and open flag counts.",
  inputSchema: z.object({
    taskId: z.string().describe("The human task ID"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
      include: {
        workers: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            status: true,
            riskLevel: true,
            activeFlagCount: true,
            totalFlagCount: true,
          },
        },
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            dueAt: true,
            aiScore: true,
            worker: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!task) throw new Error(`Human task not found: ${args.taskId}`);
    return task;
  },
};

const getLatestReport: IsaacTool = {
  name: "getLatestReport",
  description:
    "Retrieve the most recent compliance report for a human task. Returns the full report " +
    "including the written summary, KPIs (submissions, missed, avg score, pass rate), " +
    "and a flagged workers summary sentence if any workers were flagged. " +
    "Use this when the user asks for today's report, recent report, or performance summary.",
  inputSchema: z.object({
    taskId: z.string().describe("The human task ID to get the report for"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
      select: { id: true, name: true },
    });
    if (!task) throw new Error(`Human task not found: ${args.taskId}`);

    const report = await (context.prisma as any).taskComplianceReport.findFirst({
      where: { humanTaskId: args.taskId },
      orderBy: { createdAt: "desc" },
    });

    if (!report) {
      return { message: `No compliance report has been generated for "${task.name}" yet.` };
    }

    const flaggedSummary =
      report.flaggedWorkersSnapshot && typeof report.flaggedWorkersSnapshot === "object"
        ? ((report.flaggedWorkersSnapshot as any).summary ?? null)
        : null;

    return {
      reportId: report.id,
      taskName: task.name,
      period: {
        start: report.periodStart,
        end: report.periodEnd,
      },
      kpis: {
        totalSubmissions: report.totalSubmissions,
        missed: report.missedCount,
        avgScore: report.avgScore,
        passRate: report.passRate,
      },
      summary: report.summaryMarkdown,
      flaggedWorkersSummary: flaggedSummary,
      documentUrl: report.documentUrl ?? null,
      deliveredAt: report.deliveredAt ?? null,
      generatedAt: report.createdAt,
    };
  },
};

const listFlaggedWorkers: IsaacTool = {
  name: "listFlaggedWorkers",
  description:
    "List workers who have been flagged across all your human tasks, or for a specific task. " +
    "Returns flag reason, severity, risk level, and current status. " +
    "Use when asked about worker compliance issues, risk, or performance problems.",
  inputSchema: z.object({
    taskId: z.string().optional().describe("Limit to a specific task. Omit for all tasks."),
    status: z
      .enum(["OPEN", "RESOLVED", "DISMISSED"])
      .optional()
      .describe("Filter by flag status (default: OPEN)"),
    limit: z.number().optional().describe("Max flags to return (default 20)"),
  }),
  execute: async (args, context) => {
    const where: any = {
      userId: context.userId,
      status: args.status ?? "OPEN",
    };
    if (args.taskId) where.humanTaskId = args.taskId;

    const flags = await (context.prisma as any).workerFlagEvent.findMany({
      where,
      take: args.limit ?? 20,
      orderBy: { triggeredAt: "desc" },
      include: {
        worker: { select: { id: true, name: true, riskLevel: true, activeFlagCount: true } },
        humanTask: { select: { id: true, name: true } },
      },
    });

    return {
      count: flags.length,
      flags: flags.map((f: any) => ({
        flagId: f.id,
        worker: f.worker?.name,
        workerId: f.worker?.id,
        task: f.humanTask?.name,
        taskId: f.humanTask?.id,
        reason: f.reasonLabel,
        severity: f.severity,
        status: f.status,
        riskLevel: f.worker?.riskLevel,
        openFlagCount: f.worker?.activeFlagCount,
        details: f.details,
        triggeredAt: f.triggeredAt,
      })),
    };
  },
};

const resolveWorkerFlag: IsaacTool = {
  name: "resolveWorkerFlag",
  description:
    "Mark a worker flag as resolved. Use when a compliance issue has been addressed. " +
    "Requires the taskId and flagId, which you can get from listFlaggedWorkers.",
  inputSchema: z.object({
    taskId: z.string().describe("The human task ID the flag belongs to"),
    flagId: z.string().describe("The flag ID to resolve"),
    note: z.string().optional().describe("Optional resolution note"),
  }),
  execute: async (args, context) => {
    const flag = await (context.prisma as any).workerFlagEvent.findFirst({
      where: { id: args.flagId, humanTaskId: args.taskId, userId: context.userId },
    });
    if (!flag) throw new Error(`Flag not found: ${args.flagId}`);
    if (flag.status !== "OPEN") throw new Error(`Flag is already ${flag.status}`);

    const updated = await (context.prisma as any).workerFlagEvent.update({
      where: { id: args.flagId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: context.userId,
        resolutionReason: "RESOLVED",
        resolutionNote: args.note ?? "Resolved via Isaac chat",
      },
    });

    await (context.prisma as any).humanWorker.updateMany({
      where: { id: flag.workerId },
      data: {
        activeFlagCount: { decrement: 1 },
      },
    });

    return {
      resolved: true,
      flagId: updated.id,
      workerId: flag.workerId,
      note: args.note ?? null,
    };
  },
};

const dismissWorkerFlag: IsaacTool = {
  name: "dismissWorkerFlag",
  description:
    "Dismiss a worker flag (mark it as not actionable). Use when the flag is not a real concern. " +
    "Requires the taskId and flagId, which you can get from listFlaggedWorkers.",
  inputSchema: z.object({
    taskId: z.string().describe("The human task ID the flag belongs to"),
    flagId: z.string().describe("The flag ID to dismiss"),
    reason: z.string().optional().describe("Optional reason for dismissal"),
  }),
  execute: async (args, context) => {
    const flag = await (context.prisma as any).workerFlagEvent.findFirst({
      where: { id: args.flagId, humanTaskId: args.taskId, userId: context.userId },
    });
    if (!flag) throw new Error(`Flag not found: ${args.flagId}`);
    if (flag.status !== "OPEN") throw new Error(`Flag is already ${flag.status}`);

    const updated = await (context.prisma as any).workerFlagEvent.update({
      where: { id: args.flagId },
      data: {
        status: "DISMISSED",
        resolvedAt: new Date(),
        resolvedBy: context.userId,
        resolutionReason: "DISMISSED",
        resolutionNote: args.reason ?? "Dismissed via Isaac chat",
      },
    });

    await (context.prisma as any).humanWorker.updateMany({
      where: { id: flag.workerId },
      data: {
        activeFlagCount: { decrement: 1 },
      },
    });

    return {
      dismissed: true,
      flagId: updated.id,
      workerId: flag.workerId,
      reason: args.reason ?? null,
    };
  },
};

const triggerDailyReport: IsaacTool = {
  name: "triggerDailyReport",
  description:
    "Generate and deliver today's compliance report for a human task immediately, " +
    "without waiting for the scheduled report time. " +
    "Use when the user asks to generate, run, or send a report now.",
  inputSchema: z.object({
    taskId: z.string().describe("The human task ID to generate the report for"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
      select: { id: true, name: true },
    });
    if (!task) throw new Error(`Human task not found: ${args.taskId}`);

    if (!context.services?.reportService) {
      return {
        error: true,
        message:
          "Report generation service is not available in this context. " +
          "Use the dashboard to trigger the report manually.",
      };
    }

    const report = await context.services.reportService.generateDailyReport(
      args.taskId,
      context.userId
    );
    const delivered = await context.services.reportService.deliverAndRecord(
      report.id,
      args.taskId,
      context.userId
    );

    return {
      generated: true,
      reportId: delivered.id,
      taskName: task.name,
      kpis: {
        totalSubmissions: delivered.totalSubmissions,
        missed: delivered.missedCount,
        avgScore: delivered.avgScore,
        passRate: delivered.passRate,
      },
      delivered: !!delivered.deliveredAt,
      documentUrl: delivered.documentUrl ?? null,
    };
  },
};

// ============================================
// Human Task CRUD tools
// ============================================

const createHumanTask: IsaacTool = {
  name: "createHumanTask",
  description:
    "Create a new human (worker) task. Isaac can infer sensible defaults from a natural-language " +
    "description. Use this when the user asks to create, add, or set up a new task for workers.",
  inputSchema: z.object({
    name: z.string().describe("Task name"),
    description: z.string().optional().describe("What workers do for this task"),
    evidenceType: z
      .enum(["PHOTO", "VIDEO", "TEXT", "DOCUMENT", "LOCATION", "AUDIO", "ANY"])
      .optional()
      .describe("Type of evidence workers submit"),
    recurrenceType: z
      .enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "CUSTOM"])
      .optional()
      .describe("How often submissions are due"),
    scheduledTimes: z
      .array(z.string())
      .optional()
      .describe("Submission times in HH:MM format (24h)"),
    timezone: z.string().optional().describe("IANA timezone, e.g. Africa/Lagos"),
    acceptanceRules: z.array(z.string()).optional().describe("Rules Isaac uses to vet submissions"),
    scoringEnabled: z.boolean().optional().describe("Whether to score submissions 0-100"),
    passingScore: z.number().optional().describe("Minimum passing score (0-100)"),
    graceMinutes: z.number().optional().describe("Grace period in minutes after scheduled time"),
    resubmissionAllowed: z.boolean().optional().describe("Whether workers can resubmit"),
    reportTime: z.string().optional().describe("Time to generate daily report, HH:MM"),
    taskChannelId: z.string().optional().describe("Channel ID to assign for worker messaging"),
  }),
  execute: async (args, context) => {
    const data: any = {
      userId: context.userId,
      name: args.name,
      status: "ACTIVE",
    };
    if (args.description !== undefined) data.description = args.description;
    if (args.evidenceType !== undefined) data.evidenceType = args.evidenceType;
    if (args.recurrenceType !== undefined) data.recurrenceType = args.recurrenceType;
    if (args.scheduledTimes !== undefined) data.scheduledTimes = args.scheduledTimes;
    if (args.timezone !== undefined) data.timezone = args.timezone;
    if (args.acceptanceRules !== undefined) data.acceptanceRules = args.acceptanceRules;
    if (args.scoringEnabled !== undefined) data.scoringEnabled = args.scoringEnabled;
    if (args.passingScore !== undefined) data.passingScore = args.passingScore;
    if (args.graceMinutes !== undefined) data.graceMinutes = args.graceMinutes;
    if (args.resubmissionAllowed !== undefined) data.resubmissionAllowed = args.resubmissionAllowed;
    if (args.reportTime !== undefined) data.reportTime = args.reportTime;
    if (args.taskChannelId !== undefined) data.taskChannelId = args.taskChannelId;

    const task = await (context.prisma as any).humanTask.create({ data });
    return { created: true, task };
  },
};

const updateHumanTask: IsaacTool = {
  name: "updateHumanTask",
  description:
    "Update fields on an existing human task (name, description, schedule, acceptance rules, etc.). " +
    "Use listHumanTasks first to get the taskId if you don't have it.",
  inputSchema: z.object({
    taskId: z.string().describe("Human task ID to update"),
    name: z.string().optional(),
    description: z.string().optional(),
    evidenceType: z
      .enum(["PHOTO", "VIDEO", "TEXT", "DOCUMENT", "LOCATION", "AUDIO", "ANY"])
      .optional(),
    recurrenceType: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]).optional(),
    scheduledTimes: z.array(z.string()).optional(),
    timezone: z.string().optional(),
    acceptanceRules: z.array(z.string()).optional(),
    scoringEnabled: z.boolean().optional(),
    passingScore: z.number().optional(),
    graceMinutes: z.number().optional(),
    resubmissionAllowed: z.boolean().optional(),
    reportTime: z.string().optional(),
    taskChannelId: z.string().optional(),
    status: z.enum(["ACTIVE", "PAUSED", "DRAFT", "ARCHIVED"]).optional(),
  }),
  execute: async (args, context) => {
    const existing = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });
    if (!existing) throw new Error(`Human task not found: ${args.taskId}`);

    const { taskId, ...fields } = args;
    const data: any = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) data[k] = v;
    }

    const task = await (context.prisma as any).humanTask.update({
      where: { id: taskId },
      data,
    });
    return { updated: true, task };
  },
};

const pauseHumanTask: IsaacTool = {
  name: "pauseHumanTask",
  description:
    "Pause an active human task. Workers assigned to it will be notified via their channel. " +
    "Use listHumanTasks to get the taskId.",
  inputSchema: z.object({
    taskId: z.string().describe("Human task ID to pause"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });
    if (!task) throw new Error(`Human task not found: ${args.taskId}`);
    if (task.status === "PAUSED") return { alreadyPaused: true, task };

    const updated = await (context.prisma as any).humanTask.update({
      where: { id: args.taskId },
      data: { status: "PAUSED" },
    });
    return { paused: true, task: updated };
  },
};

const resumeHumanTask: IsaacTool = {
  name: "resumeHumanTask",
  description:
    "Resume a paused human task. Workers assigned to it will be notified via their channel. " +
    "Use listHumanTasks to get the taskId.",
  inputSchema: z.object({
    taskId: z.string().describe("Human task ID to resume"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });
    if (!task) throw new Error(`Human task not found: ${args.taskId}`);
    if (task.status === "ACTIVE") return { alreadyActive: true, task };

    const updated = await (context.prisma as any).humanTask.update({
      where: { id: args.taskId },
      data: { status: "ACTIVE" },
    });
    return { resumed: true, task: updated };
  },
};

const deleteHumanTask: IsaacTool = {
  name: "deleteHumanTask",
  description:
    "Permanently delete a human task and all associated workers, submissions, and reports. " +
    "Confirm with the user before calling this.",
  inputSchema: z.object({
    taskId: z.string().describe("Human task ID to delete"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });
    if (!task) throw new Error(`Human task not found: ${args.taskId}`);

    await (context.prisma as any).humanTask.delete({ where: { id: args.taskId } });
    return { deleted: true, taskId: args.taskId, taskName: task.name };
  },
};

// ============================================
// Human Worker management tools
// ============================================

const addHumanWorker: IsaacTool = {
  name: "addHumanWorker",
  description:
    "Add a worker to a human task. Returns the new worker record including their ID " +
    "which they use to identify themselves when submitting via the task channel.",
  inputSchema: z.object({
    taskId: z.string().describe("Human task ID to add the worker to"),
    name: z.string().describe("Worker full name"),
    phone: z
      .string()
      .optional()
      .describe("Worker phone number (used for WhatsApp channel identification)"),
    email: z.string().optional().describe("Worker email address"),
    role: z.string().optional().describe("Worker role or position"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });
    if (!task) throw new Error(`Human task not found: ${args.taskId}`);

    const data: any = {
      humanTaskId: args.taskId,
      name: args.name,
      status: "ACTIVE",
      riskLevel: "LOW",
      activeFlagCount: 0,
      totalFlagCount: 0,
    };
    if (args.phone !== undefined) data.phone = args.phone;
    if (args.email !== undefined) data.email = args.email;
    if (args.role !== undefined) data.role = args.role;

    const worker = await (context.prisma as any).humanWorker.create({ data });
    return { created: true, worker };
  },
};

const removeHumanWorker: IsaacTool = {
  name: "removeHumanWorker",
  description:
    "Remove a worker from a human task. Use getHumanTask to see current workers and their IDs.",
  inputSchema: z.object({
    taskId: z.string().describe("Human task ID the worker belongs to"),
    workerId: z.string().describe("Worker ID to remove"),
  }),
  execute: async (args, context) => {
    const worker = await (context.prisma as any).humanWorker.findFirst({
      where: { id: args.workerId, humanTaskId: args.taskId, humanTask: { userId: context.userId } },
    });
    if (!worker) throw new Error(`Worker not found: ${args.workerId}`);

    await (context.prisma as any).humanWorker.update({
      where: { id: args.workerId },
      data: { status: "INACTIVE" },
    });
    return { removed: true, workerId: args.workerId, workerName: worker.name };
  },
};

// ============================================
// Liveboard / submission view tools
// ============================================

const getLiveboardSubmissions: IsaacTool = {
  name: "getLiveboardSubmissions",
  description:
    "Get today's submission status for a human task — who has submitted, who is pending, " +
    "scores, and evidence status. This is the live view of what's happening on the ground right now. " +
    "Use when asked about today's submissions, liveboard, or current task progress.",
  inputSchema: z.object({
    taskId: z.string().describe("Human task ID to check"),
    status: z
      .enum(["PENDING", "SUBMITTED", "COLLECTING", "VETTED", "APPROVED", "REJECTED", "MISSED"])
      .optional()
      .describe("Filter by submission status. Omit to see all."),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
      select: { id: true, name: true, timezone: true },
    });
    if (!task) throw new Error(`Human task not found: ${args.taskId}`);

    const tz = task.timezone || "UTC";
    const now = new Date();
    const todayStart = new Date(
      now.toLocaleDateString("en-CA", { timeZone: tz }) + "T00:00:00.000Z"
    );
    const todayEnd = new Date(todayStart.getTime() + 86400_000);

    const where: any = {
      humanTaskId: args.taskId,
      dueAt: { gte: todayStart, lt: todayEnd },
    };
    if (args.status) where.status = args.status;

    const submissions = await (context.prisma as any).taskSubmission.findMany({
      where,
      orderBy: { dueAt: "asc" },
      include: {
        worker: { select: { id: true, name: true, riskLevel: true } },
        items: { select: { label: true, status: true, aiScore: true } },
      },
    });

    const summary = {
      pending: submissions.filter((s: any) => s.status === "PENDING").length,
      submitted: submissions.filter((s: any) =>
        ["SUBMITTED", "COLLECTING", "VETTED", "APPROVED"].includes(s.status)
      ).length,
      missed: submissions.filter((s: any) => s.status === "MISSED").length,
      rejected: submissions.filter((s: any) => s.status === "REJECTED").length,
    };

    return {
      taskName: task.name,
      date: now.toLocaleDateString("en-CA", { timeZone: tz }),
      summary,
      submissions: submissions.map((s: any) => ({
        id: s.id,
        worker: s.worker?.name,
        status: s.status,
        dueAt: s.dueAt,
        aiScore: s.aiScore,
        items: s.items?.length > 0 ? s.items : undefined,
      })),
    };
  },
};

// ============================================
// Channel tools
// ============================================

const listChannels: IsaacTool = {
  name: "listChannels",
  description:
    "List all connected channels (WhatsApp, Telegram, Discord, Slack) that can be assigned to tasks. " +
    "Returns channel IDs, platforms, labels, and which task each channel is currently assigned to.",
  inputSchema: z.object({}),
  execute: async (_args, context) => {
    const channels = await (context.prisma as any).taskChannel.findMany({
      where: { userId: context.userId },
      include: {
        humanTask: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      count: channels.length,
      channels: channels.map((ch: any) => ({
        id: ch.id,
        platform: ch.platform,
        label: ch.label || ch.id,
        status: ch.status,
        assignedToTask: ch.humanTask ? { id: ch.humanTask.id, name: ch.humanTask.name } : null,
      })),
    };
  },
};

const assignChannelToTask: IsaacTool = {
  name: "assignChannelToTask",
  description:
    "Assign an existing channel to a human task so workers can submit evidence and receive " +
    "instructions through it. A channel can only be assigned to one task at a time. " +
    "Use listChannels to see available channel IDs.",
  inputSchema: z.object({
    taskId: z.string().describe("Human task ID to assign the channel to"),
    channelId: z.string().describe("Channel ID to assign"),
  }),
  execute: async (args, context) => {
    const task = await (context.prisma as any).humanTask.findFirst({
      where: { id: args.taskId, userId: context.userId },
    });
    if (!task) throw new Error(`Human task not found: ${args.taskId}`);

    const channel = await (context.prisma as any).taskChannel.findFirst({
      where: { id: args.channelId, userId: context.userId },
    });
    if (!channel) throw new Error(`Channel not found: ${args.channelId}`);

    const inUse = await (context.prisma as any).humanTask.findFirst({
      where: {
        taskChannelId: args.channelId,
        id: { not: args.taskId },
        userId: context.userId,
      },
      select: { id: true, name: true },
    });
    if (inUse) {
      throw new Error(
        `Channel is already assigned to task "${inUse.name}". ` +
          `Remove it from that task first or choose a different channel.`
      );
    }

    const updated = await (context.prisma as any).humanTask.update({
      where: { id: args.taskId },
      data: { taskChannelId: args.channelId },
    });
    return {
      assigned: true,
      taskId: updated.id,
      taskName: updated.name,
      channelId: args.channelId,
      platform: channel.platform,
    };
  },
};

// ============================================
// Connected apps (Composio) read tool
// ============================================

const listConnectedApps: IsaacTool = {
  name: "listConnectedApps",
  description:
    "List the external apps and services (Gmail, Slack, Notion, Google Docs, WhatsApp, etc.) " +
    "that are connected to Isaac via Composio. These are used for report delivery, automated tasks, " +
    "and channel integrations. Connecting new apps requires the web UI (OAuth flow).",
  inputSchema: z.object({}),
  execute: async (_args, context) => {
    const accounts = await (context.prisma as any).composioConnection
      .findMany({
        where: { userId: context.userId },
        select: {
          id: true,
          appSlug: true,
          status: true,
          createdAt: true,
        },
      })
      .catch(() => []);

    if (!accounts.length) {
      return {
        message:
          "No apps connected yet. Go to the Integrations section in the dashboard to connect Gmail, Slack, Google Docs, or other apps.",
        apps: [],
      };
    }

    return {
      count: accounts.length,
      apps: accounts.map((a: any) => ({
        id: a.id,
        app: a.appSlug,
        status: a.status,
        connectedAt: a.createdAt,
      })),
    };
  },
};

// ============================================
// Channel setup tools (Telegram / Discord / Slack via chat)
// ============================================

const setupTelegramChannel: IsaacTool = {
  name: "setupTelegramChannel",
  description:
    "Create and connect a Telegram bot channel so workers can submit evidence and receive " +
    "task instructions via Telegram. " +
    "The user must first create a Telegram bot via @BotFather (takes ~30 seconds on Telegram) " +
    "and provide the bot token. Isaac registers the webhook automatically. " +
    "Use this when a user wants to add a Telegram channel or says they have a bot token.",
  inputSchema: z.object({
    label: z.string().describe("A friendly name for this channel, e.g. 'Warehouse Team Bot'"),
    botToken: z
      .string()
      .describe("The Telegram bot token from @BotFather. Looks like: 1234567890:ABCdef..."),
    botUsername: z
      .string()
      .optional()
      .describe("The bot username without @, e.g. 'warehouse_isaac_bot'"),
  }),
  execute: async (args, context) => {
    if (!context.services?.channelsService) {
      return {
        error: true,
        message:
          "Channel setup service is unavailable in this context. Use the Channels page in the dashboard.",
      };
    }

    const channel = await context.services.channelsService.createChannel(context.userId, {
      label: args.label,
      platform: "TELEGRAM",
      telegramBotToken: args.botToken,
      ...(args.botUsername ? { telegramBotUsername: args.botUsername } : {}),
    });

    return {
      created: true,
      channelId: channel.id,
      label: channel.label,
      platform: channel.platform,
      status: channel.status,
      message:
        `Telegram channel "${channel.label}" is connected. ` +
        `You can now assign it to a task using assignChannelToTask.`,
    };
  },
};

const setupDiscordChannel: IsaacTool = {
  name: "setupDiscordChannel",
  description:
    "Create and connect a Discord bot channel. The user must first create a Discord bot at " +
    "discord.com/developers, add it to their server, and provide the bot token, guild ID, and channel ID. " +
    "Ask the user for those three values if missing.",
  inputSchema: z.object({
    label: z.string().describe("Friendly name for this channel"),
    botToken: z.string().describe("Discord bot token from the Developer Portal"),
    guildId: z.string().describe("Discord server (guild) ID"),
    channelId: z.string().describe("Discord channel ID to send messages in"),
  }),
  execute: async (args, context) => {
    if (!context.services?.channelsService) {
      return {
        error: true,
        message:
          "Channel setup service is unavailable in this context. Use the Channels page in the dashboard.",
      };
    }

    const channel = await context.services.channelsService.createChannel(context.userId, {
      label: args.label,
      platform: "DISCORD",
      discordBotToken: args.botToken,
      discordGuildId: args.guildId,
      discordChannelId: args.channelId,
    });

    return {
      created: true,
      channelId: channel.id,
      label: channel.label,
      platform: channel.platform,
      status: channel.status,
      message:
        `Discord channel "${channel.label}" is connected. ` +
        `Assign it to a task with assignChannelToTask.`,
    };
  },
};

const setupSlackChannel: IsaacTool = {
  name: "setupSlackChannel",
  description:
    "Create and connect a Slack bot channel. The user needs a Slack app bot token (xoxb-...) " +
    "and the Slack channel ID to post to. Ask for those values if missing.",
  inputSchema: z.object({
    label: z.string().describe("Friendly name for this channel"),
    botToken: z.string().describe("Slack bot OAuth token, starts with xoxb-"),
    slackChannelId: z.string().describe("Slack channel ID (not name), e.g. C0123456789"),
    signingSecret: z
      .string()
      .optional()
      .describe("Slack signing secret for verifying incoming events (optional but recommended)"),
    teamId: z.string().optional().describe("Slack workspace team ID"),
  }),
  execute: async (args, context) => {
    if (!context.services?.channelsService) {
      return {
        error: true,
        message:
          "Channel setup service is unavailable in this context. Use the Channels page in the dashboard.",
      };
    }

    const channel = await context.services.channelsService.createChannel(context.userId, {
      label: args.label,
      platform: "SLACK",
      slackBotToken: args.botToken,
      slackChannelId: args.slackChannelId,
      ...(args.signingSecret ? { slackSigningSecret: args.signingSecret } : {}),
      ...(args.teamId ? { slackTeamId: args.teamId } : {}),
    });

    return {
      created: true,
      channelId: channel.id,
      label: channel.label,
      platform: channel.platform,
      status: channel.status,
      message:
        `Slack channel "${channel.label}" is connected. ` +
        `Assign it to a task with assignChannelToTask.`,
    };
  },
};

// ============================================
// Composio OAuth initiation tool
// ============================================

const connectApp: IsaacTool = {
  name: "connectApp",
  description:
    "Initiate connecting an external app (Gmail, Slack, Notion, Google Docs, etc.) to Isaac. " +
    "Returns an authorization URL the user must open in their browser to complete the OAuth flow. " +
    "Use listConnectedApps first to see what is already connected. " +
    "Call this when a user says they want to connect, link, or authorize an app.",
  inputSchema: z.object({
    appSlug: z
      .string()
      .describe(
        "The app identifier in UPPERCASE, e.g. GMAIL, SLACK, GOOGLEDOCS, NOTION, WHATSAPP, TELEGRAM"
      ),
  }),
  execute: async (args, context) => {
    if (!context.services?.composioService) {
      return {
        error: true,
        message:
          "App connection service is unavailable in this context. " +
          "Use the Connected Apps page in the dashboard to connect apps.",
      };
    }

    try {
      const { redirectUrl, connectionId } =
        await context.services.composioService.initiateAppConnection(context.userId, args.appSlug);

      if (!redirectUrl) {
        return {
          connected: true,
          connectionId,
          message: `${args.appSlug} does not require browser authorization and has been connected.`,
        };
      }

      return {
        authRequired: true,
        connectionId,
        authUrl: redirectUrl,
        message:
          `To connect ${args.appSlug}, open this link in your browser and authorize access:\n\n` +
          `${redirectUrl}\n\n` +
          `Once you approve, Isaac will have access to ${args.appSlug} for report delivery and automated tasks.`,
      };
    } catch (err: any) {
      return {
        error: true,
        message: err.message || `Failed to initiate connection for ${args.appSlug}.`,
      };
    }
  },
};

const setupWhatsAppChannel: IsaacTool = {
  name: "setupWhatsAppChannel",
  description:
    "Create a WhatsApp channel and generate a QR code for the user to scan. " +
    "The QR code is displayed inline in the chat — the user scans it with the WhatsApp app " +
    "on their phone within 60 seconds to link the device. " +
    "Use this when the user wants to connect WhatsApp or says they want a WhatsApp channel.",
  inputSchema: z.object({
    label: z.string().describe("A friendly name for this channel, e.g. 'Warehouse WhatsApp'"),
  }),
  execute: async (args, context) => {
    if (!context.services?.whatsappService) {
      return {
        error: true,
        message:
          "WhatsApp service is unavailable in this context. " +
          "Use the Channels page in the dashboard to connect WhatsApp.",
      };
    }

    // Create the DB channel record first so we have an ID for the session.
    const channel = await (context.prisma as any).taskChannel.create({
      data: {
        userId: context.userId,
        label: args.label,
        platform: "WHATSAPP",
        status: "pending",
      },
    });

    // Subscribe to QR events before starting the session so we don't miss the first one.
    const qrDataUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("QR code timed out. Call this again to get a fresh code.")),
        45_000
      );

      const sub = context.services!.whatsappService!.getQrObservable(channel.id).subscribe({
        next: (event: any) => {
          if (event.type === "qr" && event.data) {
            clearTimeout(timeout);
            sub.unsubscribe();
            resolve(event.data as string);
          } else if (event.type === "connected") {
            clearTimeout(timeout);
            sub.unsubscribe();
            reject(new Error("already_connected"));
          } else if (event.type === "error") {
            clearTimeout(timeout);
            sub.unsubscribe();
            reject(new Error(event.message || "WhatsApp connection error"));
          }
        },
        error: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      context.services!.whatsappService!.startSession(channel.id).catch((err: Error) => {
        clearTimeout(timeout);
        sub.unsubscribe();
        reject(err);
      });
    }).catch((err: Error) => {
      if (err.message === "already_connected") return "__connected__";
      throw err;
    });

    if (qrDataUrl === "__connected__") {
      return {
        connected: true,
        channelId: channel.id,
        message: `WhatsApp channel "${args.label}" is already connected. Assign it to a task with assignChannelToTask.`,
      };
    }

    return {
      channelId: channel.id,
      label: channel.label,
      qrImage: qrDataUrl,
      message:
        `Scan the QR code below with WhatsApp on your phone within 60 seconds.\n\n` +
        `**How to scan:** Open WhatsApp → tap the three-dot menu (or Settings on iPhone) → Linked Devices → Link a Device → point your camera at the code.\n\n` +
        `![WhatsApp QR Code](${qrDataUrl})\n\n` +
        `Once scanned, the channel "${args.label}" will be connected and you can assign it to a task.`,
    };
  },
};

// ============================================
// Export all tools
// ============================================

export const isaacTools: IsaacTool[] = [
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  pauseTask,
  resumeTask,
  listWorkers,
  addWorker,
  removeWorker,
  listSubmissions,
  generateReport,
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  listAutomatedTasks,
  runAutomatedTask,
  // Operational (human-task / compliance layer)
  listHumanTasks,
  getHumanTask,
  getLatestReport,
  listFlaggedWorkers,
  resolveWorkerFlag,
  dismissWorkerFlag,
  triggerDailyReport,
  // Human task CRUD
  createHumanTask,
  updateHumanTask,
  pauseHumanTask,
  resumeHumanTask,
  deleteHumanTask,
  // Human worker management
  addHumanWorker,
  removeHumanWorker,
  // Liveboard
  getLiveboardSubmissions,
  // Channels
  listChannels,
  assignChannelToTask,
  setupTelegramChannel,
  setupDiscordChannel,
  setupSlackChannel,
  setupWhatsAppChannel,
  // Connected apps
  listConnectedApps,
  connectApp,
];
