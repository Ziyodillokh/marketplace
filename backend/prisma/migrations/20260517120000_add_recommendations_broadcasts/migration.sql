-- CreateTable
CREATE TABLE "OrderRecommendation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sentProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderRecommendation_orderId_key" ON "OrderRecommendation"("orderId");

-- CreateIndex
CREATE INDEX "OrderRecommendation_scheduledAt_sentAt_idx" ON "OrderRecommendation"("scheduledAt", "sentAt");

-- CreateIndex
CREATE INDEX "OrderRecommendation_userId_idx" ON "OrderRecommendation"("userId");

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "messageUz" TEXT NOT NULL,
    "messageRu" TEXT,
    "filters" JSONB NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Broadcast_createdAt_idx" ON "Broadcast"("createdAt");

-- CreateIndex
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");
