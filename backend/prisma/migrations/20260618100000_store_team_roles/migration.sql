-- Do'kon jamoasi: bir do'konda bir nechta admin (Boss/Creator/Moderator)

-- Yangi rollar
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'CREATOR';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'MODERATOR';

-- Bir do'konga ko'p admin: tenantId endi unique emas
DROP INDEX IF EXISTS "Admin_tenantId_key";

-- Do'kon o'chsa — uning adminlari ham o'chadi
ALTER TABLE "Admin" DROP CONSTRAINT IF EXISTS "Admin_tenantId_fkey";
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Admin_tenantId_idx" ON "Admin"("tenantId");
-- Bir kishi (telegramId) bitta do'konda faqat bitta rolga ega
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_tenantId_telegramId_key" ON "Admin"("tenantId", "telegramId");
