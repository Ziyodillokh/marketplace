-- CreateEnum
CREATE TYPE "TariffPlan" AS ENUM ('FREE', 'STANDARD', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AIOperation" AS ENUM ('AUTO_FILL_TEXT', 'IMAGE_GENERATE', 'IMAGE_ENHANCE', 'IMAGE_BG_REMOVE', 'TRANSLATE', 'CHAT');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'DEVOPS', 'FINANCE', 'SALES', 'SUPPORT');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "ownerTelegramId" BIGINT,
    "tariffPlan" "TariffPlan" NOT NULL DEFAULT 'FREE',
    "tariffStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tariffExpiresAt" TIMESTAMP(3),
    "isOnTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedReason" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "customDomain" TEXT,
    "isWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "botToken" TEXT,
    "botUsername" TEXT,
    "channelId" TEXT,
    "customLimits" JSONB,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "TariffPlan" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "paymentMethod" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT,
    "providerTxId" TEXT,
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICreditUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operation" "AIOperation" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "imagesCount" INTEGER,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "costUzs" DECIMAL(12,2) NOT NULL,
    "productId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICreditUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantResourceStat" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "storageMb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dbSizeMb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imagesCount" INTEGER NOT NULL DEFAULT 0,
    "productsCount" INTEGER NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "activeUsersCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallsCount" INTEGER NOT NULL DEFAULT 0,
    "bandwidthMb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantResourceStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRefreshToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffConfig" (
    "id" TEXT NOT NULL,
    "plan" "TariffPlan" NOT NULL,
    "monthlyPrice" DECIMAL(12,2) NOT NULL,
    "yearlyPrice" DECIMAL(12,2) NOT NULL,
    "yearlyDiscount" INTEGER NOT NULL DEFAULT 20,
    "maxCategories" INTEGER NOT NULL,
    "maxProducts" INTEGER NOT NULL,
    "maxBanners" INTEGER NOT NULL,
    "maxImagesPerProduct" INTEGER NOT NULL,
    "maxOptionsPerProduct" INTEGER NOT NULL,
    "aiImagesPerMonth" INTEGER NOT NULL,
    "aiAutoFillPerMonth" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "badge" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TariffConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoOffer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "applicablePlans" "TariffPlan"[],
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_ownerEmail_key" ON "Tenant"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_botToken_key" ON "Tenant"("botToken");

-- CreateIndex
CREATE INDEX "Tenant_status_tariffPlan_idx" ON "Tenant"("status", "tariffPlan");

-- CreateIndex
CREATE INDEX "Tenant_ownerEmail_idx" ON "Tenant"("ownerEmail");

-- CreateIndex
CREATE INDEX "Tenant_lastActivityAt_idx" ON "Tenant"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Subscription_endsAt_idx" ON "Subscription"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_providerTxId_idx" ON "Invoice"("providerTxId");

-- CreateIndex
CREATE INDEX "AICreditUsage_tenantId_createdAt_idx" ON "AICreditUsage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AICreditUsage_operation_createdAt_idx" ON "AICreditUsage"("operation", "createdAt");

-- CreateIndex
CREATE INDEX "AICreditUsage_createdAt_idx" ON "AICreditUsage"("createdAt");

-- CreateIndex
CREATE INDEX "TenantResourceStat_date_idx" ON "TenantResourceStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TenantResourceStat_tenantId_date_key" ON "TenantResourceStat"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRefreshToken_tokenHash_key" ON "PlatformRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PlatformRefreshToken_adminId_idx" ON "PlatformRefreshToken"("adminId");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_adminId_createdAt_idx" ON "PlatformAuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_action_createdAt_idx" ON "PlatformAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_targetType_targetId_idx" ON "PlatformAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "TariffConfig_plan_key" ON "TariffConfig"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "PromoOffer_code_key" ON "PromoOffer"("code");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICreditUsage" ADD CONSTRAINT "AICreditUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantResourceStat" ADD CONSTRAINT "TenantResourceStat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRefreshToken" ADD CONSTRAINT "PlatformRefreshToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
