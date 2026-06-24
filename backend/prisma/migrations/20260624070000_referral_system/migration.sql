-- AlterTable: Tenant referral fields
ALTER TABLE "Tenant" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "referredById" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "referralBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN "referralEarnedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN "pendingBalanceApplied" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Tenant_referralCode_key" ON "Tenant"("referralCode");
CREATE INDEX "Tenant_referredById_idx" ON "Tenant"("referredById");

-- CreateTable: ReferralEarning
CREATE TABLE "ReferralEarning" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "plan" "TariffPlan" NOT NULL,
    "basisAmount" DECIMAL(12,2) NOT NULL,
    "percent" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralEarning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReferralEarning_referrerId_createdAt_idx" ON "ReferralEarning"("referrerId", "createdAt");
CREATE INDEX "ReferralEarning_referredId_idx" ON "ReferralEarning"("referredId");

-- CreateTable: WithdrawalRequest
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "cardHolder" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WithdrawalRequest_tenantId_createdAt_idx" ON "WithdrawalRequest"("tenantId", "createdAt");
CREATE INDEX "WithdrawalRequest_status_createdAt_idx" ON "WithdrawalRequest"("status", "createdAt");
