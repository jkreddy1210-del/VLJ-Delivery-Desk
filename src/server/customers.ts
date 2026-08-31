import { prisma } from "@/lib/prisma";
import { serializeDate } from "@/lib/serialize";

export type CustomerTypeValue = "CUSTOMER" | "VENDOR";

const serializeCustomer = (customer: Record<string, unknown> | null) => {
  if (!customer) return null;
  return {
    id: Number(customer.id),
    ledgerName: String(customer.ledgerName ?? ""),
    contactPerson: (customer.contactPerson as string | null | undefined) ?? null,
    mobile: (customer.mobile as string | null | undefined) ?? null,
    phone: (customer.phone as string | null | undefined) ?? null,
    email: (customer.email as string | null | undefined) ?? null,
    gstin: (customer.gstin as string | null | undefined) ?? null,
    addressLine1: (customer.addressLine1 as string | null | undefined) ?? null,
    addressLine2: (customer.addressLine2 as string | null | undefined) ?? null,
    city: (customer.city as string | null | undefined) ?? null,
    district: (customer.district as string | null | undefined) ?? null,
    state: (customer.state as string | null | undefined) ?? null,
    pinCode: (customer.pinCode as string | null | undefined) ?? null,
    country: (customer.country as string | null | undefined) ?? null,
    status: customer.status as "ACTIVE" | "INACTIVE",
    customerType: (customer.customerType as CustomerTypeValue | undefined) ?? "CUSTOMER",
    createdAt: serializeDate(customer.createdAt),
    updatedAt: serializeDate(customer.updatedAt),
  };
};

const optionalText = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeCustomerInput = (data: {
  ledgerName?: string;
  contactPerson?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  status?: "ACTIVE" | "INACTIVE";
  customerType?: CustomerTypeValue;
}) => ({
  ledgerName: data.ledgerName?.trim() ?? "",
  contactPerson: optionalText(data.contactPerson),
  mobile: optionalText(data.mobile),
  phone: optionalText(data.phone),
  email: optionalText(data.email),
  gstin: optionalText(data.gstin),
  addressLine1: optionalText(data.addressLine1),
  addressLine2: optionalText(data.addressLine2),
  city: optionalText(data.city),
  district: optionalText(data.district),
  state: optionalText(data.state),
  pinCode: optionalText(data.pinCode),
  country: optionalText(data.country),
  status: data.status ?? "ACTIVE",
  customerType: data.customerType ?? "CUSTOMER",
});

const normalizeCustomerUpdate = (data: {
  ledgerName?: string;
  contactPerson?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  status?: "ACTIVE" | "INACTIVE";
  customerType?: CustomerTypeValue;
}) => {
  const update: Record<string, unknown> = {};
  const textFields = [
    "ledgerName",
    "contactPerson",
    "mobile",
    "phone",
    "email",
    "gstin",
    "addressLine1",
    "addressLine2",
    "city",
    "district",
    "state",
    "pinCode",
    "country",
  ] as const;

  for (const field of textFields) {
    if (data[field] !== undefined) {
      update[field] = field === "ledgerName" ? data[field]?.trim() ?? "" : optionalText(data[field]);
    }
  }

  if (data.status !== undefined) update.status = data.status;
  if (data.customerType !== undefined) update.customerType = data.customerType;

  return update;
};

export async function listCustomers({
  search,
  status = "ACTIVE",
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  page?: number;
  pageSize?: number;
}) {
  const take = Math.min(Math.max(pageSize, 1), 500);
  const skip = (Math.max(page, 1) - 1) * take;
  const where = {
    ...(status !== "ALL" ? { status } : {}),
    ...(search?.trim()
      ? {
          OR: [
            { ledgerName: { contains: search.trim() } },
            { contactPerson: { contains: search.trim() } },
            { mobile: { contains: search.trim() } },
            { email: { contains: search.trim() } },
            { gstin: { contains: search.trim() } },
            { city: { contains: search.trim() } },
            { state: { contains: search.trim() } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { ledgerName: "asc" },
      skip,
      take,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    rows: rows.map((row) => serializeCustomer(row as unknown as Record<string, unknown>)!),
    total,
    page,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function getCustomer(id: number) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  return serializeCustomer(customer as unknown as Record<string, unknown> | null);
}

export async function createCustomer(data: {
  ledgerName: string;
  contactPerson?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  status?: "ACTIVE" | "INACTIVE";
  customerType?: CustomerTypeValue;
}) {
  const created = await prisma.customer.create({ data: normalizeCustomerInput(data) });
  return serializeCustomer(created as unknown as Record<string, unknown>)!;
}

export async function updateCustomer(
  id: number,
  data: {
    ledgerName?: string;
    contactPerson?: string;
    mobile?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    district?: string;
    state?: string;
    pinCode?: string;
    country?: string;
    status?: "ACTIVE" | "INACTIVE";
    customerType?: CustomerTypeValue;
  },
) {
  const updated = await prisma.customer.update({
    where: { id },
    data: normalizeCustomerUpdate(data),
  });
  return serializeCustomer(updated as unknown as Record<string, unknown>)!;
}

export async function deleteCustomer(id: number) {
  const updated = await prisma.customer.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  return serializeCustomer(updated as unknown as Record<string, unknown>)!;
}

export async function restoreCustomer(id: number) {
  const updated = await prisma.customer.update({
    where: { id },
    data: { status: "ACTIVE" },
  });
  return serializeCustomer(updated as unknown as Record<string, unknown>)!;
}

export async function deleteCustomerForever(id: number) {
  const customer = await prisma.customer.findUnique({ where: { id } });

  if (!customer) throw new Error("Customer not found.");
  if (customer.status !== "INACTIVE") {
    throw new Error("Only inactive customers can be permanently deleted.");
  }

  const deleted = await prisma.customer.delete({ where: { id } });
  return serializeCustomer(deleted as unknown as Record<string, unknown>)!;
}
