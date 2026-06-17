-- Promokodlarni har sotuvchiga ajratish
ALTER TABLE "PromoCode" ADD COLUMN "tenantId" TEXT;

-- Eski global unique (code) o'rniga (tenantId, code) bo'yicha unique
DROP INDEX IF EXISTS "PromoCode_code_key";
CREATE UNIQUE INDEX "PromoCode_tenantId_code_key" ON "PromoCode"("tenantId", "code");
CREATE INDEX "PromoCode_tenantId_idx" ON "PromoCode"("tenantId");
