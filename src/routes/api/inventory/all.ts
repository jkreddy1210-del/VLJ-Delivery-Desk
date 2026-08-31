import { createFileRoute } from "@tanstack/react-router";
import { getAllProductInventory } from "@/server/inventory";

export const Route = createFileRoute("/api/inventory/all")({
  beforeLoad: async () => {
    // This is called on the server
  },
});

// GET /api/inventory/all
export async function GET() {
  try {
    const inventory = await getAllProductInventory();
    
    // Serialize Decimal values to numbers
    const serialized = inventory.map(item => ({
      ...item,
      totalQtyInHand: Number(item.totalQtyInHand),
    }));

    return new Response(JSON.stringify(serialized), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch inventory" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
