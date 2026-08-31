import { prisma } from "@/lib/prisma";
import { serializeDate } from "@/lib/serialize";

export type LogisticsSummaryRow = {
  id: string;
  date?: string;
  docketNo?: string;
  customer?: string;
  from?: string;
  to?: string;
  grossWeight?: string;
  freightCharges?: string;
  secureHandling?: string;
  enhancedLiability?: string;
  fuelSurcharge?: string;
  totalTaxable?: string;
  gst?: string;
  totalInvoice?: string;
  invoiceRecDate?: string;
  paymentDate?: string;
  paid?: boolean;
};

const toNumber = (value: string | number | undefined): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.toString().replace(/,/g, "")) || 0;
  return 0;
};

const parseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

export async function saveLogisticsSummary({
  transporterId,
  rows,
  amountPaid,
}: {
  transporterId?: string;
  rows: LogisticsSummaryRow[];
  amountPaid?: string;
}) {
  const transId = transporterId ? parseInt(transporterId) : null;

  try {
    // Delete existing summary for this transporter if it exists
    if (transId) {
      await prisma.logisticsSummary.deleteMany({
        where: { transporterId: transId },
      });
    }

    // Create new summary
    const summary = await prisma.logisticsSummary.create({
      data: {
        transporterId: transId,
        items: {
          create: rows.map((row) => ({
            date: parseDate(row.date),
            docketNo: row.docketNo || null,
            customerId: row.customer ? parseInt(row.customer) : null,
            from: row.from || null,
            to: row.to || null,
            grossWeight: toNumber(row.grossWeight),
            freightCharges: toNumber(row.freightCharges),
            secureHandling: toNumber(row.secureHandling),
            enhancedLiability: toNumber(row.enhancedLiability),
            fuelSurcharge: toNumber(row.fuelSurcharge),
            totalTaxable: toNumber(row.totalTaxable),
            gst: toNumber(row.gst),
            totalInvoice: toNumber(row.totalInvoice),
            invoiceRecDate: parseDate(row.invoiceRecDate),
            paymentDate: parseDate(row.paymentDate),
            paid: row.paid || false,
          })),
        },
      },
      include: { items: true },
    });

    // Save amount paid if transporter selected
    if (transId) {
      await prisma.logisticsSummaryAgg.upsert({
        where: { transporterId: transId },
        create: {
          transporterId: transId,
          amountPaid: toNumber(amountPaid),
        },
        update: {
          amountPaid: toNumber(amountPaid),
        },
      });
    }

    return {
      success: true,
      summaryId: summary.id,
      message: "Logistics summary saved successfully",
    };
  } catch (error) {
    console.error("Error saving logistics summary:", error);
    throw new Error("Failed to save logistics summary");
  }
}

export async function getLogisticsSummary(transporterId?: string) {
  try {
    if (!transporterId) {
      return {
        rows: [],
        amountPaid: "0",
      };
    }

    const transId = parseInt(transporterId);
    const summaries = await prisma.logisticsSummary.findMany({
      where: { transporterId: transId },
      include: { items: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (summaries.length === 0) {
      return {
        rows: [],
        amountPaid: "0",
      };
    }

    const summary = summaries[0];
    const agg = await prisma.logisticsSummaryAgg.findUnique({
      where: { transporterId: transId },
    });

    const rows = summary.items.map((item) => ({
      id: `item-${item.id}`,
      date: item.date ? item.date.toISOString().split("T")[0] : undefined,
      docketNo: item.docketNo || undefined,
      customer: item.customerId?.toString(),
      from: item.from || undefined,
      to: item.to || undefined,
      grossWeight: item.grossWeight.toString(),
      freightCharges: item.freightCharges.toString(),
      secureHandling: item.secureHandling.toString(),
      enhancedLiability: item.enhancedLiability.toString(),
      fuelSurcharge: item.fuelSurcharge.toString(),
      totalTaxable: item.totalTaxable.toString(),
      gst: item.gst.toString(),
      totalInvoice: item.totalInvoice.toString(),
      invoiceRecDate: item.invoiceRecDate ? item.invoiceRecDate.toISOString().split("T")[0] : undefined,
      paymentDate: item.paymentDate ? item.paymentDate.toISOString().split("T")[0] : undefined,
      paid: item.paid,
    }));

    return {
      rows,
      amountPaid: agg?.amountPaid.toString() || "0",
    };
  } catch (error) {
    console.error("Error fetching logistics summary:", error);
    throw new Error("Failed to fetch logistics summary");
  }
}

export async function listLogisticsSummaries({
  page = 1,
  pageSize = 10,
}: {
  page?: number;
  pageSize?: number;
} = {}) {
  const take = Math.min(Math.max(pageSize, 1), 500);
  const skip = (Math.max(page, 1) - 1) * take;

  try {
    const [summaries, total] = await Promise.all([
      prisma.logisticsSummary.findMany({
        include: {
          transporter: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.logisticsSummary.count(),
    ]);

    return {
      rows: summaries.map((summary) => ({
        id: summary.id,
        transporterId: summary.transporterId,
        transporterName: summary.transporter?.name || "N/A",
        itemCount: summary.items.length,
        createdAt: serializeDate(summary.createdAt),
        updatedAt: serializeDate(summary.updatedAt),
      })),
      total,
      page,
      pageSize: take,
      pageCount: Math.ceil(total / take),
    };
  } catch (error) {
    console.error("Error listing logistics summaries:", error);
    throw new Error("Failed to list logistics summaries");
  }
}

export async function deleteLogisticsSummary(summaryId: number) {
  try {
    await prisma.logisticsSummary.delete({
      where: { id: summaryId },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting logistics summary:", error);
    throw new Error("Failed to delete logistics summary");
  }
}
