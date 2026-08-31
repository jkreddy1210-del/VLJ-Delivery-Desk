import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  restoreCustomer,
  deleteCustomerForever,
} from "@/server/customers";

const optionalText = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => value?.trim() || undefined);

const customerSchema = z.object({
  ledgerName: z.string().trim().min(1, "Ledger Name is required"),
  contactPerson: optionalText,
  mobile: optionalText,
  phone: optionalText,
  email: optionalText,
  gstin: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  district: optionalText,
  state: optionalText,
  pinCode: optionalText,
  country: optionalText,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const customerListSchema = z.object({
  search: z.string().optional(),

  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),

  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce.number().int().min(1).max(500).default(10),
});

const customerIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listCustomersFn = createServerFn({ method: "POST" })
  .validator(customerListSchema)
  .handler(async ({ data }) => {
    return await listCustomers(data);
  });

export const getCustomerFn = createServerFn({ method: "POST" })
  .validator(customerIdSchema)
  .handler(async ({ data }) => {
    return await getCustomer(data.id);
  });

export const createCustomerFn = createServerFn({ method: "POST" })
  .validator(customerSchema)
  .handler(async ({ data }) => {
    return await createCustomer(data);
  });

export const updateCustomerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.coerce.number().int().positive(),
      data: customerSchema.partial(),
    }),
  )
  .handler(async ({ data }) => {
    return await updateCustomer(data.id, data.data);
  });

export const deleteCustomerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    await deleteCustomer(data.id);

    return {
      success: true,
    };
  });

export const deleteCustomerForeverFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    return await deleteCustomerForever(data.id);
  });
export const restoreCustomerFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      id: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    return await restoreCustomer(data.id);
  });
