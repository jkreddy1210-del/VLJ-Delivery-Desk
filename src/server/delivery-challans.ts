import { Prisma } from "@/generated/prisma/client.ts";
import { prisma } from "@/lib/prisma";
import { isDeliveryType, type DeliveryTypeValue, type MovementReasonValue } from "@/lib/challan-number";
import { recordStockMovementInTransaction } from "@/server/inventory";

export type ChallanStatusValue = "STOCK_SENT" | "STOCK_RECEIVED";
export type MovementDirectionValue = "INWARD" | "OUTWARD";
export type { DeliveryTypeValue };

const optionalText = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toDecimal = (value: number | string) => new Prisma.Decimal(value);

const serializeValue = (value: unknown): unknown => {
  if (value == null || typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    const anyValue = value as Record<string, unknown>;
    if ("toNumber" in anyValue && typeof (anyValue as { toNumber?: () => number }).toNumber === "function") return (anyValue as { toNumber: () => number }).toNumber();
    return Object.fromEntries(Object.entries(anyValue).map(([key, nested]) => [key, serializeValue(nested)]));
  }
  return value;
};

const serializeChallan = (challan: unknown) => !challan || typeof challan !== "object" ? null : serializeValue(challan);

const normalizeChallanItemInput = (data: { stockItemId: number; quantity: number | string; rate: number | string; amount?: number | string; gstRate?: number | string; remarks?: string }) => {
  const quantity = Number(data.quantity ?? 0);
  const rate = Number(data.rate ?? 0);
  const amount = Number((Number(data.amount ?? quantity * rate)).toFixed(2));
  const gstRate = Number(data.gstRate ?? 3);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Item quantity must be greater than zero");
  if (!Number.isFinite(rate) || rate < 0) throw new Error("Item rate is invalid");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Item amount is invalid");
  if (!Number.isFinite(gstRate) || gstRate < 0) throw new Error("GST rate is invalid");
  return { stockItemId: Number(data.stockItemId), quantity: toDecimal(quantity), rate: toDecimal(rate), amount: toDecimal(amount), gstRate: toDecimal(gstRate), remarks: optionalText(data.remarks) };
};

