import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCompanySettings,
  peekNextChallanNumber,
  upsertCompanySettings,
} from "@/server/company-settings";

const optionalText = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => value?.trim() || undefined);

const challanSuffixSchema = z.enum(["A", "JB", "M"]);
const deliveryTypeSchema = z.enum(["APPROVAL", "JOB_WORK", "MARKETING"]);

const companySettingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company Name is required"),
  gstin: optionalText,
  pan: optionalText,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  pinCode: optionalText,
  country: optionalText,
  phone: optionalText,
  email: optionalText,
  website: optionalText,
  companyLogo: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() || undefined),
  challanPrefix: optionalText,
  challanNextNo: z.coerce.number().int().min(1).optional(),
  challanFinancialYear: optionalText,
  challanSuffix: challanSuffixSchema.optional(),
});

export const getCompanySettingsFn = createServerFn({ method: "POST" })
  .validator(z.object({}))
  .handler(async () => {
    return await getCompanySettings();
  });

export const saveCompanySettingsFn = createServerFn({ method: "POST" })
  .validator(companySettingsSchema)
  .handler(async ({ data }) => {
    return await upsertCompanySettings(data);
  });

export const getNextChallanNumberFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      date: z.string().optional(),
      deliveryType: deliveryTypeSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const date = data.date ? new Date(data.date) : new Date();
    return await peekNextChallanNumber(data.deliveryType ?? "APPROVAL", date);
  });
