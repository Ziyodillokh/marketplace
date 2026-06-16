-- Do'kon ma'lumotlari (admin settings sahifasidan tahrirlanadi)
ALTER TABLE "Tenant" ADD COLUMN     "address" TEXT,
                    ADD COLUMN     "workingHours" TEXT,
                    ADD COLUMN     "about" TEXT;
