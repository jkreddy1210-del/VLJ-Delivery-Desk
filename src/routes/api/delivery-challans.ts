import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createDeliveryChallan,
  getDeliveryChallan,
  listDeliveryChallans,
  updateDeliveryChallan,
  deleteDeliveryChallan,
} from "@/server/delivery-challans";
import { createChallanSettlement, deleteChallanSettlement, getCustomerReconciliation } from "@/server/reconciliation";

const optionalText = z.string().optional().or(z.literal("")).transform((value) => value?.trim() || undefined);
const deliveryChallanItemSchema = z.object({
  stockItemId: z.coerce.number().int().positive(), quantity: z.coerce.number().positive(), rate: z.coerce.number().min(0), amount: z.coerce.number().min(0).optional(), gstRate: z.coerce.number().min(0).optional(), remarks: optionalText,
});
const deliveryChallanSchema = z.object({
  challanNumber: z.string().trim().optional(), challanDate: z.string().optional(), deliveryType: z.enum(["APPROVAL", "JOB_WORK", "MARKETING"]).optional(),
  direction: z.enum(["INWARD", "OUTWARD"]), movementReason: z.enum(["ORIGINAL", "RETURN", "REPLACEMENT", "OTHER"]).optional(), againstVoucherNo: optionalText, invoiceNo: optionalText,
  noteType: z.enum(["CREDIT", "DEBIT"]).optional().nullable(), noteNo: optionalText, roundoff: z.coerce.number().optional(), customerId: z.coerce.number().int().positive(),
  transporterId: z.coerce.number().int().positive().optional().nullable(), placeOfSupply: optionalText, referenceNo: optionalText, referenceDate: z.string().optional().nullable(),
  buyerOrderNo: optionalText, dispatchDocNo: optionalText, modeOfPayment: optionalText, otherReferences: optionalText, destination: optionalText, termsOfDelivery: optionalText, remarks: optionalText,
  status: z.enum(["STOCK_SENT", "STOCK_RECEIVED"]).optional(), items: z.array(deliveryChallanItemSchema).min(1),
});
const deliveryChallanListSchema = z.object({
  search: z.string().optional(), status: z.enum(["ALL", "STOCK_SENT", "STOCK_RECEIVED"]).default("ALL"), deliveryType: z.enum(["ALL", "APPROVAL", "JOB_WORK", "MARKETING"]).default("ALL"), direction: z.enum(["ALL", "INWARD", "OUTWARD"]).default("ALL"),
  fromDate: z.string().optional(), toDate: z.string().optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(500).default(10),
});
const deliveryChallanIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const listDeliveryChallansFn = createServerFn({ method: "POST" }).validator(deliveryChallanListSchema).handler(async ({ data }) => (await listDeliveryChallans(data)) as any);
export const getDeliveryChallanFn = createServerFn({ method: "POST" }).validator(deliveryChallanIdSchema).handler(async ({ data }) => (await getDeliveryChallan(data.id)) as any);
export const createDeliveryChallanFn = createServerFn({ method: "POST" }).validator(deliveryChallanSchema).handler(async ({ data }) => (await createDeliveryChallan(data)) as any);
export const updateDeliveryChallanFn = createServerFn({ method: "POST" }).validator(z.object({ id: z.coerce.number().int().positive(), data: deliveryChallanSchema.partial() })).handler(async ({ data }) => (await updateDeliveryChallan(data.id, data.data)) as any);
export const deleteDeliveryChallanFn = createServerFn({ method: "POST" }).validator(deliveryChallanIdSchema).handler(async ({ data }) => (await deleteDeliveryChallan(data.id)) as any);

const settlementSchema = z.object({ challanId: z.coerce.number().int().positive(), challanItemId: z.coerce.number().int().positive(), documentType: z.enum(["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"]), documentNo: z.string().trim().min(1), documentDate: z.string().optional().nullable(), quantity: z.coerce.number().min(0).optional(), amount: z.coerce.number().min(0).optional(), remarks: optionalText });
export const createChallanSettlementFn = createServerFn({ method: "POST" }).validator(settlementSchema).handler(async ({ data }) => (await createChallanSettlement(data)) as any);
export const deleteChallanSettlementFn = createServerFn({ method: "POST" }).validator(z.object({ id: z.coerce.number().int().positive() })).handler(async ({ data }) => (await deleteChallanSettlement(data.id)) as any);
export const getCustomerReconciliationFn = createServerFn({ method: "POST" }).validator(z.object({ customerId: z.coerce.number().int().positive() })).handler(async ({ data }) => (await getCustomerReconciliation(data.customerId)) as any);
