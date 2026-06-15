-- Multi-tenant poydevor: katalog modellariga tenantId (ixtiyoriy; eski ma'lumot = NULL/legacy)
ALTER TABLE "Category" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Product" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Banner" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT;

CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");
CREATE INDEX "Product_tenantId_isActive_idx" ON "Product"("tenantId", "isActive");
CREATE INDEX "Banner_tenantId_idx" ON "Banner"("tenantId");
CREATE INDEX "Order_tenantId_status_idx" ON "Order"("tenantId", "status");
