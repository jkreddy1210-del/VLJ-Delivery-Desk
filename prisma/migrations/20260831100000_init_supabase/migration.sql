CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "customer_type" AS ENUM ('CUSTOMER', 'VENDOR');
CREATE TYPE "ChallanStatus" AS ENUM ('STOCK_SENT', 'STOCK_RECEIVED');
CREATE TYPE "movement_direction" AS ENUM ('OUTWARD', 'INWARD');
CREATE TYPE "DeliveryType" AS ENUM ('APPROVAL', 'JOB_WORK', 'MARKETING');
CREATE TYPE "stockgroup_status" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "company_settings" (
  "id" SERIAL NOT NULL,
  "companyName" TEXT NOT NULL,
  "gstin" TEXT,
  "pan" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "pinCode" TEXT,
  "country" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "challanPrefix" VARCHAR(50) DEFAULT 'VLJ',
  "challanNextNo" INTEGER NOT NULL DEFAULT 1,
  "challanSuffix" VARCHAR(20) DEFAULT 'A',
  "challanSuffixApproval" VARCHAR(20) DEFAULT 'A',
  "challanNextNoApproval" INTEGER NOT NULL DEFAULT 1,
  "challanSuffixJobWork" VARCHAR(20) DEFAULT 'JB',
  "challanNextNoJobWork" INTEGER NOT NULL DEFAULT 1,
  "challanSuffixMarketing" VARCHAR(20) DEFAULT 'M',
  "challanNextNoMarketing" INTEGER NOT NULL DEFAULT 1,
  "challanFinancialYear" VARCHAR(20) DEFAULT '2026-27',
  "companyLogo" TEXT,
  CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customers" (
  "id" SERIAL NOT NULL,
  "ledgerName" TEXT NOT NULL,
  "contactPerson" TEXT,
  "mobile" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "gstin" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "district" TEXT,
  "state" TEXT,
  "pinCode" TEXT,
  "country" TEXT,
  "status" "Status" NOT NULL DEFAULT 'ACTIVE',
  "customerType" "customer_type" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stockgroup" (
  "id" SERIAL NOT NULL,
  "groupName" VARCHAR(150) NOT NULL,
  "description" VARCHAR(500),
  "parentGroupId" INTEGER,
  "status" "stockgroup_status" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stockgroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_items" (
  "id" SERIAL NOT NULL,
  "productCode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "hsnCode" TEXT,
  "unit" TEXT NOT NULL,
  "description" TEXT,
  "status" "Status" NOT NULL DEFAULT 'ACTIVE',
  "stockGroupId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transporters" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "mobile" TEXT,
  "gstin" TEXT,
  "vehicleNumber" TEXT,
  "address" TEXT,
  "status" "Status" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transporters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistics_summaries" (
  "id" SERIAL NOT NULL,
  "transporterId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "logistics_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_challans" (
  "id" SERIAL NOT NULL,
  "challanNumber" TEXT NOT NULL,
  "challanDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customerId" INTEGER NOT NULL,
  "transporterId" INTEGER,
  "remarks" TEXT,
  "status" "ChallanStatus" NOT NULL DEFAULT 'STOCK_SENT',
  "direction" "movement_direction" NOT NULL DEFAULT 'OUTWARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "placeOfSupply" TEXT,
  "referenceNo" TEXT,
  "referenceDate" TIMESTAMP(3),
  "buyerOrderNo" TEXT,
  "dispatchDocNo" TEXT,
  "modeOfPayment" TEXT,
  "otherReferences" TEXT,
  "destination" TEXT,
  "termsOfDelivery" TEXT,
  "deliveryType" "DeliveryType" NOT NULL DEFAULT 'APPROVAL',
  "roundoff" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT "delivery_challans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_challan_items" (
  "id" SERIAL NOT NULL,
  "challanId" INTEGER NOT NULL,
  "stockItemId" INTEGER NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "rate" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  CONSTRAINT "delivery_challan_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistics_summary_items" (
  "id" SERIAL NOT NULL,
  "summaryId" INTEGER NOT NULL,
  "date" TIMESTAMP(3),
  "docketNo" TEXT,
  "customerId" INTEGER,
  "from" TEXT,
  "to" TEXT,
  "grossWeight" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "freightCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "secureHandling" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "enhancedLiability" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "fuelSurcharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalTaxable" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "gst" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalInvoice" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "invoiceRecDate" TIMESTAMP(3),
  "paymentDate" TIMESTAMP(3),
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "logistics_summary_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logistics_summary_agg" (
  "id" SERIAL NOT NULL,
  "transporterId" INTEGER,
  "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "logistics_summary_agg_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_ledgers" (
  "id" SERIAL NOT NULL,
  "companyId" INTEGER NOT NULL DEFAULT 1,
  "productId" INTEGER NOT NULL,
  "transactionType" VARCHAR(20) NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "customerId" INTEGER NOT NULL,
  "challanId" INTEGER NOT NULL,
  "challanNumber" VARCHAR(50) NOT NULL,
  "remarks" VARCHAR(500),
  "runningBalance" DECIMAL(12,3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stock_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_inventories" (
  "id" SERIAL NOT NULL,
  "companyId" INTEGER NOT NULL DEFAULT 1,
  "productId" INTEGER NOT NULL,
  "totalQtyInHand" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "lastMovement" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_inventories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_product_stocks" (
  "id" SERIAL NOT NULL,
  "companyId" INTEGER NOT NULL DEFAULT 1,
  "customerId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "qtyWithCustomer" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_product_stocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_items_productCode_key" ON "stock_items"("productCode");
CREATE UNIQUE INDEX "delivery_challans_challanNumber_key" ON "delivery_challans"("challanNumber");
CREATE UNIQUE INDEX "StockGroup_groupName_key" ON "stockgroup"("groupName");
CREATE UNIQUE INDEX "LogisticsSummaryAgg_transporterId_key" ON "logistics_summary_agg"("transporterId");
CREATE UNIQUE INDEX "product_inventories_productId_key" ON "product_inventories"("productId");
CREATE UNIQUE INDEX "product_inventory_company_product_key" ON "product_inventories"("companyId", "productId");
CREATE UNIQUE INDEX "customer_product_stock_unique" ON "customer_product_stocks"("companyId", "customerId", "productId");

CREATE INDEX "stock_items_stockGroupId_fkey" ON "stock_items"("stockGroupId");
CREATE INDEX "StockGroup_parentGroupId_idx" ON "stockgroup"("parentGroupId");
CREATE INDEX "StockGroup_status_idx" ON "stockgroup"("status");
CREATE INDEX "delivery_challans_customerId_fkey" ON "delivery_challans"("customerId");
CREATE INDEX "delivery_challans_transporterId_fkey" ON "delivery_challans"("transporterId");
CREATE INDEX "delivery_challans_deliveryType_idx" ON "delivery_challans"("deliveryType");
CREATE INDEX "delivery_challans_direction_idx" ON "delivery_challans"("direction");
CREATE INDEX "delivery_challan_items_challanId_fkey" ON "delivery_challan_items"("challanId");
CREATE INDEX "delivery_challan_items_stockItemId_fkey" ON "delivery_challan_items"("stockItemId");
CREATE INDEX "logistics_summary_transporterId_fkey" ON "logistics_summaries"("transporterId");
CREATE INDEX "logistics_summaries_createdAt_idx" ON "logistics_summaries"("createdAt");
CREATE INDEX "logistics_summary_items_summaryId_fkey" ON "logistics_summary_items"("summaryId");
CREATE INDEX "logistics_summary_items_customerId_fkey" ON "logistics_summary_items"("customerId");
CREATE INDEX "stock_ledger_productId_idx" ON "stock_ledgers"("productId");
CREATE INDEX "stock_ledger_customerId_idx" ON "stock_ledgers"("customerId");
CREATE INDEX "stock_ledger_challanId_idx" ON "stock_ledgers"("challanId");
CREATE INDEX "stock_ledger_company_product_idx" ON "stock_ledgers"("companyId", "productId");
CREATE INDEX "stock_ledger_createdAt_idx" ON "stock_ledgers"("createdAt");
CREATE INDEX "product_inventory_productId_idx" ON "product_inventories"("productId");
CREATE INDEX "customer_product_stock_customerId_idx" ON "customer_product_stocks"("customerId");
CREATE INDEX "customer_product_stock_productId_idx" ON "customer_product_stocks"("productId");

ALTER TABLE "stockgroup" ADD CONSTRAINT "StockGroup_parentGroupId_fkey"
  FOREIGN KEY ("parentGroupId") REFERENCES "stockgroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_stockGroupId_fkey"
  FOREIGN KEY ("stockGroupId") REFERENCES "stockgroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logistics_summaries" ADD CONSTRAINT "logistics_summary_transporterId_fkey"
  FOREIGN KEY ("transporterId") REFERENCES "transporters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_challans" ADD CONSTRAINT "delivery_challans_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_challans" ADD CONSTRAINT "delivery_challans_transporterId_fkey"
  FOREIGN KEY ("transporterId") REFERENCES "transporters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_challan_items" ADD CONSTRAINT "delivery_challan_items_challanId_fkey"
  FOREIGN KEY ("challanId") REFERENCES "delivery_challans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_challan_items" ADD CONSTRAINT "delivery_challan_items_stockItemId_fkey"
  FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "logistics_summary_items" ADD CONSTRAINT "logistics_summary_items_summaryId_fkey"
  FOREIGN KEY ("summaryId") REFERENCES "logistics_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logistics_summary_items" ADD CONSTRAINT "logistics_summary_items_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "logistics_summary_agg" ADD CONSTRAINT "logistics_summary_agg_transporterId_fkey"
  FOREIGN KEY ("transporterId") REFERENCES "transporters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_challanId_fkey"
  FOREIGN KEY ("challanId") REFERENCES "delivery_challans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_inventories" ADD CONSTRAINT "product_inventories_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_product_stocks" ADD CONSTRAINT "customer_product_stocks_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_product_stocks" ADD CONSTRAINT "customer_product_stocks_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
