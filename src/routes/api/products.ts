import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createProduct,
  deleteProduct,
  deleteProductForever,
  getProduct,
  listProducts,
  restoreProduct,
  updateProduct,
} from "@/server/products";

const optionalText = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => value?.trim() || undefined);

const productSchema = z.object({
  productCode: z.string().trim().min(1, "Product code is required"),
  productName: z.string().trim().min(1, "Product name is required"),
  hsnCode: optionalText,
  unit: z.string().trim().min(1, "Unit is required"),
  description: optionalText,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  stockGroupId: z.coerce.number().int().positive("Stock group is required"),
});

const productListSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
});

const productIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listProductsFn = createServerFn({ method: "POST" })
  .validator(productListSchema)
  .handler(async ({ data }) => {
    return await listProducts(data);
  });

export const getProductFn = createServerFn({ method: "POST" })
  .validator(productIdSchema)
  .handler(async ({ data }) => {
    return await getProduct(data.id);
  });

export const createProductFn = createServerFn({ method: "POST" })
  .validator(productSchema)
  .handler(async ({ data }) => {
    return await createProduct(data);
  });

export const updateProductFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.coerce.number().int().positive(),
      data: productSchema.partial().extend({
        stockGroupId: z.coerce.number().int().positive().optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    return await updateProduct(data.id, data.data);
  });

export const deleteProductFn = createServerFn({ method: "POST" })
  .validator(productIdSchema)
  .handler(async ({ data }) => {
    return await deleteProduct(data.id);
  });

export const restoreProductFn = createServerFn({ method: "POST" })
  .validator(productIdSchema)
  .handler(async ({ data }) => {
    return await restoreProduct(data.id);
  });

export const deleteProductForeverFn = createServerFn({ method: "POST" })
  .validator(productIdSchema)
  .handler(async ({ data }) => {
    return await deleteProductForever(data.id);
  });
