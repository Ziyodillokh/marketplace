-- AlterTable: per-tenant delivery config (seller toggles delivery + sets fee)
ALTER TABLE "Tenant" ADD COLUMN "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN "freeDeliveryFrom" DECIMAL(12,2);

-- AlterTable: per-tenant prepayment config (receipt-based, full or partial %)
ALTER TABLE "Tenant" ADD COLUMN "prepaymentEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "prepaymentPercent" INTEGER NOT NULL DEFAULT 100;

-- AlterTable: Order prepayment tracking
ALTER TABLE "Order" ADD COLUMN "prepayAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "prepaidAt" TIMESTAMP(3);
