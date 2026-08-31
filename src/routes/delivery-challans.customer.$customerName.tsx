import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Printer, Search, Trash2 } from "lucide-react";
import { VoucherReconciliationPanel } from "@/components/VoucherReconciliationPanel";
import { formatMoney } from "@/lib/money";
import { DataTable } from "@/components/EmptyTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useDateFilter } from "@/hooks/useDateFilter";
import { listDeliveryChallansFn, deleteDeliveryChallanFn } from "@/routes/api/delivery-challans";
import { DELIVERY_TYPES, deliveryTypeLabel, type DeliveryTypeValue } from "@/lib/challan-number";

export const Route = createFileRoute("/delivery-challans/customer/$customerName")({
  head: ({ params }) => ({ meta: [{ title: `${params.customerName} Vouchers — VLJ Delivery Desk` }, { name: "description", content: `Existing delivery vouchers for ${params.customerName}.` }] }),
  component: CustomerDeliveryChallansPage,
});

type DeliveryChallanRow = {
  id: number; challanNumber: string; challanDate: string; deliveryType?: DeliveryTypeValue; status: "STOCK_SENT" | "STOCK_RECEIVED"; direction: "INWARD" | "OUTWARD";
  movementReason?: "ORIGINAL" | "RETURN" | "REPLACEMENT" | "OTHER"; againstVoucherNo?: string | null; invoiceNo?: string | null; noteType?: "CREDIT" | "DEBIT" | null; noteNo?: string | null;
  destination?: string | null; customer?: { id?: number | null; ledgerName?: string | null } | null; transporter?: { name?: string | null } | null;
  items?: Array<{ id?: number; quantity?: number | string; amount?: number | string; stockItem?: { id: number; productName: string; productCode: string; unit: string } }>;
};
function statusLabel(status: string) { return status === "STOCK_RECEIVED" ? "Stock Received" : "Stock Sent"; }

function CustomerDeliveryChallansPage() {
  const { customerName } = Route.useParams();
  const [status] = useState<"ALL" | "STOCK_SENT" | "STOCK_RECEIVED">("ALL");
  const [deliveryType, setDeliveryType] = useState<"ALL" | DeliveryTypeValue>("ALL");
  const { fromDate, toDate } = useDateFilter();
  const [search, setSearch] = useState(customerName ?? "");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [rows, setRows] = useState<DeliveryChallanRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 500;

  useEffect(() => { setSearch(customerName ?? ""); setPage(1); }, [customerName]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const result = await listDeliveryChallansFn({ data: { search, status, deliveryType, page, pageSize, fromDate, toDate } });
        if (!cancelled) { const payload = result as { rows: DeliveryChallanRow[]; total: number }; setRows(payload.rows); setTotal(payload.total); }
      } catch (error) { if (!cancelled) { setRows([]); setTotal(0); toast.error(error instanceof Error ? error.message : "Failed to load vouchers."); } }
      finally { if (!cancelled) setLoading(false); }
    };
    load().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, status, deliveryType, page, reloadKey, fromDate, toDate]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
  const totalQty = rows.reduce((sum, row) => sum + (row.items?.reduce((itemSum, item) => itemSum + Number(item.quantity ?? 0), 0) ?? 0), 0);
  const totalValue = rows.reduce((sum, row) => sum + (row.items?.reduce((itemSum, item) => itemSum + Number(item.amount ?? 0), 0) ?? 0), 0);
  const customerId = rows[0]?.customer?.id ? String(rows[0].customer.id) : "";
  const handleDeleteChallan = async (id: number) => { try { await deleteDeliveryChallanFn({ data: { id } }); setReloadKey((k) => k + 1); toast.success("Voucher deleted successfully."); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to delete voucher."); } };

  return <div className="space-y-6">
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-muted-foreground">Customer</p><h1 className="text-3xl font-semibold text-foreground">{customerName}</h1><p className="mt-1 text-sm text-muted-foreground">{rows.length} voucher{rows.length === 1 ? "" : "s"}{totalQty > 0 ? ` · ${totalQty} qty` : ""}{totalValue > 0 ? ` · ₹${formatMoney(totalValue)}` : ""}</p></div><div className="flex flex-wrap items-center gap-2"><Button asChild><Link to={`/delivery-challans/new${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ""}`}>Add Voucher</Link></Button><Button asChild variant="outline"><Link to="/delivery-challans">Back to vouchers</Link></Button></div></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search vouchers for this customer..." className="h-10 pl-9" /></div><Select value={deliveryType} onValueChange={(value) => { setDeliveryType(value as "ALL" | DeliveryTypeValue); setPage(1); }}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Delivery type" /></SelectTrigger><SelectContent><SelectItem value="ALL">All types</SelectItem>{DELIVERY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
    </div>

    {customerId ? <VoucherReconciliationPanel customerId={Number(customerId)} vouchers={rows.map((row) => ({ id: row.id, challanNumber: row.challanNumber, direction: row.direction, items: (row.items ?? []).filter((item) => item.stockItem && item.id).map((item) => ({ id: Number(item.id), quantity: Number(item.quantity ?? 0), stockItem: item.stockItem! })) }))} /> : null}

    <section className="surface-panel overflow-hidden rounded-xl border border-border"><DataTable columns={["Sl No.", "Voucher No", "Type", "Direction", "Date", "Total", "Status", "Dispatched through", "Actions"]}>{loading ? <tr><td colSpan={9} className="px-5 py-6 text-sm text-muted-foreground">Loading vouchers...</td></tr> : rows.length === 0 ? <tr><td colSpan={9} className="px-5 py-6 text-sm text-muted-foreground">No vouchers found for this customer.</td></tr> : rows.map((challan, index) => <tr key={challan.id} className="border-b border-border last:border-0"><td className="px-5 py-3 text-muted-foreground">{index + 1}</td><td className="px-5 py-3 font-medium text-foreground">{challan.challanNumber}</td><td className="px-5 py-3 text-muted-foreground">{deliveryTypeLabel(challan.deliveryType)}</td><td className="px-5 py-3 font-medium">{challan.direction === "INWARD" ? "INWARD · Received" : "OUTWARD · Sent"}</td><td className="px-5 py-3 text-muted-foreground">{new Date(challan.challanDate).toLocaleDateString()}</td><td className="px-5 py-3 text-right text-muted-foreground">₹ {formatMoney((challan.items ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0))}</td><td className="px-5 py-3 text-muted-foreground">{statusLabel(challan.status)}</td><td className="px-5 py-3 text-muted-foreground">{challan.transporter?.name ?? ""}</td><td className="px-5 py-3"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" asChild><Link to="/delivery-challans/edit/$id" params={{ id: String(challan.id) }} search={{ returnTo: `/delivery-challans/customer/${encodeURIComponent(customerName)}` }}><Pencil size={14} />Edit</Link></Button><Button variant="outline" size="sm" asChild><Link to="/delivery-challans/print/$id" params={{ id: String(challan.id) }} search={{ returnTo: `/delivery-challans/customer/${encodeURIComponent(customerName)}` }}><Printer size={14} />Print</Link></Button><ConfirmDialog trigger={<Button variant="ghost" size="sm"><Trash2 size={14} />Delete</Button>} title="Delete Voucher" description={`Delete voucher "${challan.challanNumber}" permanently?`} confirmText="Delete" cancelText="Cancel" onConfirm={() => handleDeleteChallan(challan.id)} /></div></td></tr>)}</DataTable></section>
    {totalPages > 1 ? <div className="flex items-center justify-between px-1 text-sm text-muted-foreground"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div> : null}
  </div>;
}
