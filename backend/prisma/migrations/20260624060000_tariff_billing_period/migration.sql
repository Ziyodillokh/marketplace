-- AlterTable: tariff billing period (monthly | yearly)
ALTER TABLE "Tenant" ADD COLUMN "pendingBillingPeriod" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "billingPeriod" TEXT;
