CREATE TYPE "SettlementType" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE');

CREATE TABLE "delivery_challan_settlements" (
  "id" SERIAL NOT NULL,
  "challanId" INTEGER NOT NULL,
  "challanItemId" INTEGER NOT NULL,
  "documentType" "SettlementType" NOT NULL,
  "documentNo" TEXT NOT NULL,
  "documentDate" TIMESTAMP(3),
  "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_challan_settlements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_challan_settlements_challanId_idx" ON "delivery_challan_settlements"("challanId");
CREATE INDEX "delivery_challan_settlements_challanItemId_idx" ON "delivery_challan_settlements"("challanItemId");
CREATE INDEX "delivery_challan_settlements_documentNo_idx" ON "delivery_challan_settlements"("documentNo");

ALTER TABLE "delivery_challan_settlements" ADD CONSTRAINT "delivery_challan_settlements_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "delivery_challans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_challan_settlements" ADD CONSTRAINT "delivery_challan_settlements_challanItemId_fkey" FOREIGN KEY ("challanItemId") REFERENCES "delivery_challan_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
