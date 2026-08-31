import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type TransactionType = "SEND" | "RECEIVE";

interface RecordStockMovementParams {
  productId: number;
  customerId: number;
  challanId: number;
  challanNumber: string;
  transactionType: TransactionType;
  quantity: Prisma.Decimal | number;
  remarks?: string | null;
}

/**
 * Record a stock movement in the ledger and update inventory balances
 * This is the core function called when challan status changes
 */
export async function recordStockMovement(
  params: RecordStockMovementParams
): Promise<{ success: boolean; error?: string }> {
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

  try {
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current product inventory balance
      let productInventory = await tx.productInventory.findUnique({
        where: { productId },
      });

      // If not found, create it
      if (!productInventory) {
        productInventory = await tx.productInventory.create({
          data: {
            productId,
            companyId: 1, // Assuming single company
            totalQtyInHand: new Prisma.Decimal(0),
          },
        });
      }

      // 2. Calculate running balance based on transaction type
      let newBalance: Decimal;
      if (transactionType === "SEND") {
        // Sending decreases inventory (can go negative)
        newBalance = productInventory.totalQtyInHand.minus(quantityDecimal);
      } else {
        // Receiving increases inventory
        newBalance = productInventory.totalQtyInHand.plus(quantityDecimal);
      }

      // 3. Create stock ledger entry
      const ledgerEntry = await tx.stockLedger.create({
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

      // 4. Update product inventory balance
      await tx.productInventory.update({
        where: { productId },
        data: {
          totalQtyInHand: newBalance,
        },
      });

      // 5. Update customer product stock (track per-customer levels)
      const customerStock = await tx.customerProductStock.findUnique({
        where: {
          companyId_customerId_productId: {
            companyId: 1,
            customerId,
            productId,
          },
        },
      });

      if (transactionType === "SEND") {
        // When sending, increase the qty with customer (they have our stock)
        if (customerStock) {
          await tx.customerProductStock.update({
            where: { id: customerStock.id },
            data: {
              qtyWithCustomer: customerStock.qtyWithCustomer.plus(
                quantityDecimal
              ),
            },
          });
        } else {
          await tx.customerProductStock.create({
            data: {
              companyId: 1,
              customerId,
              productId,
              qtyWithCustomer: quantityDecimal,
            },
          });
        }
      } else {
        // When receiving, decrease the qty with customer
        if (customerStock) {
          await tx.customerProductStock.update({
            where: { id: customerStock.id },
            data: {
              qtyWithCustomer: customerStock.qtyWithCustomer.minus(
                quantityDecimal
              ),
            },
          });
        }
        // If customerStock doesn't exist when receiving, it's an edge case - just log it
      }

      return { ledgerEntry, newBalance };
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
 * Get current inventory level for a product
 */
export async function getProductInventory(productId: number) {
  const inventory = await prisma.productInventory.findUnique({
    where: { productId },
  });

  return (
    inventory || {
      productId,
      totalQtyInHand: new Decimal(0),
      companyId: 1,
    }
  );
}

/**
 * Get stock level we have with a specific customer
 */
export async function getCustomerProductStock(
  customerId: number,
  productId: number
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

  return stock?.qtyWithCustomer || new Decimal(0);
}

/**
 * Get all stock movements for a product (ledger history)
 */
export async function getProductStockHistory(productId: number) {
  return await prisma.stockLedger.findMany({
    where: { productId },
    include: {
      product: true,
      customer: {
        select: {
          id: true,
          ledgerName: true,
        },
      },
      challan: {
        select: {
          id: true,
          challanNumber: true,
          challanDate: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get all stock movements for a customer
 */
export async function getCustomerStockHistory(customerId: number) {
  return await prisma.stockLedger.findMany({
    where: { customerId },
    include: {
      product: {
        select: {
          id: true,
          productName: true,
          productCode: true,
          unit: true,
        },
      },
      customer: {
        select: {
          id: true,
          ledgerName: true,
        },
      },
      challan: {
        select: {
          id: true,
          challanNumber: true,
          challanDate: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get all current inventory levels
 */
export async function getAllProductInventory() {
  return await prisma.productInventory.findMany({
    include: {
      product: {
        select: {
          id: true,
          productName: true,
          productCode: true,
          unit: true,
        },
      },
    },
    orderBy: { lastMovement: "desc" },
  });
}

/**
 * Get per-customer inventory levels
 */
export async function getCustomerInventorySummary(customerId: number) {
  return await prisma.customerProductStock.findMany({
    where: { customerId },
    include: {
      product: {
        select: {
          id: true,
          productName: true,
          productCode: true,
          unit: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Get warning if inventory goes negative (for validation)
 */
export async function checkInventoryWarning(
  productId: number,
  sendingQuantity: Prisma.Decimal | number
): Promise<{ hasWarning: boolean; currentLevel: Prisma.Decimal; wouldBeLevel: Prisma.Decimal }> {
  const inventory = await getProductInventory(productId);
  const quantityDecimal = new Prisma.Decimal(sendingQuantity);
  const wouldBeLevel = inventory.totalQtyInHand.minus(quantityDecimal);

  return {
    hasWarning: wouldBeLevel.lessThan(0),
    currentLevel: inventory.totalQtyInHand,
    wouldBeLevel,
  };
}
