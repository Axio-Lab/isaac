-- AlterTable
ALTER TABLE "task_channels" ADD COLUMN     "whatsappNumber" TEXT;

-- CreateTable
CREATE TABLE "whatsapp_auth_states" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_auth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_auth_states_channelId_idx" ON "whatsapp_auth_states"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_auth_states_channelId_key_key" ON "whatsapp_auth_states"("channelId", "key");

-- AddForeignKey
ALTER TABLE "whatsapp_auth_states" ADD CONSTRAINT "whatsapp_auth_states_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "task_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
