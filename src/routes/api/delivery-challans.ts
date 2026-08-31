import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createDeliveryChallan,
  getDeliveryChallan,
  listDeliveryChallans,
  markChallanStockReceived,
  updateDeliveryChallan,
  deleteDeliveryChallan,
} from "@/server/delivery-challans";

const optionalText = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => value?.trim() || undefined);

const challanStatusSchema = z.enum(["STOCK_SENT", "STOCK_RECEIVED"]);
const deliveryTypeSchema = z.enum(["APPROVAL", "JOB_WORK", "MARKETING"]);

const deliveryChallanItemSchema = z.object({
  stockItemId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().min(0),
  rate: z.coerce.number().min(0),
  amount: z.coerce.number().min(0).optional(),
  gstRate: z.coerce.number().min(0).optional(),
  remarks: optionalText,
});

const deliveryChallanSchema = z.object({
  challanNumber: z.string().trim().optional(),
  challanDate: z.string().optional(),
  deliveryType: deliveryTypeSchema.optional(),
  roundoff: z.coerce.number().optional(),
  customerId: z.coerce.number().int().positive(),
  transporterId: z.coerce.number().int().positive().optional().nullable(),
  placeOfSupply: optionalText,
  referenceNo: optionalText,
  referenceDate: z.string().optional().nullable(),
  buyerOrderNo: optionalText,
  dispatchDocNo: optionalText,
  modeOfPayment: optionalText,
  otherReferences: optionalText,
  destination: optionalText,
  termsOfDelivery: optionalText,
  remarks: optionalText,
  status: challanStatusSchema.optional(),
  items: z.array(deliveryChallanItemSchema).min(1),
});

const deliveryChallanListSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "STOCK_SENT", "STOCK_RECEIVED"]).default("ALL"),
  deliveryType: z.enum(["ALL", "APPROVAL", "JOB_WORK", "MARKETING"]).default("ALL"),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
});

const deliveryChallanIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listDeliveryChallansFn = createServerFn({ method: "POST" })
  .validator(deliveryChallanListSchema)
  .handler(async ({ data }) => {
    // Prisma Date/Decimal values are serialized in the server layer; cast keeps
    // TanStack Start's serializable return-type check satisfied.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await listDeliveryChallans(data)) as any;
  });

export const getDeliveryChallanFn = createServerFn({ method: "POST" })
  .validator(deliveryChallanIdSchema)
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await getDeliveryChallan(data.id)) as any;
  });

export const createDeliveryChallanFn = createServerFn({ method: "POST" })
  .validator(deliveryChallanSchema)
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await createDeliveryChallan(data)) as any;
  });

export const updateDeliveryChallanFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.coerce.number().int().positive(),
      data: deliveryChallanSchema.partial(),
    }),
  )
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await updateDeliveryChallan(data.id, data.data)) as any;
  });

export const markChallanStockReceivedFn = createServerFn({ method: "POST" })
  .validator(deliveryChallanIdSchema)
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await markChallanStockReceived(data.id)) as any;
  });

export const deleteDeliveryChallanFn = createServerFn({ method: "POST" })
  .validator(deliveryChallanIdSchema)
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await deleteDeliveryChallan(data.id)) as any;
  });
