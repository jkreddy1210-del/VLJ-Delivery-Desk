export const CHALLAN_SUFFIX_OPTIONS = ["A", "JB", "M"] as const;

export type ChallanSuffix = (typeof CHALLAN_SUFFIX_OPTIONS)[number];

export const DELIVERY_TYPES = [
  {
    value: "APPROVAL",
    label: "Approval",
    suffix: "A" as ChallanSuffix,
  },
  {
    value: "JOB_WORK",
    label: "Job Work",
    suffix: "JB" as ChallanSuffix,
  },
  {
    value: "MARKETING",
    label: "Marketing",
    suffix: "M" as ChallanSuffix,
  },
] as const;

export type DeliveryTypeValue = (typeof DELIVERY_TYPES)[number]["value"];

export function isDeliveryType(value: unknown): value is DeliveryTypeValue {
  return DELIVERY_TYPES.some((type) => type.value === value);
}

export function isChallanSuffix(value: unknown): value is ChallanSuffix {
  return CHALLAN_SUFFIX_OPTIONS.includes(value as ChallanSuffix);
}

export function deliveryTypeLabel(type: DeliveryTypeValue | string | null | undefined) {
  return DELIVERY_TYPES.find((item) => item.value === type)?.label ?? type ?? "—";
}

export function suffixForDeliveryType(type: DeliveryTypeValue): ChallanSuffix {
  return DELIVERY_TYPES.find((item) => item.value === type)?.suffix ?? "A";
}

export function getFinancialYearLabel(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String(startYear + 1).slice(-2);
  return `${startYear}-${endYearShort}`;
}

export function buildChallanNumber({
  prefix,
  nextNo,
  financialYear,
  suffix,
  date = new Date(),
}: {
  prefix?: string | null;
  nextNo?: number | null;
  financialYear?: string | null;
  suffix?: string | null;
  date?: Date;
}) {
  const cleanPrefix = (prefix?.trim() || "VLJ").replace(/\/+$/, "");
  const cleanSuffix = (suffix?.trim() || "A").replace(/^-+/, "");
  const serial = String(Math.max(1, Number(nextNo ?? 1) || 1)).padStart(3, "0");
  const fy = financialYear?.trim() || getFinancialYearLabel(date);
  return `${cleanPrefix}/${serial}/${fy}-${cleanSuffix}`;
}

export function getFinancialYearOptions(count = 5) {
  const now = new Date();
  const month = now.getMonth();
  const startYear = month >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, index) => {
    const year = startYear - index;
    return `${year}-${String(year + 1).slice(-2)}`;
  });
}

export function getFinancialYearRange(label: string) {
  const match = /^\s*(\d{4})-\d{2}\s*$/.exec(label);
  const startYear = match ? Number(match[1]) : new Date().getFullYear();
  return {
    from: new Date(startYear, 3, 1),
    to: new Date(startYear + 1, 2, 31, 23, 59, 59, 999),
  };
}
