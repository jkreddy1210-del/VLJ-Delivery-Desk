import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";

export const Route = createFileRoute("/api/inventory/ledger")({
  beforeLoad: async () => {
    // This is called on the server
  },
});

// GET /api/inventory/ledger
export async function GET() {
  try {
    const ledger = await prisma.stockLedger.findMany({
      include: {
        product: {
          select: {
            id: true,
            productName: true,
            productCode: true,
            unit: true,
          },
        },
        customer: {
          select: {
            id: true,
            ledgerName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500, // Limit to last 500 entries to avoid huge response
    });

    // Serialize Decimal values to numbers
    const serialized = ledger.map(entry => ({
      ...entry,
      quantity: Number(entry.quantity),
      runningBalance: Number(entry.runningBalance),
      createdAt: entry.createdAt.toISOString(),
    }));

    return new Response(JSON.stringify(serialized), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching ledger:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch ledger" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
