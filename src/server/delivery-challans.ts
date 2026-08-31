import { Prisma } from "@/generated/prisma/client.ts";
import { prisma } from "@/lib/prisma";
import { isDeliveryType, type DeliveryTypeValue } from "@/lib/challan-number";
import { recordStockMovement } from "@/server/inventory";

export type ChallanStatusValue = "STOCK_SENT" | "STOCK_RECEIVED";
export type { DeliveryTypeValue };

const optionalText = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toDecimal = (value: number | string) => new Prisma.Decimal(value);

const serializeValue = (value: unknown): unknown => {
  if (value == null) return value;
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }
  if (typeof value === "object") {
    const anyValue = value as Record<string, unknown>;
    if (
      "toNumber" in anyValue &&
      typeof (anyValue as { toNumber?: () => number }).toNumber === "function"
    ) {
      return (anyValue as { toNumber: () => number }).toNumber();
    }

    return Object.fromEntries(
      Object.entries(anyValue).map(([key, nested]) => [key, serializeValue(nested)]),
    );
  }

  return value;
};

const serializeChallan = (challan: unknown) => {
  if (!challan || typeof challan !== "object") return null;
  return serializeValue(challan);
};

const normalizeChallanItemInput = (data: {
  stockItemId: number;
  quantity: number | string;
  rate: number | string;
  amount?: number | string;
  gstRate?: number | string;
  remarks?: string;
}) => {
  const quantity = Number(data.quantity ?? 0);
  const rate = Number(data.rate ?? 0);
  const amount = Number((Number(data.amount ?? quantity * rate)).toFixed(2));
  const gstRate = Number(data.gstRate ?? 3);

  return {
    stockItemId: Number(data.stockItemId),
    quantity: toDecimal(quantity),
    rate: toDecimal(rate),
    amount: toDecimal(amount),
    gstRate: toDecimal(gstRate),
    remarks: optionalText(data.remarks),
  };
};

export type ChallanInput = {
  challanNumber?: string;
  challanDate?: string | Date;
  deliveryType?: DeliveryTypeValue;
  roundoff?: number | string;
  customerId?: number;
  transporterId?: number | null;
  placeOfSupply?: string;
  referenceNo?: string;
  referenceDate?: string | Date | null;
  buyerOrderNo?: string;
  dispatchDocNo?: string;
  modeOfPayment?: string;
  otherReferences?: string;
  destination?: string;
  termsOfDelivery?: string;
  remarks?: string;
  status?: ChallanStatusValue;
};

const normalizeChallanInput = (data: ChallanInput) => ({
  challanNumber: data.challanNumber?.trim() || undefined,
  challanDate: data.challanDate ? new Date(data.challanDate) : new Date(),
  deliveryType: isDeliveryType(data.deliveryType)
    ? data.deliveryType
    : ("APPROVAL" as DeliveryTypeValue),
  roundoff: toDecimal(Number(data.roundoff ?? 0)),
  customerId: Number(data.customerId ?? 0),
  transporterId: data.transporterId ? Number(data.transporterId) : null,
  placeOfSupply: optionalText(data.placeOfSupply),
  referenceNo: optionalText(data.referenceNo),
  referenceDate: data.referenceDate ? new Date(data.referenceDate) : null,
  buyerOrderNo: optionalText(data.buyerOrderNo),
  dispatchDocNo: optionalText(data.dispatchDocNo),
  modeOfPayment: optionalText(data.modeOfPayment),
  otherReferences: optionalText(data.otherReferences),
  destination: optionalText(data.destination),
  termsOfDelivery: optionalText(data.termsOfDelivery),
  remarks: optionalText(data.remarks),
  status: data.status ?? "STOCK_SENT",
});

const challanInclude = {
  customer: true,
  transporter: true,
  items: {
    include: {
      stockItem: true,
    },
  },
} as const;

