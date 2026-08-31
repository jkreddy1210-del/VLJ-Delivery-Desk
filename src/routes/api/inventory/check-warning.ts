import { createFileRoute } from "@tanstack/react-router";
import { checkInventoryWarning } from "@/server/inventory";
import { Decimal } from "@prisma/client/runtime/library";

export const Route = createFileRoute("/api/inventory/check-warning")({
  beforeLoad: async () => {
    // This is called on the server
  },
});

// POST /api/inventory/check-warning
// Body: { productId: number, quantity: number }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, quantity } = body;

    if (!productId || !quantity) {
      return new Response(
        JSON.stringify({ error: "productId and quantity are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const warning = await checkInventoryWarning(
      parseInt(productId),
      new Decimal(quantity)
    );

    return new Response(JSON.stringify({
      hasWarning: warning.hasWarning,
      currentLevel: Number(warning.currentLevel),
      wouldBeLevel: Number(warning.wouldBeLevel),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error checking inventory warning:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check inventory" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
