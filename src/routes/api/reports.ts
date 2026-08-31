import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDashboardStats, listPendingRegister, listStockWithParty } from "@/server/reports";

const listSchema = z.object({
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const getDashboardStatsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return await getDashboardStats(data);
  });

export const listPendingRegisterFn = createServerFn({ method: "POST" })
  .validator(listSchema)
  .handler(async ({ data }) => {
    return await listPendingRegister(data);
  });

export const listStockWithPartyFn = createServerFn({ method: "POST" })
  .validator(listSchema)
  .handler(async ({ data }) => {
    return await listStockWithParty(data);
  });
