-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('CLOTHING', 'SHOES_ACCESSORIES', 'ELECTRONICS', 'PHONES_GADGETS', 'FOOD_GROCERY', 'COSMETICS', 'BEAUTY_HEALTH', 'PHARMACY', 'HOME_GOODS', 'FURNITURE', 'KIDS', 'TOYS', 'SPORTS', 'BOOKS_STATIONERY', 'AUTO_PARTS', 'FLOWERS_GIFTS', 'JEWELRY', 'CONSTRUCTION', 'PET_SUPPLIES', 'RESTAURANT_CAFE', 'OTHER');

-- AlterTable: Admin — Telegram orqali login uchun (parolsiz), tenant bilan bog'lash
ALTER TABLE "Admin" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "Admin" ADD COLUMN "telegramId" BIGINT;
ALTER TABLE "Admin" ADD COLUMN "tenantId" TEXT;

-- AlterTable: Tenant — email endi ixtiyoriy (Telegram onboarding), biznes turi qo'shildi
ALTER TABLE "Tenant" ALTER COLUMN "ownerEmail" DROP NOT NULL;
ALTER TABLE "Tenant" ADD COLUMN "businessType" "BusinessType";

-- CreateIndex
CREATE UNIQUE INDEX "Admin_telegramId_key" ON "Admin"("telegramId");
CREATE UNIQUE INDEX "Admin_tenantId_key" ON "Admin"("tenantId");
CREATE UNIQUE INDEX "Tenant_ownerTelegramId_key" ON "Tenant"("ownerTelegramId");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
