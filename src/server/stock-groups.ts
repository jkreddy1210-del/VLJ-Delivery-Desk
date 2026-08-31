import { Prisma } from "@/generated/prisma/client.ts";
import { prisma } from "@/lib/prisma";
import { serializeDate } from "@/lib/serialize";

const normalizeStockGroupInput = (data: {
  groupName?: string;
  description?: string;
  parentGroupId?: number | null;
  status?: "ACTIVE" | "INACTIVE";
}) => ({
  groupName: data.groupName?.trim() ?? "",
  description: data.description?.trim() || undefined,
  parentGroupId: data.parentGroupId ?? null,
  status: data.status ?? "ACTIVE",
});

function isUniqueGroupNameError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const serializeStockGroup = (group: Record<string, unknown> | null) => {
  if (!group) return null;

  const parentGroup =
    group.parentGroup && typeof group.parentGroup === "object"
      ? (() => {
          const parent = group.parentGroup as Record<string, unknown>;
          return {
            id: Number(parent.id),
            groupName: String(parent.groupName ?? ""),
            description: (parent.description as string | null | undefined) ?? null,
            parentGroupId: (parent.parentGroupId as number | null | undefined) ?? null,
            status: parent.status as "ACTIVE" | "INACTIVE",
            createdAt: serializeDate(parent.createdAt),
            updatedAt: serializeDate(parent.updatedAt),
          };
        })()
      : null;

  return {
    id: Number(group.id),
    groupName: String(group.groupName ?? ""),
    description: (group.description as string | null | undefined) ?? null,
    parentGroupId: (group.parentGroupId as number | null | undefined) ?? null,
    status: group.status as "ACTIVE" | "INACTIVE",
    createdAt: serializeDate(group.createdAt),
    updatedAt: serializeDate(group.updatedAt),
    ...(group.parentGroup !== undefined ? { parentGroup } : {}),
  };
};

async function assertGroupNameAvailable(groupName: string, excludeId?: number) {
  const existing = await prisma.stockGroup.findFirst({
    where: {
      groupName,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, status: true },
  });

  if (existing) {
    throw new Error(
      existing.status === "INACTIVE"
        ? `Stock group "${groupName}" already exists in Recycle Bin. Restore it or use a different name.`
        : `Stock group "${groupName}" already exists. Please use a different name.`,
    );
  }
}

export async function listStockGroups({
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
            {
              groupName: {
                contains: search.trim(),
              },
            },
            {
              description: {
                contains: search.trim(),
              },
            },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.stockGroup.findMany({
      where,
      include: {
        parentGroup: true,
      },
      orderBy: {
        groupName: "asc",
      },
      skip,
      take,
    }),
    prisma.stockGroup.count({ where }),
  ]);

  return {
    rows: rows.map((row) => serializeStockGroup(row as unknown as Record<string, unknown>)!),
    total,
    page,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function getStockGroup(id: number) {
  const group = await prisma.stockGroup.findUnique({
    where: { id },
  });
  return serializeStockGroup(group as unknown as Record<string, unknown> | null);
}

export async function getParentGroups() {
  const rows = await prisma.stockGroup.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      groupName: "asc",
    },
    select: {
      id: true,
      groupName: true,
    },
  });

  return rows.map((row) => ({
    id: Number(row.id),
    groupName: row.groupName,
  }));
}

export async function createStockGroup(data: {
  groupName: string;
  description?: string;
  parentGroupId?: number | null;
  status?: "ACTIVE" | "INACTIVE";
}) {
  const normalized = normalizeStockGroupInput(data);
  await assertGroupNameAvailable(normalized.groupName);

  try {
    const created = await prisma.stockGroup.create({
      data: normalized,
    });
    return serializeStockGroup(created as unknown as Record<string, unknown>);
  } catch (error) {
    if (isUniqueGroupNameError(error)) {
      throw new Error(
        `Stock group "${normalized.groupName}" already exists. Please use a different name.`,
      );
    }
    throw error;
  }
}

export async function updateStockGroup(
  id: number,
  data: {
    groupName?: string;
    description?: string;
    parentGroupId?: number | null;
    status?: "ACTIVE" | "INACTIVE";
  },
) {
  const normalized = normalizeStockGroupInput(data);
  await assertGroupNameAvailable(normalized.groupName, id);

  try {
    const updated = await prisma.stockGroup.update({
      where: { id },
      data: normalized,
    });
    return serializeStockGroup(updated as unknown as Record<string, unknown>);
  } catch (error) {
    if (isUniqueGroupNameError(error)) {
      throw new Error(
        `Stock group "${normalized.groupName}" already exists. Please use a different name.`,
      );
    }
    throw error;
  }
}

export async function deleteStockGroup(id: number) {
  const updated = await prisma.stockGroup.update({
    where: { id },
    data: {
      status: "INACTIVE",
    },
  });
  return serializeStockGroup(updated as unknown as Record<string, unknown>);
}

export async function restoreStockGroup(id: number) {
  const updated = await prisma.stockGroup.update({
    where: { id },
    data: {
      status: "ACTIVE",
    },
  });
  return serializeStockGroup(updated as unknown as Record<string, unknown>);
}

export async function deleteStockGroupForever(id: number) {
  const group = await prisma.stockGroup.findUnique({
    where: { id },
    select: {
      groupName: true,
      _count: {
        select: {
          stockItems: true,
          childGroups: true,
        },
      },
    },
  });

  if (!group) {
    throw new Error("Stock group not found.");
  }

  if (group._count.stockItems > 0) {
    throw new Error(
      `Cannot permanently delete "${group.groupName}" because ${group._count.stockItems} product(s) still use this group. Move or delete those products first.`,
    );
  }

  if (group._count.childGroups > 0) {
    throw new Error(
      `Cannot permanently delete "${group.groupName}" because it has ${group._count.childGroups} child group(s). Remove or reassign them first.`,
    );
  }

  try {
    const deleted = await prisma.stockGroup.delete({
      where: { id },
    });
    return serializeStockGroup(deleted as unknown as Record<string, unknown>);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new Error(
        `Cannot permanently delete "${group.groupName}" because it is still linked to products or child groups.`,
      );
    }
    throw error;
  }
}
