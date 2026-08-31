import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type TransactionType = "SEND" | "RECEIVE";

type DbClient = typeof prisma;
type TransactionClient = Prisma.TransactionClient;
type InventoryClient = DbClient | TransactionClient;

interface RecordStockMovementParams {
  productId: number;
  customerId: number;
  challanId: number;
  challanNumber: string;
  transactionType: TransactionType;
  quantity: Prisma.Decimal | number;
  remarks?: string | null;
}

async function recordStockMovementWithClient(
  client: InventoryClient,
  params: RecordStockMovementParams,
): Promise<void> {
  const {
    productId,
    customerId,
    challanId,
    challanNumber,
    transactionType,
    quantity,
    remarks,
  } = params;

  const quantityDecimal = new Prisma.Decimal(quantity);

  let productInventory = await client.productInventory.findUnique({
    where: { productId },
  });

  if (!productInventory) {
    productInventory = await client.productInventory.create({
      data: {
        productId,
        companyId: 1,
        totalQtyInHand: new Prisma.Decimal(0),
        lastMovement: new Date(),
      },
    });
  }

  const movementAt = new Date();
  const newBalance =
    transactionType === "SEND"
      ? productInventory.totalQtyInHand.minus(quantityDecimal)
      : productInventory.totalQtyInHand.plus(quantityDecimal);

  await client.stockLedger.create({
    data: {
      companyId: 1,
      productId,
      transactionType,
      quantity: quantityDecimal,
      customerId,
      challanId,
      challanNumber,
      remarks: remarks || null,
      runningBalance: newBalance,
    },
  });

  await client.productInventory.update({
    where: { productId },
    data: { totalQtyInHand: newBalance, lastMovement: movementAt },
  });

  const customerStock = await client.customerProductStock.findUnique({
    where: {
      companyId_customerId_productId: {
        companyId: 1,
        customerId,
        productId,
      },
    },
  });

  if (transactionType === "SEND") {
    if (customerStock) {
      await client.customerProductStock.update({
        where: { id: customerStock.id },
        data: {
          qtyWithCustomer: customerStock.qtyWithCustomer.plus(quantityDecimal),
        },
      });
    } else {
      await client.customerProductStock.create({
        data: {
          companyId: 1,
          customerId,
          productId,
          qtyWithCustomer: quantityDecimal,
        },
      });
    }
  } else if (customerStock) {
    await client.customerProductStock.update({
      where: { id: customerStock.id },
      data: {
        qtyWithCustomer: customerStock.qtyWithCustomer.minus(quantityDecimal),
      },
    });
  }
}

/**
 * Record a stock movement using its own transaction.
 * Prefer recordStockMovementInTransaction when already inside a transaction.
 */
export async function recordStockMovement(
  params: RecordStockMovementParams,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      await recordStockMovementWithClient(tx, params);
    });
    return { success: true };
  } catch (error) {
    console.error("Error recording stock movement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Record a stock movement inside an existing Prisma transaction.
 * This keeps the challan, ledger, inventory and customer-stock updates atomic.
 */
export async function recordStockMovementInTransaction(
  tx: TransactionClient,
  params: RecordStockMovementParams,
): Promise<void> {
  await recordStockMovementWithClient(tx, params);
}

export async function getProductInventory(productId: number) {
  const inventory = await prisma.productInventory.findUnique({
    where: { productId },
  });

  return (
    inventory || {
      productId,
      totalQtyInHand: new Prisma.Decimal(0),
      companyId: 1,
    }
  );
}

export async function getCustomerProductStock(
  customerId: number,
  productId: number,
) {
  const stock = await prisma.customerProductStock.findUnique({
    where: {
      companyId_customerId_productId: {
        companyId: 1,
        customerId,
        productId,
      },
    },
  });

  return stock?.qtyWithCustomer || new Prisma.Decimal(0);
}

export async function getProductStockHistory(productId: number) {
  return await prisma.stockLedger.findMany({
    where: { productId },
    include: {
      product: true,
      customer: {
        select: { id: true, ledgerName: true },
      },
      challan: {
        select: { id: true, challanNumber: true, challanDate: true },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export async function getCustomerStockHistory(customerId: number) {
  return await prisma.stockLedger.findMany({
    where: { customerId },
    include: {
      product: {
        select: { id: true, productName: true, productCode: true, unit: true },
      },
      customer: {
        select: { id: true, ledgerName: true },
      },
      challan: {
        select: { id: true, challanNumber: true, challanDate: true },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export async function getAllProductInventory() {
  return await prisma.productInventory.findMany({
    include: {
      product: {
        select: { id: true, productName: true, productCode: true, unit: true },
      },
    },
    orderBy: { lastMovement: "desc" },
  });
}

export async function getCustomerInventorySummary(customerId: number) {
  return await prisma.customerProductStock.findMany({
    where: { customerId },
    include: {
      product: {
        select: { id: true, productName: true, productCode: true, unit: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function checkInventoryWarning(
  productId: number,
  sendingQuantity: Prisma.Decimal | number,
): Promise<{
  hasWarning: boolean;
  currentLevel: Prisma.Decimal;
  wouldBeLevel: Prisma.Decimal;
}> {
  const inventory = await getProductInventory(productId);
  const quantityDecimal = new Prisma.Decimal(sendingQuantity);
  const wouldBeLevel = inventory.totalQtyInHand.minus(quantityDecimal);

  return {
    hasWarning: wouldBeLevel.lessThan(0),
    currentLevel: inventory.totalQtyInHand,
    wouldBeLevel,
  };
}
