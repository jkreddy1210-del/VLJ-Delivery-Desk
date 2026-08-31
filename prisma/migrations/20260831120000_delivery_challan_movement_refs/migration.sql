ALTER TABLE "delivery_challans" ADD COLUMN "movementReason" TEXT NOT NULL DEFAULT 'ORIGINAL';
ALTER TABLE "delivery_challans" ADD COLUMN "againstVoucherNo" TEXT;
ALTER TABLE "delivery_challans" ADD COLUMN "invoiceNo" TEXT;
ALTER TABLE "delivery_challans" ADD COLUMN "noteType" TEXT;
ALTER TABLE "delivery_challans" ADD COLUMN "noteNo" TEXT;
