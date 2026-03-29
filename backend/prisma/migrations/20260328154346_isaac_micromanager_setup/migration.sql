-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskRecurrence" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskEvidenceType" AS ENUM ('PHOTO', 'VIDEO', 'TEXT', 'DOCUMENT', 'LOCATION', 'AUDIO', 'ANY');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VETTED', 'APPROVED', 'REJECTED', 'MISSED', 'RESUBMITTED');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "ChatPlatform" AS ENUM ('WHATSAPP', 'TELEGRAM', 'SLACK', 'DISCORD', 'WEB', 'WEBHOOK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "evidenceType" "TaskEvidenceType" NOT NULL DEFAULT 'PHOTO',
    "recurrenceType" "TaskRecurrence" NOT NULL DEFAULT 'DAILY',
    "recurrenceInterval" INTEGER,
    "scheduledTimes" JSONB NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "acceptanceRules" JSONB NOT NULL DEFAULT '[]',
    "sampleEvidenceUrl" TEXT,
    "scoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "resubmissionAllowed" BOOLEAN NOT NULL DEFAULT true,
    "reportTime" TEXT NOT NULL DEFAULT '18:00',
    "reportChannelId" TEXT,
    "deliveryConfig" JSONB,
    "reportFolderId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taskChannelId" TEXT,

    CONSTRAINT "human_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_channels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Task Channel',
    "platform" "ChatPlatform" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "telegramBotToken" TEXT,
    "telegramBotUsername" TEXT,
    "slackBotToken" TEXT,
    "slackSigningSecret" TEXT,
    "slackTeamId" TEXT,
    "slackChannelId" TEXT,
    "discordBotToken" TEXT,
    "discordGuildId" TEXT,
    "discordChannelId" TEXT,
    "webhookUrl" TEXT,
    "sharedSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_workers" (
    "id" TEXT NOT NULL,
    "humanTaskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "platform" "ChatPlatform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "taskChannelId" TEXT,
    "role" TEXT,
    "status" "WorkerStatus" NOT NULL DEFAULT 'ONBOARDING',
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "human_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" TEXT NOT NULL,
    "humanTaskId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "latenessSeconds" INTEGER,
    "imageUrl" TEXT,
    "rawMessage" TEXT,
    "aiScore" INTEGER,
    "aiFindings" TEXT,
    "aiFeedback" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "vetAttempts" INTEGER NOT NULL DEFAULT 0,
    "reportIncluded" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "upcomingReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_compliance_reports" (
    "id" TEXT NOT NULL,
    "humanTaskId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summaryMarkdown" TEXT NOT NULL,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "missedCount" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION,
    "passRate" DOUBLE PRECISION,
    "flaggedWorkerIds" TEXT[],
    "documentUrl" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveredTo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_compliance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "human_tasks_userId_idx" ON "human_tasks"("userId");

-- CreateIndex
CREATE INDEX "human_tasks_status_idx" ON "human_tasks"("status");

-- CreateIndex
CREATE INDEX "task_channels_userId_idx" ON "task_channels"("userId");

-- CreateIndex
CREATE INDEX "task_channels_platform_idx" ON "task_channels"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "task_channels_userId_label_key" ON "task_channels"("userId", "label");

-- CreateIndex
CREATE INDEX "human_workers_humanTaskId_idx" ON "human_workers"("humanTaskId");

-- CreateIndex
CREATE INDEX "human_workers_platform_externalId_idx" ON "human_workers"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "human_workers_humanTaskId_platform_externalId_key" ON "human_workers"("humanTaskId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "task_submissions_humanTaskId_idx" ON "task_submissions"("humanTaskId");

-- CreateIndex
CREATE INDEX "task_submissions_workerId_idx" ON "task_submissions"("workerId");

-- CreateIndex
CREATE INDEX "task_submissions_status_idx" ON "task_submissions"("status");

-- CreateIndex
CREATE INDEX "task_submissions_dueAt_idx" ON "task_submissions"("dueAt");

-- CreateIndex
CREATE INDEX "task_submissions_status_dueAt_idx" ON "task_submissions"("status", "dueAt");

-- CreateIndex
CREATE INDEX "task_compliance_reports_humanTaskId_idx" ON "task_compliance_reports"("humanTaskId");

-- CreateIndex
CREATE INDEX "task_compliance_reports_periodStart_idx" ON "task_compliance_reports"("periodStart");

-- CreateIndex
CREATE INDEX "user_skills_userId_idx" ON "user_skills"("userId");

-- CreateIndex
CREATE INDEX "user_connections_userId_idx" ON "user_connections"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_sessionId_idx" ON "chat_messages"("sessionId");

-- CreateIndex
CREATE INDEX "chat_messages_userId_sessionId_idx" ON "chat_messages"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_tasks" ADD CONSTRAINT "human_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_tasks" ADD CONSTRAINT "human_tasks_taskChannelId_fkey" FOREIGN KEY ("taskChannelId") REFERENCES "task_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_channels" ADD CONSTRAINT "task_channels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_workers" ADD CONSTRAINT "human_workers_humanTaskId_fkey" FOREIGN KEY ("humanTaskId") REFERENCES "human_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_workers" ADD CONSTRAINT "human_workers_taskChannelId_fkey" FOREIGN KEY ("taskChannelId") REFERENCES "task_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_humanTaskId_fkey" FOREIGN KEY ("humanTaskId") REFERENCES "human_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "human_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_compliance_reports" ADD CONSTRAINT "task_compliance_reports_humanTaskId_fkey" FOREIGN KEY ("humanTaskId") REFERENCES "human_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_connections" ADD CONSTRAINT "user_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
