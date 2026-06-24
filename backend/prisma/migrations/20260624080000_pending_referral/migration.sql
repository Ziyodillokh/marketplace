-- CreateTable: bot /start ref<KOD> captured server-side by Telegram ID
CREATE TABLE "PendingReferral" (
    "telegramId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingReferral_pkey" PRIMARY KEY ("telegramId")
);
