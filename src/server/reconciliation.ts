import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SettlementTypeValue = "INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE" | "RETURN_DC";

const CLEARING_SETTLEMENT_TYPES: SettlementTypeValue[] = ["INVOICE", "RETURN_DC"];

const serialize = (value: any): any => {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    if (typeof value.toNumber === "function") return value.toNumber();
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
};

export async function getCustomerReconciliation(customerId: number) {
  const [movements, challans, settlements] = await Promise.all([
    prisma.stockLedger.findMany({ where: { customerId }, include: { product: { select: { id: true, productName: true, productCode: true, unit: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.deliveryChallan.findMany({ where: { customerId }, include: { items: { include: { stockItem: { select: { id: true, productName: true, productCode: true, unit: true } } } } }, orderBy: [{ challanDate: "asc" }, { id: "asc" }] }),
    prisma.deliveryChallanSettlement.findMany({
      where: { challan: { customerId } },
      include: {
        challan: { select: { id: true, challanNumber: true, challanDate: true, direction: true, deliveryType: true, movementReason: true } },
        challanItem: { include: { stockItem: { select: { id: true, productName: true, productCode: true, unit: true } } } },
      },
      orderBy: [{ documentDate: "asc" }, { id: "asc" }],
    }),
  ]);

  const settledByItem = new Map<number, Prisma.Decimal>();
  for (const row of settlements) {
    if (!CLEARING_SETTLEMENT_TYPES.includes(row.documentType as SettlementTypeValue)) continue;
    const current = settledByItem.get(row.challanItemId) ?? new Prisma.Decimal(0);
    settledByItem.set(row.challanItemId, current.plus(row.quantity));
  }

  const openVouchers = challans
    .filter((challan) => challan.movementReason === "ORIGINAL")
    .map((challan) => {
      const items = challan.items.map((item) => {
        const settled = settledByItem.get(item.id) ?? new Prisma.Decimal(0);
        const rawOutstanding = item.quantity.minus(settled);
        const outstanding = rawOutstanding.lessThan(0) ? new Prisma.Decimal(0) : rawOutstanding;
        const settledAmount = settlements
          .filter((s) => s.challanItemId === item.id && CLEARING_SETTLEMENT_TYPES.includes(s.documentType as SettlementTypeValue))
          .reduce((sum, s) => sum.plus(s.amount), new Prisma.Decimal(0));
        return {
          itemId: item.id,
          product: item.stockItem,
          originalQuantity: item.quantity.toNumber(),
          clearedQuantity: settled.toNumber(),
          outstandingQuantity: outstanding.toNumber(),
          originalAmount: item.amount.toNumber(),
          settledAmount: settledAmount.toNumber(),
        };
      }).filter((item) => item.outstandingQuantity > 0);

      return {
        id: challan.id,
        challanNumber: challan.challanNumber,
        challanDate: challan.challanDate.toISOString(),
        direction: challan.direction,
        deliveryType: challan.deliveryType,
        movementReason: challan.movementReason,
        againstVoucherNo: challan.againstVoucherNo,
        items,
        totalOutstandingQuantity: items.reduce((sum, item) => sum + item.outstandingQuantity, 0),
      };
    })
    .filter((challan) => challan.items.length > 0);

  const products = new Map<number, { product: any; outward: Prisma.Decimal; inward: Prisma.Decimal; invoiced: Prisma.Decimal; returned: Prisma.Decimal }>();
  for (const row of movements) {
    const current = products.get(row.productId) ?? { product: row.product, outward: new Prisma.Decimal(0), inward: new Prisma.Decimal(0), invoiced: new Prisma.Decimal(0), returned: new Prisma.Decimal(0) };
    if (row.transactionType === "SEND") current.outward = current.outward.plus(row.quantity);
    else current.inward = current.inward.plus(row.quantity);
    products.set(row.productId, current);
  }
  for (const row of settlements) {
    const current = products.get(row.challanItem.stockItemId);
    if (!current) continue;
    if (row.documentType === "INVOICE") current.invoiced = current.invoiced.plus(row.quantity);
    if (row.documentType === "RETURN_DC") current.returned = current.returned.plus(row.quantity);
  }

  return {
    products: Array.from(products.values()).map((x) => {
      const balanceWithParty = x.outward.minus(x.inward);
      const pending = openVouchers.flatMap((v) => v.items).filter((item) => item.product.id === x.product.id).reduce((sum, item) => sum + item.outstandingQuantity, 0);
      return { product: x.product, outward: x.outward.toNumber(), inward: x.inward.toNumber(), invoiced: x.invoiced.toNumber(), returned: x.returned.toNumber(), balanceWithParty: balanceWithParty.toNumber(), pending };
    }),
    openVouchers,
    settlements: settlements.map(serialize),
  };
}

export async function createChallanSettlement(data: {
  challanId: number;
  challanItemId: number;
  documentType: SettlementTypeValue;
  documentNo: string;
  documentDate?: string | Date | null;
  quantity?: number | string;
  amount?: number | string;
  remarks?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.deliveryChallan.findUnique({ where: { id: data.challanId }, include: { items: true } });
    if (!challan) throw new Error("Voucher not found");
    if (challan.movementReason !== "ORIGINAL") throw new Error("Only an original voucher can be cleared. Link the return/replacement to its original voucher instead.");

    const item = challan.items.find((x) => x.id === data.challanItemId);
    if (!item) throw new Error("Voucher item not found");

    const documentNo = data.documentNo.trim();
    if (!documentNo) throw new Error("Document number is required");

    const quantity = new Prisma.Decimal(data.quantity ?? 0);
    const amount = new Prisma.Decimal(data.amount ?? 0);
    if (quantity.lessThan(0) || amount.lessThan(0)) throw new Error("Settlement quantity/amount cannot be negative");

    if (data.documentType === "INVOICE" && quantity.isZero()) throw new Error("Invoice clearance requires a quantity");

    if (data.documentType === "RETURN_DC") {
      if (quantity.isZero()) throw new Error("Return DC clearance requires a quantity");
      const returnChallan = await tx.deliveryChallan.findFirst({
        where: {
          challanNumber: documentNo,
          customerId: challan.customerId,
          direction: challan.direction === "OUTWARD" ? "INWARD" : "OUTWARD",
          deliveryType: challan.deliveryType,
          movementReason: { in: ["RETURN", "REPLACEMENT"] },
        },
        select: { id: true, challanNumber: true, againstVoucherNo: true },
      });
      if (!returnChallan) throw new Error("Return DC not found. Create the opposite-direction return/replacement DC first, then use its number here.");
      if (returnChallan.againstVoucherNo && returnChallan.againstVoucherNo !== challan.challanNumber) throw new Error(`Return DC ${documentNo} is linked to ${returnChallan.againstVoucherNo}, not ${challan.challanNumber}.`);
      const duplicate = await tx.deliveryChallanSettlement.findFirst({ where: { challanId: challan.id, documentType: "RETURN_DC", documentNo } });
      if (duplicate) throw new Error("This return DC is already linked to the voucher.");
    }

    if (CLEARING_SETTLEMENT_TYPES.includes(data.documentType)) {
      const existing = await tx.deliveryChallanSettlement.aggregate({ where: { challanItemId: item.id, documentType: { in: CLEARING_SETTLEMENT_TYPES } }, _sum: { quantity: true } });
      const already = existing._sum.quantity ?? new Prisma.Decimal(0);
      const remaining = item.quantity.minus(already);
      if (quantity.greaterThan(remaining)) throw new Error(`Clearance quantity exceeds remaining quantity. Remaining: ${remaining.toString()}`);
    }

    return serialize(await tx.deliveryChallanSettlement.create({
      data: { challanId: challan.id, challanItemId: item.id, documentType: data.documentType, documentNo, documentDate: data.documentDate ? new Date(data.documentDate) : null, quantity, amount, remarks: data.remarks?.trim() || null },
      include: { challan: { select: { challanNumber: true, direction: true, deliveryType: true } }, challanItem: { include: { stockItem: true } } },
    }));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deleteChallanSettlement(id: number) {
  await prisma.deliveryChallanSettlement.delete({ where: { id } });
  return { success: true };
}
