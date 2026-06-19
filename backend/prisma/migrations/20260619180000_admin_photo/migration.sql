-- Admin (do'kon egasi/xodimi) profil rasmi — Telegram initData photo_url dan
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
