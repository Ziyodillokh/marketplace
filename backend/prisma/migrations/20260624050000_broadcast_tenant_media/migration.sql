-- AlterTable: per-shop broadcasts + media support
ALTER TABLE "Broadcast" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Broadcast" ADD COLUMN "mediaType" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "Broadcast" ADD COLUMN "mediaUrl" TEXT;
ALTER TABLE "Broadcast" ADD COLUMN "copyFromChatId" TEXT;
ALTER TABLE "Broadcast" ADD COLUMN "copyMessageId" INTEGER;

-- CreateIndex
CREATE INDEX "Broadcast_tenantId_idx" ON "Broadcast"("tenantId");
