import { prisma } from "@/lib/prisma";
import { serializeDate } from "@/lib/serialize";

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber?: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
};

const today = new Date();

export async function getDashboardStats({
  fromDate,
  toDate,
}: {
  fromDate?: string;
  toDate?: string;
} = {}) {
  const challanWhere: { challanDate?: { gte?: Date; lte?: Date } } = {};

  if (fromDate || toDate) {
    const range: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      range.gte = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    challanWhere.challanDate = range;
  }

  const [customers, products, challans] = await Promise.all([
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.stockItem.count({ where: { status: "ACTIVE" } }),
    prisma.deliveryChallan.count({
      where: challanWhere,
    }),
  ]);

  return {
    customers,
    products,
    challans,
    xmlImports: 0,
  };
}

export async function listPendingRegister({
  search,
  fromDate,
  toDate,
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const take = Math.min(Math.max(pageSize, 1), 500);
  const skip = (Math.max(page, 1) - 1) * take;
  const searchTerm = search?.trim();

  const challanDate: { gte?: Date; lte?: Date } = {};
  if (fromDate) {
    challanDate.gte = new Date(fromDate);
  }
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    challanDate.lte = end;
  }

  const where = {
    challan: {
      status: "STOCK_SENT" as const,
      ...(fromDate || toDate ? { challanDate } : {}),
    },
    ...(searchTerm
      ? {
          OR: [
            { challan: { challanNumber: { contains: searchTerm } } },
            { challan: { customer: { ledgerName: { contains: searchTerm } } } },
            { stockItem: { productName: { contains: searchTerm } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.deliveryChallanItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        challan: {
          include: {
            customer: true,
          },
        },
        stockItem: true,
      },
    }),
    prisma.deliveryChallanItem.count({ where }),
  ]);

  const mappedRows = rows.map((row) => ({
    id: row.id,
    challanNumber: row.challan.challanNumber,
    date: serializeDate(row.challan.challanDate),
    customer: row.challan.customer.ledgerName,
    item: row.stockItem.productName,
    pendingQty: toNumber(row.quantity),
    days: Math.max(
      0,
      Math.floor((today.getTime() - new Date(row.challan.challanDate).getTime()) / 86400000),
    ),
  }));

  return {
    rows: mappedRows,
    total,
    page,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function listStockWithParty({
  search,
  fromDate,
  toDate,
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const searchTerm = search?.trim();
  const challanDate: { gte?: Date; lte?: Date } = {};
  if (fromDate) {
    challanDate.gte = new Date(fromDate);
  }
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    challanDate.lte = end;
  }

  const allRows = await prisma.deliveryChallanItem.findMany({
    where: {
      challan: {
        status: "STOCK_SENT",
        ...(fromDate || toDate ? { challanDate } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      challan: {
        include: {
          customer: true,
        },
      },
      stockItem: true,
    },
  });

  const filtered = allRows.filter((row) => {
    if (!searchTerm) return true;
    const haystack = [
      row.challan.customer?.ledgerName,
      row.stockItem.productName,
      row.challan.challanNumber,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchTerm.toLowerCase());
  });

  const grouped = new Map<
    string,
    {
      customer: string;
      voucherCount: number;
      challanIds: Set<number>;
    }
  >();

  for (const row of filtered) {
    const customerName = row.challan.customer?.ledgerName ?? "Unknown";
    const challanId = row.challan.id;
    const entry = grouped.get(customerName);

    if (!entry) {
      grouped.set(customerName, {
        customer: customerName,
        voucherCount: 1,
        challanIds: new Set([challanId]),
      });
      continue;
    }

    if (!entry.challanIds.has(challanId)) {
      entry.challanIds.add(challanId);
      entry.voucherCount += 1;
    }
  }

  const rows = Array.from(grouped.values())
    .map(({ customer, voucherCount }) => ({ customer, voucherCount }))
    .sort((a, b) => a.customer.localeCompare(b.customer));
  const take = Math.min(Math.max(pageSize, 1), 500);
  const skip = (Math.max(page, 1) - 1) * take;
  const pagedRows = rows.slice(skip, skip + take);

  return {
    rows: pagedRows,
    total: rows.length,
    page,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(rows.length / take)),
  };
}
