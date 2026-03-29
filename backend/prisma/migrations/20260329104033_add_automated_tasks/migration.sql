-- CreateTable
CREATE TABLE "automated_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "composioApps" JSONB NOT NULL DEFAULT '[]',
    "scheduledTimes" JSONB NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "deliveryConfig" JSONB,
    "status" "TaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automated_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automated_task_runs" (
    "id" TEXT NOT NULL,
    "automatedTaskId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "result" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "automated_task_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automated_tasks_userId_idx" ON "automated_tasks"("userId");

-- CreateIndex
CREATE INDEX "automated_tasks_status_idx" ON "automated_tasks"("status");

-- CreateIndex
CREATE INDEX "automated_task_runs_automatedTaskId_idx" ON "automated_task_runs"("automatedTaskId");

-- CreateIndex
CREATE INDEX "automated_task_runs_status_idx" ON "automated_task_runs"("status");

-- AddForeignKey
ALTER TABLE "automated_tasks" ADD CONSTRAINT "automated_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automated_task_runs" ADD CONSTRAINT "automated_task_runs_automatedTaskId_fkey" FOREIGN KEY ("automatedTaskId") REFERENCES "automated_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
