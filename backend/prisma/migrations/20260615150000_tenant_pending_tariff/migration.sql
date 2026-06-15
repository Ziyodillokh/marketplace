-- AddColumn: to'lov kutilayotgan pulli tarif (tasdiqlanguncha tariffPlan FREE bo'lib turadi)
ALTER TABLE "Tenant" ADD COLUMN "pendingTariff" "TariffPlan";
