-- Tenant: har sotuvchi Payme/Click merchant ma'lumotlari
ALTER TABLE "Tenant" ADD COLUMN "paymeMerchantId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "paymeKey" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "clickServiceId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "clickMerchantId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "clickMerchantUserId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "clickSecretKey" TEXT;

-- PaymentMethod enum: onlayn turlar
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYME';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CLICK';

-- PaymentProvider enum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYME', 'CLICK');

-- Order.paidAt
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);

-- PaymentTransaction
CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerTxId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "state" INTEGER NOT NULL DEFAULT 1,
  "reason" INTEGER,
  "createTime" BIGINT,
  "performTime" BIGINT,
  "cancelTime" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentTransaction_provider_providerTxId_key" ON "PaymentTransaction"("provider", "providerTxId");
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");
CREATE INDEX "PaymentTransaction_tenantId_idx" ON "PaymentTransaction"("tenantId");
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
