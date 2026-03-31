-- CreateEnum
CREATE TYPE "WorkerFlagReasonType" AS ENUM ('MISSED_DEADLINE', 'LOW_SCORE', 'REPEATED_MISSED_DEADLINE', 'REPEATED_LOW_SCORE', 'REPEATED_REJECTION', 'QUALITY_FAILURE', 'NO_SUBMISSION');

-- CreateEnum
CREATE TYPE "WorkerFlagSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WorkerFlagStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "WorkerRiskLevel" AS ENUM ('HEALTHY', 'WATCHLIST', 'AT_RISK', 'CRITICAL');

-- AlterTable
ALTER TABLE "human_workers" ADD COLUMN     "activeFlagCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFlagReason" TEXT,
ADD COLUMN     "lastFlaggedAt" TIMESTAMP(3),
ADD COLUMN     "riskLevel" "WorkerRiskLevel" NOT NULL DEFAULT 'HEALTHY',
ADD COLUMN     "totalFlagCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "task_compliance_reports" ADD COLUMN     "flaggedWorkersSnapshot" JSONB;

-- CreateTable
CREATE TABLE "worker_flag_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "humanTaskId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "submissionId" TEXT,
    "reportId" TEXT,
    "dedupeKey" TEXT,
    "reasonType" "WorkerFlagReasonType" NOT NULL,
    "reasonLabel" TEXT NOT NULL,
    "details" TEXT,
    "severity" "WorkerFlagSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "WorkerFlagStatus" NOT NULL DEFAULT 'OPEN',
    "metadata" JSONB,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionReason" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_flag_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worker_flag_events_dedupeKey_key" ON "worker_flag_events"("dedupeKey");

-- CreateIndex
CREATE INDEX "worker_flag_events_humanTaskId_triggeredAt_idx" ON "worker_flag_events"("humanTaskId", "triggeredAt");

-- CreateIndex
CREATE INDEX "worker_flag_events_workerId_status_idx" ON "worker_flag_events"("workerId", "status");

-- CreateIndex
CREATE INDEX "worker_flag_events_submissionId_idx" ON "worker_flag_events"("submissionId");

-- CreateIndex
CREATE INDEX "worker_flag_events_reportId_idx" ON "worker_flag_events"("reportId");

-- CreateIndex
CREATE INDEX "worker_flag_events_userId_status_idx" ON "worker_flag_events"("userId", "status");

-- AddForeignKey
ALTER TABLE "worker_flag_events" ADD CONSTRAINT "worker_flag_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_flag_events" ADD CONSTRAINT "worker_flag_events_humanTaskId_fkey" FOREIGN KEY ("humanTaskId") REFERENCES "human_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_flag_events" ADD CONSTRAINT "worker_flag_events_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "human_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_flag_events" ADD CONSTRAINT "worker_flag_events_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "task_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_flag_events" ADD CONSTRAINT "worker_flag_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "task_compliance_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