export type ChallanInput = {
  challanNumber?: string;
  challanDate?: string | Date;
  deliveryType?: DeliveryTypeValue;
  direction?: MovementDirectionValue;
  movementReason?: MovementReasonValue;
  againstVoucherNo?: string;
  invoiceNo?: string;
  noteType?: "CREDIT" | "DEBIT" | null;
  noteNo?: string;
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
  deliveryType: isDeliveryType(data.deliveryType) ? data.deliveryType : ("APPROVAL" as DeliveryTypeValue),
  direction: data.direction === "INWARD" ? "INWARD" : "OUTWARD",
  movementReason: data.movementReason ?? "ORIGINAL",
  againstVoucherNo: optionalText(data.againstVoucherNo),
  invoiceNo: optionalText(data.invoiceNo),
  noteType: data.noteType ?? null,
  noteNo: optionalText(data.noteNo),
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

const challanInclude = { customer: true, transporter: true, items: { include: { stockItem: true } } } as const;

export async function listDeliveryChallans({ search, status = "ALL", deliveryType = "ALL", direction = "ALL", fromDate, toDate, page = 1, pageSize = 10 }: { search?: string; status?: "ALL" | ChallanStatusValue; deliveryType?: "ALL" | DeliveryTypeValue; direction?: "ALL" | MovementDirectionValue; fromDate?: string; toDate?: string; page?: number; pageSize?: number }) {
  const take = Math.min(Math.max(pageSize, 1), 500);
  const skip = (Math.max(page, 1) - 1) * take;
  const searchTerm = search?.trim();
  const challanDate: { gte?: Date; lte?: Date } = {};
  if (fromDate) challanDate.gte = new Date(fromDate);
  if (toDate) { const end = new Date(toDate); end.setHours(23, 59, 59, 999); challanDate.lte = end; }
  const where = { ...(status !== "ALL" ? { status } : {}), ...(deliveryType !== "ALL" ? { deliveryType } : {}), ...(direction !== "ALL" ? { direction } : {}), ...(fromDate || toDate ? { challanDate } : {}), ...(searchTerm ? { customer: { ledgerName: { contains: searchTerm } } } : {}) };
  const [rows, total] = await Promise.all([prisma.deliveryChallan.findMany({ where, orderBy: { challanDate: "desc" }, skip, take, include: challanInclude }), prisma.deliveryChallan.count({ where })]);
  return { rows: rows.map(serializeChallan), total, page, pageSize: take, totalPages: Math.max(1, Math.ceil(total / take)) };
}

export async function getDeliveryChallan(id: number) {
  const row = await prisma.deliveryChallan.findUnique({ where: { id }, include: challanInclude });
  return serializeChallan(row);
}

export async function createDeliveryChallan(data: ChallanInput & { items: Array<{ stockItemId: number; quantity: number | string; rate: number | string; amount?: number | string; gstRate?: number | string; remarks?: string }> }) {
  const normalized = normalizeChallanInput(data);
  return prisma.$transaction(async (tx) => {
    const challanNumber = normalized.challanNumber?.trim();
    if (!challanNumber) throw new Error("Voucher number is required");
    if (!normalized.customerId) throw new Error("Customer is required");
    if (!data.items.length) throw new Error("At least one item is required");
    const customer = await tx.customer.findUnique({ where: { id: normalized.customerId } });
    if (!customer) throw new Error("Customer not found");
    const direction = normalized.direction;
    const transactionType = direction === "INWARD" ? "RECEIVE" : "SEND";
    const status = direction === "INWARD" ? "STOCK_RECEIVED" : "STOCK_SENT";
    const challan = await tx.deliveryChallan.create({
      data: { ...normalized, challanNumber, direction, status, items: { create: data.items.map(normalizeChallanItemInput) } },
      include: challanInclude,
    });
    for (const item of data.items) await recordStockMovementInTransaction(tx, { productId: Number(item.stockItemId), customerId: challan.customerId, challanId: challan.id, challanNumber: challan.challanNumber, transactionType, quantity: new Prisma.Decimal(item.quantity), remarks: item.remarks || challan.remarks || null });
    return serializeChallan(challan);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateDeliveryChallan(id: number, data: ChallanInput & { items?: Array<{ stockItemId: number; quantity: number | string; rate: number | string; amount?: number | string; gstRate?: number | string; remarks?: string }> }) {
  const normalized = normalizeChallanInput(data);
  return prisma.$transaction(async (tx) => {
    const original = await tx.deliveryChallan.findUnique({ where: { id }, include: { items: true } });
    if (!original) throw new Error("Challan not found");
    if (data.customerId !== undefined && Number(data.customerId) !== original.customerId) throw new Error("Party cannot be changed after the challan has posted stock. Create a reversal/new challan instead.");
    if (data.direction !== undefined && data.direction !== original.direction) throw new Error("Stock direction cannot be changed after the challan has posted stock. Create a reversal/new challan instead.");
    if (data.challanNumber !== undefined && data.challanNumber.trim() !== original.challanNumber) throw new Error("Voucher number cannot be changed after stock is posted.");
    if (data.challanDate !== undefined) { const requestedDate = new Date(data.challanDate); if (Number.isNaN(requestedDate.getTime()) || requestedDate.getTime() !== original.challanDate.getTime()) throw new Error("Voucher date cannot be changed after stock is posted."); }
    if (data.items) {
      const incoming = data.items.map(normalizeChallanItemInput);
      const sameItems = incoming.length === original.items.length && incoming.every((item, index) => { const old = original.items[index]; return item.stockItemId === old.stockItemId && item.quantity.equals(old.quantity); });
      if (!sameItems) throw new Error("Stock items or quantities cannot be changed after the challan has posted stock. Create a reversal/new challan instead.");
    }
    const updated = await tx.deliveryChallan.update({
      where: { id },
      data: {
        deliveryType: normalized.deliveryType,
        movementReason: normalized.movementReason,
        againstVoucherNo: normalized.againstVoucherNo,
        invoiceNo: normalized.invoiceNo,
        noteType: normalized.noteType,
        noteNo: normalized.noteNo,
        roundoff: normalized.roundoff,
        transporterId: normalized.transporterId,
        placeOfSupply: normalized.placeOfSupply,
        referenceNo: normalized.referenceNo,
        referenceDate: normalized.referenceDate,
        buyerOrderNo: normalized.buyerOrderNo,
        dispatchDocNo: normalized.dispatchDocNo,
        modeOfPayment: normalized.modeOfPayment,
        otherReferences: normalized.otherReferences,
        destination: normalized.destination,
        termsOfDelivery: normalized.termsOfDelivery,
        remarks: normalized.remarks,
      },
      include: challanInclude,
    });
    return serializeChallan(updated);
  });
}

export async function deleteDeliveryChallan(id: number) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.deliveryChallan.findUnique({ where: { id }, include: { items: true, stockLedgers: true } });
    if (!challan) throw new Error("Challan not found");
    const affectedProducts = [...new Set(challan.items.map((item) => item.stockItemId))];
    await tx.deliveryChallan.delete({ where: { id } });
    for (const productId of affectedProducts) {
      const entries = await tx.stockLedger.findMany({ where: { productId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      let runningBalance = new Prisma.Decimal(0);
      for (const entry of entries) { runningBalance = entry.transactionType === "SEND" ? runningBalance.minus(entry.quantity) : runningBalance.plus(entry.quantity); await tx.stockLedger.update({ where: { id: entry.id }, data: { runningBalance } }); }
      await tx.productInventory.upsert({ where: { productId }, create: { productId, companyId: 1, totalQtyInHand: runningBalance }, update: { totalQtyInHand: runningBalance, lastMovement: entries.at(-1)?.createdAt ?? null } });
    }
    const customerProductPairs = [...new Set(challan.stockLedgers.map((entry) => `${entry.customerId}:${entry.productId}`))];
    for (const pair of customerProductPairs) {
      const [customerId, productId] = pair.split(":").map(Number);
      const entries = await tx.stockLedger.findMany({ where: { customerId, productId } });
      let balance = new Prisma.Decimal(0);
      for (const entry of entries) balance = entry.transactionType === "SEND" ? balance.plus(entry.quantity) : balance.minus(entry.quantity);
      await tx.customerProductStock.upsert({ where: { companyId_customerId_productId: { companyId: 1, customerId, productId } }, create: { companyId: 1, customerId, productId, qtyWithCustomer: balance }, update: { qtyWithCustomer: balance } });
    }
    return challan;
  });
}
