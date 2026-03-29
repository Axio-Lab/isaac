import { z } from "zod";

export interface ToolContext {
  userId: string;
  prisma: any;
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
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .optional()
      .describe("New priority"),
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
    includeStats: z
      .boolean()
      .optional()
      .describe("Include task completion stats per worker"),
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
        }),
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
        "overdue (overdue task analysis), worker-stats (per-worker breakdown)",
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
        }),
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
];
