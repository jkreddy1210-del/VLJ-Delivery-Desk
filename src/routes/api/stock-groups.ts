import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  listStockGroups,
  getStockGroup,
  getParentGroups,
  createStockGroup,
  updateStockGroup,
  deleteStockGroup,
  restoreStockGroup,
  deleteStockGroupForever,
} from "@/server/stock-groups";

const optionalText = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => value?.trim() || undefined);

const stockGroupSchema = z.object({
  groupName: z.string().trim().min(1, "Group Name is required"),
  description: optionalText,
  parentGroupId: z.number().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const stockGroupListSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
});

export const listStockGroupsFn = createServerFn({
  method: "POST",
})
  .validator(stockGroupListSchema)
  .handler(async ({ data }) => {
    try {
      return await listStockGroups(data);
    } catch (error) {
      console.error("[listStockGroupsFn]", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  });

export const getStockGroupFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    return await getStockGroup(data.id);
  });

export const getParentGroupsFn = createServerFn({
  method: "POST",
})
  .validator(z.object({}))
  .handler(async () => {
    return await getParentGroups();
  });

export const createStockGroupFn = createServerFn({
  method: "POST",
})
  .validator(stockGroupSchema)
  .handler(async ({ data }) => {
    return await createStockGroup(data);
  });

export const updateStockGroupFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      id: z.number(),
      data: stockGroupSchema,
    }),
  )
  .handler(async ({ data }) => {
    return await updateStockGroup(data.id, data.data);
  });

export const deleteStockGroupFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    return await deleteStockGroup(data.id);
  });

export const restoreStockGroupFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    return await restoreStockGroup(data.id);
  });

export const deleteStockGroupForeverFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    return await deleteStockGroupForever(data.id);
  });
