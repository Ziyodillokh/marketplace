-- Multi-store: bitta egada (Telegram ID) bir nechta do'kon bo'lishi mumkin.
-- ownerTelegramId va Admin.telegramId endi unique emas — index sifatida qoladi.

DROP INDEX IF EXISTS "Tenant_ownerTelegramId_key";
DROP INDEX IF EXISTS "Admin_telegramId_key";

CREATE INDEX IF NOT EXISTS "Tenant_ownerTelegramId_idx" ON "Tenant"("ownerTelegramId");
CREATE INDEX IF NOT EXISTS "Admin_telegramId_idx" ON "Admin"("telegramId");
