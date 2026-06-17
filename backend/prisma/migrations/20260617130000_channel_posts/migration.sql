-- Sotuvchi kanaliga rejalashtirilgan e'lonlar

CREATE TYPE "ChannelPostStatus" AS ENUM ('SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED');

CREATE TABLE "ChannelPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "buyButton" BOOLEAN NOT NULL DEFAULT false,
    "buttonText" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ChannelPostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "publishedAt" TIMESTAMP(3),
    "channelMessageId" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChannelPost_status_scheduledAt_idx" ON "ChannelPost"("status", "scheduledAt");
CREATE INDEX "ChannelPost_tenantId_idx" ON "ChannelPost"("tenantId");

ALTER TABLE "ChannelPost" ADD CONSTRAINT "ChannelPost_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
