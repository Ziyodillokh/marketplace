-- Do'kon boti profil rasmi (Telegram getUserProfilePhotos orqali olinadi)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "botPhotoUrl" TEXT;
