import type { CompanySettings, Prisma } from "@/generated/prisma/client.ts";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import {
  buildChallanNumber,
  getFinancialYearLabel,
  isChallanSuffix,
  suffixForDeliveryType,
  type DeliveryTypeValue,
} from "@/lib/challan-number";

type CompanySettingsInput = {
  companyName?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  companyLogo?: string;
  challanPrefix?: string;
  challanNextNo?: number;
  challanFinancialYear?: string;
  challanSuffix?: string;
};

type CompanySettingsResult =
  CompanySettings | (Partial<CompanySettings> & { companyLogo?: string });

const normalizeSuffix = (value: unknown, fallback: string) => {
  const trimmed = typeof value === "string" ? value.trim().toUpperCase() : "";
  return isChallanSuffix(trimmed) ? trimmed : fallback;
};

const normalizeCompanySettingsInput = (data: CompanySettingsInput) => ({
  companyName: data.companyName?.trim() ?? "",
  gstin: data.gstin?.trim() || undefined,
  pan: data.pan?.trim() || undefined,
  address: data.address?.trim() || undefined,
  city: data.city?.trim() || undefined,
  state: data.state?.trim() || undefined,
  pinCode: data.pinCode?.trim() || undefined,
  country: data.country?.trim() || undefined,
  phone: data.phone?.trim() || undefined,
  email: data.email?.trim() || undefined,
  website: data.website?.trim() || undefined,
  companyLogo: data.companyLogo?.trim() || undefined,
  challanPrefix: data.challanPrefix?.trim() || "VLJ",
  challanNextNo: Math.max(1, Number(data.challanNextNo ?? 1) || 1),
  challanFinancialYear: data.challanFinancialYear?.trim() || getFinancialYearLabel(),
  challanSuffix: normalizeSuffix(data.challanSuffix, "A"),
});

function resolvePublicLogoPath() {
  try {
    const publicDir = path.resolve(process.cwd(), "public");
    const files = fs.existsSync(publicDir) ? fs.readdirSync(publicDir) : [];
    const found = files.find((f) => f.startsWith("company-logo."));
    return found ? `/${found}` : undefined;
  } catch {
    return undefined;
  }
}

export async function getCompanySettings(): Promise<CompanySettingsResult | null> {
  const settings = await prisma.companySettings.findFirst({
    orderBy: { id: "asc" },
  });

  // If DB doesn't have companyLogo (migration pending), check public folder
  // for a fallback logo saved by the upsert fallback logic above.
  if (settings?.companyLogo) return settings;

  const publicLogo = resolvePublicLogoPath();
  if (publicLogo) {
    return { ...(settings ?? {}), companyLogo: publicLogo };
  }

  return settings;
}

export async function upsertCompanySettings(data: {
  companyName: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  companyLogo?: string;
  challanPrefix?: string;
  challanNextNo?: number;
  challanFinancialYear?: string;
  challanSuffix?: string;
}): Promise<CompanySettingsResult> {
  const settings = await prisma.companySettings.findFirst({
    orderBy: { id: "asc" },
  });
  const normalized = normalizeCompanySettingsInput(data);
  // Build update payload that only includes fields that were explicitly provided
  // and are non-empty. This prevents accidental overwrites with empty values
  // (which may look like data 'deletion').
  const buildPartial = (input: typeof data): Prisma.CompanySettingsUpdateInput => {
    const out: Prisma.CompanySettingsUpdateInput = {};
    const keys = [
      "companyName",
      "gstin",
      "pan",
      "address",
      "city",
      "state",
      "pinCode",
      "country",
      "phone",
      "email",
      "website",
      "companyLogo",
      "challanPrefix",
      "challanNextNo",
      "challanFinancialYear",
      "challanSuffix",
    ] as const;

    for (const k of keys) {
      const v = input[k];
      if (v === undefined) continue;
      // For strings, ignore empty string (treat as not provided)
      if (typeof v === "string") {
        const t = v.trim();
        if (t.length === 0) continue;
        out[k] = t;
        continue;
      }
      out[k] = v;
    }
    return out;
  };

  // Try to persist settings to the database. If the database schema is
  // missing the `companyLogo` column (migration not applied), Prisma will
  // throw an error about an unknown argument. In that case, fall back to
  // saving the uploaded logo to the filesystem and persist remaining fields.
  const logoData = normalized.companyLogo;
  const partialData = buildPartial(data);

  const persistWithoutLogo = async () => {
    const { companyLogo: _logo, ...copy } = partialData;

    if (settings) {
      return prisma.companySettings.update({
        where: { id: settings.id },
        data: copy,
      });
    }

    return prisma.companySettings.create({
      data: {
        companyName: normalized.companyName,
        gstin: normalized.gstin,
        pan: normalized.pan,
        address: normalized.address,
        city: normalized.city,
        state: normalized.state,
        pinCode: normalized.pinCode,
        country: normalized.country,
        phone: normalized.phone,
        email: normalized.email,
        website: normalized.website,
        challanPrefix: normalized.challanPrefix,
        challanNextNo: normalized.challanNextNo,
        challanFinancialYear: normalized.challanFinancialYear,
        challanSuffix: normalized.challanSuffix,
      },
    });
  };

  try {
    if (settings) {
      // update only provided fields to avoid accidental clearing
      const upd = buildPartial(data);
      return await prisma.companySettings.update({
        where: { id: settings.id },
        data: upd,
      });
    }

    // create with normalized values
    return await prisma.companySettings.create({ data: normalized });
  } catch (err: unknown) {
    const msg = String(err instanceof Error ? err.message : err);
    if (logoData && msg.includes("companyLogo")) {
      // Save logo to public folder as a fallback so UI can still display it.
      try {
        const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(logoData);
        if (match) {
          const mime = match[1];
          const ext = mime.split("/")[1] || "png";
          const buffer = Buffer.from(match[2], "base64");
          const publicDir = path.resolve(process.cwd(), "public");
          if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
          const logoPath = path.join(publicDir, `company-logo.${ext}`);
          fs.writeFileSync(logoPath, buffer);
        }
      } catch {
        // ignore filesystem errors and continue to persist remaining fields
      }

      const result = await persistWithoutLogo();
      // Attach a runtime-only companyLogo URL so callers receive the logo path
      // even though it's not stored in DB.
      return {
        ...result,
        companyLogo: resolvePublicLogoPath(),
      };
    }

    // Re-throw non-logo related errors
    throw err;
  }
}

export async function peekNextChallanNumber(
  deliveryType: DeliveryTypeValue = "APPROVAL",
  date = new Date(),
) {
  const settings = await getCompanySettings();
  return buildChallanNumber({
    prefix: settings?.challanPrefix,
    nextNo: settings?.challanNextNo ?? 1,
    financialYear: settings?.challanFinancialYear,
    suffix: suffixForDeliveryType(deliveryType),
    date,
  });
}
