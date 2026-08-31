import { prisma } from "@/lib/prisma";
import { serializeDate } from "@/lib/serialize";

const serializeTransporter = (transporter: Record<string, unknown> | null) => {
  if (!transporter) return null;
  return {
    id: Number(transporter.id),
    name: String(transporter.name ?? ""),
    mobile: (transporter.mobile as string | null | undefined) ?? null,
    gstin: (transporter.gstin as string | null | undefined) ?? null,
    vehicleNumber: (transporter.vehicleNumber as string | null | undefined) ?? null,
    address: (transporter.address as string | null | undefined) ?? null,
    status: transporter.status as "ACTIVE" | "INACTIVE",
    createdAt: serializeDate(transporter.createdAt),
    updatedAt: serializeDate(transporter.updatedAt),
  };
};

const normalizeTransporterInput = (data: {
  name?: string;
  mobile?: string;
  gstin?: string;
  vehicleNumber?: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE";
}) => ({
  name: data.name?.trim() ?? "",
  mobile: data.mobile?.trim() || undefined,
  gstin: data.gstin?.trim() || undefined,
  vehicleNumber: data.vehicleNumber?.trim() || undefined,
  address: data.address?.trim() || undefined,
  status: data.status ?? "ACTIVE",
});

export async function listTransporters({
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
            { name: { contains: search.trim() } },
            { mobile: { contains: search.trim() } },
            { gstin: { contains: search.trim() } },
            { vehicleNumber: { contains: search.trim() } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.transporter.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.transporter.count({ where }),
  ]);

  return {
    rows: rows.map((row) => serializeTransporter(row as unknown as Record<string, unknown>)!),
    total,
    page,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function getTransporter(id: number) {
  const transporter = await prisma.transporter.findUnique({ where: { id } });
  return serializeTransporter(transporter as unknown as Record<string, unknown> | null);
}

export async function createTransporter(data: {
  name: string;
  mobile?: string;
  gstin?: string;
  vehicleNumber?: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE";
}) {
  const created = await prisma.transporter.create({ data: normalizeTransporterInput(data) });
  return serializeTransporter(created as unknown as Record<string, unknown>)!;
}

export async function updateTransporter(
  id: number,
  data: {
    name?: string;
    mobile?: string;
    gstin?: string;
    vehicleNumber?: string;
    address?: string;
    status?: "ACTIVE" | "INACTIVE";
  },
) {
  const updated = await prisma.transporter.update({
    where: { id },
    data: normalizeTransporterInput(data),
  });
  return serializeTransporter(updated as unknown as Record<string, unknown>)!;
}

export async function deleteTransporter(id: number) {
  const updated = await prisma.transporter.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  return serializeTransporter(updated as unknown as Record<string, unknown>)!;
}

export async function restoreTransporter(id: number) {
  const updated = await prisma.transporter.update({
    where: { id },
    data: { status: "ACTIVE" },
  });
  return serializeTransporter(updated as unknown as Record<string, unknown>)!;
}

export async function deleteTransporterForever(id: number) {
  const transporter = await prisma.transporter.findUnique({
    where: { id },
    select: {
      name: true,
      _count: {
        select: {
          deliveryChallans: true,
        },
      },
    },
  });

  if (!transporter) {
    throw new Error("Transporter not found.");
  }

  if (transporter._count.deliveryChallans > 0) {
    throw new Error(
      `Cannot permanently delete "${transporter.name}" because it is used on ${transporter._count.deliveryChallans} challan(s).`,
    );
  }

  const deleted = await prisma.transporter.delete({
    where: { id },
  });
  return serializeTransporter(deleted as unknown as Record<string, unknown>)!;
}
