import { createFileRoute } from "@tanstack/react-router";
import { getProductInventory } from "@/server/inventory";

export const Route = createFileRoute("/api/inventory/product/$productId")({
  beforeLoad: async () => {
    // This is called on the server
  },
});

// GET /api/inventory/product/:productId
export async function GET({ params }: { params: { productId: string } }) {
  try {
    const productId = parseInt(params.productId);
    
    if (!productId || isNaN(productId)) {
      return new Response(
        JSON.stringify({ error: "Invalid productId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const inventory = await getProductInventory(productId);

    return new Response(JSON.stringify({
      productId: inventory.productId,
      totalQtyInHand: Number(inventory.totalQtyInHand),
      companyId: inventory.companyId,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching product inventory:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch inventory" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
