import { Prisma } from "@/generated/prisma/client.ts";
import { prisma } from "@/lib/prisma";
import { serializeDate } from "@/lib/serialize";

const serializeStockGroup = (group: Record<string, unknown> | null | undefined) => {
  if (!group) return null;
  return {
    id: Number(group.id),
    groupName: String(group.groupName ?? ""),
    description: (group.description as string | null | undefined) ?? null,
    parentGroupId: (group.parentGroupId as number | null | undefined) ?? null,
    status: group.status as "ACTIVE" | "INACTIVE",
    createdAt: serializeDate(group.createdAt),
    updatedAt: serializeDate(group.updatedAt),
  };
};

const serializeProduct = (product: Record<string, unknown> | null) => {
  if (!product) return null;
  return {
    id: Number(product.id),
    productCode: String(product.productCode ?? ""),
    productName: String(product.productName ?? ""),
    hsnCode: (product.hsnCode as string | null | undefined) ?? null,
    unit: String(product.unit ?? ""),
    description: (product.description as string | null | undefined) ?? null,
    status: product.status as "ACTIVE" | "INACTIVE",
    stockGroupId: Number(product.stockGroupId),
    createdAt: serializeDate(product.createdAt),
    updatedAt: serializeDate(product.updatedAt),
    stockGroup: serializeStockGroup(
      product.stockGroup as Record<string, unknown> | null | undefined,
    ),
  };
};

const normalizeProductInput = (data: {
  productCode?: string;
  productName?: string;
  hsnCode?: string;
  unit?: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
  stockGroupId?: number;
}) => ({
  productCode: data.productCode?.trim() ?? "",
  productName: data.productName?.trim() ?? "",
  hsnCode: data.hsnCode?.trim() || undefined,
  unit: data.unit?.trim() || "",
  description: data.description?.trim() || undefined,
  status: data.status ?? "ACTIVE",
  ...(data.stockGroupId !== undefined ? { stockGroupId: data.stockGroupId } : {}),
});

export async function listProducts({
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
            { productCode: { contains: search.trim() } },
            { productName: { contains: search.trim() } },
            { hsnCode: { contains: search.trim() } },
            { unit: { contains: search.trim() } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      orderBy: { productName: "asc" },
      skip,
      take,
      include: {
        stockGroup: true,
      },
    }),
    prisma.stockItem.count({ where }),
  ]);

  return {
    rows: rows.map((row) => serializeProduct(row as unknown as Record<string, unknown>)!),
    total,
    page,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function getProduct(id: number) {
  const product = await prisma.stockItem.findUnique({
    where: { id },
    include: { stockGroup: true },
  });
  return serializeProduct(product as unknown as Record<string, unknown> | null);
}

export async function createProduct(data: {
  productCode: string;
  productName: string;
  hsnCode?: string;
  unit: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
  stockGroupId: number;
}) {
  const normalized = normalizeProductInput(data);

  // ensure product code is available (handle inactive duplicates clearly)
  const existing = await prisma.stockItem.findFirst({
    where: { productCode: normalized.productCode },
    select: { id: true, status: true },
  });

  if (existing) {
    throw new Error(
      existing.status === "INACTIVE"
        ? `Product code "${normalized.productCode}" already exists in Recycle Bin. Restore it or use a different code.`
        : `Product code "${normalized.productCode}" already exists. Please use a different code.`,
    );
  }

  try {
    const created = await prisma.stockItem.create({
      data: {
        ...normalized,
        stockGroupId: data.stockGroupId,
      },
    });
    return serializeProduct(created as unknown as Record<string, unknown>)!;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(
        `Product code "${normalized.productCode}" already exists. Please use a different code.`,
      );
    }
    throw error;
  }
}

export async function updateProduct(
  id: number,
  data: {
    productCode?: string;
    productName?: string;
    hsnCode?: string;
    unit?: string;
    description?: string;
    status?: "ACTIVE" | "INACTIVE";
    stockGroupId?: number;
  },
) {
  const normalized = normalizeProductInput(data);

  // check for existing product code on other records
  if (normalized.productCode) {
    const existing = await prisma.stockItem.findFirst({
      where: { productCode: normalized.productCode, id: { not: id } },
      select: { id: true, status: true },
    });

    if (existing) {
      throw new Error(
        existing.status === "INACTIVE"
          ? `Product code "${normalized.productCode}" already exists in Recycle Bin. Restore it or use a different code.`
          : `Product code "${normalized.productCode}" already exists. Please use a different code.`,
      );
    }
  }

  try {
    const updated = await prisma.stockItem.update({
      where: { id },
      data: normalized,
    });
    return serializeProduct(updated as unknown as Record<string, unknown>)!;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(
        `Product code "${normalized.productCode}" already exists. Please use a different code.`,
      );
    }
    throw error;
  }
}

export async function deleteProduct(id: number) {
  const updated = await prisma.stockItem.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  return serializeProduct(updated as unknown as Record<string, unknown>)!;
}

export async function restoreProduct(id: number) {
  const updated = await prisma.stockItem.update({
    where: { id },
    data: { status: "ACTIVE" },
  });
  return serializeProduct(updated as unknown as Record<string, unknown>)!;
}

export async function deleteProductForever(id: number) {
  const product = await prisma.stockItem.findUnique({
    where: { id },
    select: {
      productName: true,
      _count: {
        select: {
          challanItems: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  if (product._count.challanItems > 0) {
    throw new Error(
      `Cannot permanently delete "${product.productName}" because it is used on ${product._count.challanItems} challan line(s).`,
    );
  }

  const deleted = await prisma.stockItem.delete({
    where: { id },
  });
  return serializeProduct(deleted as unknown as Record<string, unknown>)!;
}
