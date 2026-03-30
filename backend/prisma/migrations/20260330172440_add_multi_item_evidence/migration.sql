-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'COLLECTING';

-- AlterTable
ALTER TABLE "human_tasks" ADD COLUMN     "requiredItems" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "submission_items" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "rawMessage" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_items_submissionId_idx" ON "submission_items"("submissionId");

-- AddForeignKey
ALTER TABLE "submission_items" ADD CONSTRAINT "submission_items_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "task_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
