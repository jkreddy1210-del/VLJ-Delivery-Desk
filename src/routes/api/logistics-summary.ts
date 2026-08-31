import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  saveLogisticsSummary as saveLogisticsSummaryServer,
  getLogisticsSummary as getLogisticsSummaryServer,
  listLogisticsSummaries as listLogisticsSummariesServer,
  deleteLogisticsSummary as deleteLogisticsSummaryServer,
  type LogisticsSummaryRow,
} from "@/server/logistics-summary";

const logisticsSummaryRowSchema = z.object({
  id: z.string(),
  date: z.string().optional(),
  docketNo: z.string().optional(),
  customer: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  grossWeight: z.string().optional(),
  freightCharges: z.string().optional(),
  secureHandling: z.string().optional(),
  enhancedLiability: z.string().optional(),
  fuelSurcharge: z.string().optional(),
  totalTaxable: z.string().optional(),
  gst: z.string().optional(),
  totalInvoice: z.string().optional(),
  invoiceRecDate: z.string().optional(),
  paymentDate: z.string().optional(),
  paid: z.boolean().optional(),
});

const saveLogisticsSummarySchema = z.object({
  transporterId: z.string().optional(),
  rows: z.array(logisticsSummaryRowSchema),
  amountPaid: z.string().optional(),
});

const getLogisticsSummarySchema = z.object({
  transporterId: z.string().optional(),
});

const listLogisticsSummariesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
});

const deleteLogisticsSummarySchema = z.object({
  summaryId: z.coerce.number().int().positive(),
});

export const saveLogisticsSummaryFn = createServerFn({ method: "POST" })
  .validator(saveLogisticsSummarySchema)
  .handler(async ({ data }) => {
    return await saveLogisticsSummaryServer({
      transporterId: data.transporterId,
      rows: data.rows,
      amountPaid: data.amountPaid,
    });
  });

export const getLogisticsSummaryFn = createServerFn({ method: "POST" })
  .validator(getLogisticsSummarySchema)
  .handler(async ({ data }) => {
    return await getLogisticsSummaryServer(data.transporterId);
  });

export const listLogisticsSummariesFn = createServerFn({ method: "POST" })
  .validator(listLogisticsSummariesSchema)
  .handler(async ({ data }) => {
    return await listLogisticsSummariesServer({
      page: data.page,
      pageSize: data.pageSize,
    });
  });

export const deleteLogisticsSummaryFn = createServerFn({ method: "POST" })
  .validator(deleteLogisticsSummarySchema)
  .handler(async ({ data }) => {
    return await deleteLogisticsSummaryServer(data.summaryId);
  });

