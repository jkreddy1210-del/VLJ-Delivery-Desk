import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SettlementTypeValue = "INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";

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
  const [movements, settlements] = await Promise.all([
    prisma.stockLedger.findMany({
      where: { customerId },
      include: { product: { select: { id: true, productName: true, productCode: true, unit: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.deliveryChallanSettlement.findMany({
      where: { challan: { customerId } },
      include: {
        challan: { select: { id: true, challanNumber: true, direction: true, deliveryType: true } },
        challanItem: { include: { stockItem: { select: { id: true, productName: true, productCode: true, unit: true } } } },
      },
      orderBy: [{ documentDate: "asc" }, { id: "asc" }],
    }),
  ]);

  const products = new Map<number, { product: any; outward: Prisma.Decimal; inward: Prisma.Decimal; invoiced: Prisma.Decimal }>();
  for (const row of movements) {
    const current = products.get(row.productId) ?? { product: row.product, outward: new Prisma.Decimal(0), inward: new Prisma.Decimal(0), invoiced: new Prisma.Decimal(0) };
    if (row.transactionType === "SEND") current.outward = current.outward.plus(row.quantity);
    else current.inward = current.inward.plus(row.quantity);
    products.set(row.productId, current);
  }
  for (const row of settlements) {
    if (row.documentType !== "INVOICE") continue;
    const current = products.get(row.challanItem.stockItemId);
    if (current) current.invoiced = current.invoiced.plus(row.quantity);
  }

  return {
    products: Array.from(products.values()).map((x) => {
      const balanceWithParty = x.outward.minus(x.inward);
      const pending = balanceWithParty.minus(x.invoiced);
      return { product: x.product, outward: x.outward.toNumber(), inward: x.inward.toNumber(), invoiced: x.invoiced.toNumber(), balanceWithParty: balanceWithParty.toNumber(), pending: pending.toNumber() };
    }),
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
    if (challan.direction !== "OUTWARD") throw new Error("Commercial settlement must be linked to an OUTWARD voucher");
    const item = challan.items.find((x) => x.id === data.challanItemId);
    if (!item) throw new Error("Voucher item not found");
    const documentNo = data.documentNo.trim();
    if (!documentNo) throw new Error("Document number is required");
    const quantity = new Prisma.Decimal(data.quantity ?? 0);
    const amount = new Prisma.Decimal(data.amount ?? 0);
    if (quantity.lessThan(0) || amount.lessThan(0)) throw new Error("Settlement quantity/amount cannot be negative");
    if (data.documentType === "INVOICE") {
      const existing = await tx.deliveryChallanSettlement.aggregate({ where: { challanItemId: item.id, documentType: "INVOICE" }, _sum: { quantity: true } });
      const already = existing._sum.quantity ?? new Prisma.Decimal(0);
      if (already.plus(quantity).greaterThan(item.quantity)) throw new Error(`Invoice quantity exceeds remaining quantity. Already invoiced: ${already.toString()}`);
    }
    return serialize(await tx.deliveryChallanSettlement.create({
      data: { challanId: challan.id, challanItemId: item.id, documentType: data.documentType, documentNo, documentDate: data.documentDate ? new Date(data.documentDate) : null, quantity, amount, remarks: data.remarks?.trim() || null },
      include: { challan: { select: { challanNumber: true, direction: true, deliveryType: true } }, challanItem: { include: { stockItem: true } } },
    }));
  });
}

export async function deleteChallanSettlement(id: number) {
  await prisma.deliveryChallanSettlement.delete({ where: { id } });
  return { success: true };
}
