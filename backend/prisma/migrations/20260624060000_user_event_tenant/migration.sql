-- AlterTable
ALTER TABLE "UserEvent" ADD COLUMN "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "UserEvent_tenantId_type_createdAt_idx" ON "UserEvent"("tenantId", "type", "createdAt");