export async function listDeliveryChallans({
  search,
  status = "ALL",
  deliveryType = "ALL",
  fromDate,
  toDate,
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  status?: "ALL" | ChallanStatusValue;
  deliveryType?: "ALL" | DeliveryTypeValue;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const take = Math.min(Math.max(pageSize, 1), 500);
  const skip = (Math.max(page, 1) - 1) * take;
  const searchTerm = search?.trim();

  const challanDate: { gte?: Date; lte?: Date } = {};
  if (fromDate) {
    challanDate.gte = new Date(fromDate);
  }
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    challanDate.lte = end;
  }

  const where = {
    ...(status !== "ALL" ? { status } : {}),
    ...(deliveryType !== "ALL" ? { deliveryType } : {}),
    ...(fromDate || toDate ? { challanDate } : {}),
    ...(searchTerm
      ? {
          customer: { ledgerName: { contains: searchTerm } },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.deliveryChallan.findMany({
      where,
      orderBy: { challanDate: "desc" },
      skip,
      take,
      include: challanInclude,
    }),
    prisma.deliveryChallan.count({ where }),
  ]);

  return {
    rows: rows.map((row) => serializeChallan(row)),
    total,
    page,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function getDeliveryChallan(id: number) {
  const row = await prisma.deliveryChallan.findUnique({
    where: { id },
    include: challanInclude,
  });

  return serializeChallan(row);
}

export async function createDeliveryChallan(
  data: ChallanInput & {
    items: Array<{
      stockItemId: number;
      quantity: number | string;
      rate: number | string;
      amount?: number | string;
      gstRate?: number | string;
      remarks?: string;
    }>;
  },
) {
  const normalized = normalizeChallanInput(data);

  return prisma.$transaction(async (tx) => {
    const challanNumber = normalized.challanNumber?.trim();

    if (!challanNumber) {
      throw new Error("Voucher number is required");
    }

    // Get customer to determine direction
    const customer = await tx.customer.findUnique({
      where: { id: normalized.customerId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Determine direction based on customer type
    // CUSTOMER = we send to them (OUTWARD)
    // VENDOR = they send to us (INWARD)
    const direction = customer.customerType === "VENDOR" ? "INWARD" : "OUTWARD";
    const transactionType = direction === "INWARD" ? "RECEIVE" : "SEND";

    const challan = await tx.deliveryChallan.create({
      data: {
        ...normalized,
        challanNumber,
        direction,
        items: {
          create: data.items.map((item) => normalizeChallanItemInput(item)),
        },
      },
      include: challanInclude,
    });

    // Record inventory movements immediately based on direction
    for (const item of data.items) {
      await recordStockMovement({
        productId: item.stockItemId,
        customerId: challan.customerId,
        challanId: challan.id,
        challanNumber: challan.challanNumber,
        transactionType: transactionType as "SEND" | "RECEIVE",
        quantity: new Prisma.Decimal(item.quantity),
        remarks: item.remarks || challan.remarks || null,
      });
    }

    return serializeChallan(challan);
  });
}

export async function updateDeliveryChallan(
  id: number,
  data: ChallanInput & {
    items?: Array<{
      stockItemId: number;
      quantity: number | string;
      rate: number | string;
      amount?: number | string;
      gstRate?: number | string;
      remarks?: string;
    }>;
  },
) {
  const normalized = normalizeChallanInput(data);

  return prisma.$transaction(async (tx) => {
    // Get the original challan
    const original = await tx.deliveryChallan.findUnique({
      where: { id },
      include: challanInclude,
    });

    if (!original) {
      throw new Error("Challan not found");
    }

    // Update the challan
    // Note: Inventory was already recorded at creation, so updates don't affect inventory
    const updated = await tx.deliveryChallan.update({
      where: { id },
      data: {
        ...normalized,
        challanNumber: normalized.challanNumber || undefined,
        // Don't change direction - it was set at creation based on customer type
        direction: original.direction,
        items: data.items
          ? {
              deleteMany: {},
              create: data.items.map((item) => normalizeChallanItemInput(item)),
            }
          : undefined,
      },
      include: challanInclude,
    });

    return serializeChallan(updated);
  });
}

export async function deleteDeliveryChallan(id: number) {
  return prisma.$transaction(async (tx) => {
    // Get the challan to check what movements need to be reversed
    const challan = await tx.deliveryChallan.findUnique({
      where: { id },
      include: {
        items: true,
        stockLedgers: true,
      },
    });

    if (!challan) {
      throw new Error("Challan not found");
    }

    // Delete the challan (cascade will delete associated stock ledger entries and items)
    const deleted = await tx.deliveryChallan.delete({
      where: { id },
    });

    // Recalculate product inventory balances for affected products
    // Get unique product IDs from deleted challan
    const productIds = [...new Set(challan.items.map((item) => item.stockItemId))];

    for (const productId of productIds) {
      // Get all remaining stock ledger entries for this product
      const entries = await tx.stockLedger.findMany({
        where: { productId },
        orderBy: { createdAt: "asc" },
      });

      // Recalculate running balance from scratch
      let runningBalance = new Decimal(0);
      for (const entry of entries) {
        if (entry.transactionType === "SEND") {
          runningBalance = runningBalance.minus(entry.quantity);
        } else {
          runningBalance = runningBalance.plus(entry.quantity);
        }

        // Update the running balance in the ledger
        await tx.stockLedger.update({
          where: { id: entry.id },
          data: { runningBalance },
        });
      }

      // Update product inventory with the final balance
      await tx.productInventory.update({
        where: { productId },
        data: { totalQtyInHand: runningBalance },
      });
    }

    return deleted;
  });
}
