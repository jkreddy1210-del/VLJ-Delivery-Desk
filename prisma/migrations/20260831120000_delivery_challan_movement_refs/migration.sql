CREATE TYPE "MovementReason" AS ENUM ('ORIGINAL', 'RETURN', 'REPLACEMENT', 'OTHER');
CREATE TYPE "NoteType" AS ENUM ('CREDIT', 'DEBIT');

ALTER TABLE "delivery_challans" ADD COLUMN "movementReason" "MovementReason" NOT NULL DEFAULT 'ORIGINAL';
ALTER TABLE "delivery_challans" ADD COLUMN "againstVoucherNo" TEXT;
ALTER TABLE "delivery_challans" ADD COLUMN "invoiceNo" TEXT;
ALTER TABLE "delivery_challans" ADD COLUMN "noteType" "NoteType";
ALTER TABLE "delivery_challans" ADD COLUMN "noteNo" TEXT;
