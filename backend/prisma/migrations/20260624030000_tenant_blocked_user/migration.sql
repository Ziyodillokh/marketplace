-- CreateTable
CREATE TABLE "TenantBlockedUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantBlockedUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantBlockedUser_tenantId_idx" ON "TenantBlockedUser"("tenantId");

-- CreateIndex
CREATE INDEX "TenantBlockedUser_userId_idx" ON "TenantBlockedUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBlockedUser_tenantId_userId_key" ON "TenantBlockedUser"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "TenantBlockedUser" ADD CONSTRAINT "TenantBlockedUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantBlockedUser" ADD CONSTRAINT "TenantBlockedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
