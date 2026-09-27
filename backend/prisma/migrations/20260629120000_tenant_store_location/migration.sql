-- Do'kon joylashuvi (admin settings — haritadan tanlash / GPS)
ALTER TABLE "Tenant" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Tenant" ADD COLUMN "longitude" DOUBLE PRECISION;
