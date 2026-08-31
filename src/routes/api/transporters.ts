import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createTransporter,
  deleteTransporter,
  deleteTransporterForever,
  getTransporter,
  listTransporters,
  restoreTransporter,
  updateTransporter,
} from "@/server/transporters";

const optionalText = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => value?.trim() || undefined);

const transporterSchema = z.object({
  name: z.string().trim().min(1, "Transporter name is required"),
  mobile: optionalText,
  gstin: optionalText,
  vehicleNumber: optionalText,
  address: optionalText,
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const transporterListSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(10),
});

const transporterIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listTransportersFn = createServerFn({ method: "POST" })
  .validator(transporterListSchema)
  .handler(async ({ data }) => {
    return await listTransporters(data);
  });

export const getTransporterFn = createServerFn({ method: "POST" })
  .validator(transporterIdSchema)
  .handler(async ({ data }) => {
    return await getTransporter(data.id);
  });

export const createTransporterFn = createServerFn({ method: "POST" })
  .validator(transporterSchema)
  .handler(async ({ data }) => {
    return await createTransporter(data);
  });

export const updateTransporterFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.coerce.number().int().positive(),
      data: transporterSchema.partial(),
    }),
  )
  .handler(async ({ data }) => {
    return await updateTransporter(data.id, data.data);
  });

export const deleteTransporterFn = createServerFn({ method: "POST" })
  .validator(transporterIdSchema)
  .handler(async ({ data }) => {
    return await deleteTransporter(data.id);
  });

export const restoreTransporterFn = createServerFn({ method: "POST" })
  .validator(transporterIdSchema)
  .handler(async ({ data }) => {
    return await restoreTransporter(data.id);
  });

export const deleteTransporterForeverFn = createServerFn({ method: "POST" })
  .validator(transporterIdSchema)
  .handler(async ({ data }) => {
    return await deleteTransporterForever(data.id);
  });
