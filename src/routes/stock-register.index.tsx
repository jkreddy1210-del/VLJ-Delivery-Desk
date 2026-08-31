import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/stock-register/")({
  component: StockRegisterPage,
});

type ProductInventory = {
  id: number;
  productId: number;
  totalQtyInHand: number;
  lastMovement: string | null;
  product: {
    id: number;
    productName: string;
    productCode: string;
    unit: string;
  };
};

type StockLedgerEntry = {
  id: number;
  transactionType: "SEND" | "RECEIVE";
  quantity: number;
  runningBalance: number;
  createdAt: string;
  challanNumber: string;
  product: {
    productName: string;
    productCode: string;
    unit: string;
  };
  customer: {
    ledgerName: string;
  };
};

function StockRegisterPage() {
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ["stock-register", "inventory"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/all");
      if (!response.ok) throw new Error("Failed to fetch inventory");
      return response.json() as Promise<ProductInventory[]>;
    },
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["stock-register", "ledger"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/ledger");
      if (!response.ok) throw new Error("Failed to fetch ledger");
      return response.json() as Promise<StockLedgerEntry[]>;
    },
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <PageHeader
        title="Stock Register"
        description="Track inventory movements and current stock levels"
      />

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="ledger">Movement History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Inventory Status</CardTitle>
              <CardDescription>
                Current stock levels for all products. Negative values indicate stock deficit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !inventoryData || inventoryData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory data available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Code</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-right">Quantity In Hand</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-xs">Last Movement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryData.map((item) => {
                        const qty = Number(item.totalQtyInHand);
                        const isNegative = qty < 0;
                        const isLow = qty > 0 && qty < 10;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">
                              {item.product.productCode}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.product.productName}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {qty.toFixed(3)}
                            </TableCell>
                            <TableCell className="text-center">{item.product.unit}</TableCell>
                            <TableCell>
                              {isNegative ? (
                                <Badge variant="destructive">Deficit: {qty.toFixed(3)}</Badge>
                              ) : isLow ? (
                                <Badge variant="secondary">Low: {qty.toFixed(3)}</Badge>
                              ) : (
                                <Badge variant="outline">OK: {qty.toFixed(3)}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.lastMovement
                                ? new Date(item.lastMovement).toLocaleDateString()
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement Ledger</CardTitle>
              <CardDescription>
                Complete history of all stock movements (SEND = outgoing, RECEIVE = incoming)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !ledgerData || ledgerData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No movement history available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Challan No.</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Running Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerData.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {entry.challanNumber}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{entry.product.productName}</div>
                            <div className="text-xs text-muted-foreground">
                              {entry.product.productCode}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{entry.customer.ledgerName}</TableCell>
                          <TableCell>
                            <Badge
                              variant={entry.transactionType === "SEND" ? "destructive" : "default"}
                            >
                              {entry.transactionType === "SEND" ? "SEND ↓" : "RECEIVE ↑"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {entry.transactionType === "SEND" ? "-" : "+"}
                            {Number(entry.quantity).toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">
                            {Number(entry.runningBalance).toFixed(3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
