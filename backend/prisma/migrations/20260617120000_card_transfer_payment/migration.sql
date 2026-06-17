-- Karta o'tkazma to'lovi (chek + kanal orqali qo'lda tasdiqlash)

-- PaymentMethod enum'ga CARD_TRANSFER qo'shamiz
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CARD_TRANSFER';

-- Tenant: karta + tasdiqlash kanali
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "manualCardNumber" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "manualCardHolder" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "manualPaymentChannelId" TEXT;

-- Order: yuklangan chek va sotuvchi kanalidagi xabar id
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentReceiptUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "payReceiptMessageId" INTEGER;
