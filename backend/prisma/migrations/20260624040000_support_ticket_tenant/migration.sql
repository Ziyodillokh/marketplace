-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_idx" ON "SupportTicket"("tenantId");
