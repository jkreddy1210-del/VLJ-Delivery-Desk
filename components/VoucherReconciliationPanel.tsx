import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createChallanSettlementFn, deleteChallanSettlementFn, getCustomerReconciliationFn } from "@/routes/api/delivery-challans";
import { formatMoney } from "@/lib/money";

type Voucher = { id: number; challanNumber: string; direction: "INWARD" | "OUTWARD"; items?: Array<{ id: number; quantity: number; stockItem: { productName: string; productCode: string; unit: string } }> };
type OpenVoucher = {
  id: number;
  challanNumber: string;
  challanDate: string;
  direction: "INWARD" | "OUTWARD";
  deliveryType: "APPROVAL" | "JOB_WORK" | "MARKETING";
  movementReason: string;
  againstVoucherNo?: string | null;
  totalOutstandingQuantity: number;
  items: Array<{ itemId: number; product: { productName: string; productCode: string; unit: string }; originalQuantity: number; clearedQuantity: number; outstandingQuantity: number; originalAmount: number; settledAmount: number }>;
};
type Settlement = { id: number; documentType: string; documentNo: string; quantity: number; amount: number; challan: { challanNumber: string; direction: "INWARD" | "OUTWARD"; deliveryType: string }; challanItem: { stockItem: { productName: string } } };
type Reconciliation = { products: Array<{ product: { productName: string; productCode: string; unit: string }; outward: number; inward: number; invoiced: number; returned: number; balanceWithParty: number; pending: number }>; openVouchers: OpenVoucher[]; settlements: Settlement[] };

function settlementLabel(documentType: string, direction: "INWARD" | "OUTWARD") {
  if (documentType === "RETURN_DC") return "Return DC";
  if (documentType === "INVOICE") return direction === "INWARD" ? "Purchase Invoice" : "Tax Invoice";
  if (documentType === "CREDIT_NOTE") return "Credit Note";
  return "Debit Note";
}

function ageInDays(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
}

export function VoucherReconciliationPanel({ customerId, vouchers }: { customerId: number; vouchers: Voucher[] }) {
  const [data, setData] = useState<Reconciliation | null>(null);
  const [open, setOpen] = useState(false);
  const [challanId, setChallanId] = useState("");
  const [itemId, setItemId] = useState("");
  const [documentType, setDocumentType] = useState<"INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE" | "RETURN_DC">("INVOICE");
  const [documentNo, setDocumentNo] = useState("");
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    try {
      setData((await getCustomerReconciliationFn({ data: { customerId } })) as Reconciliation);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load reconciliation.");
    }
  };

  useEffect(() => { reload(); }, [customerId]);

  const selected = useMemo(() => data?.openVouchers.find((v) => String(v.id) === challanId), [data, challanId]);
  const selectedItem = useMemo(() => selected?.items.find((i) => String(i.itemId) === itemId), [selected, itemId]);

  useEffect(() => {
    setItemId("");
    setQuantity("");
  }, [challanId]);

  useEffect(() => {
    if (selectedItem) setQuantity(String(selectedItem.outstandingQuantity));
  }, [selectedItem?.itemId]);

  const openCount = data?.openVouchers.length ?? 0;
  const totalPending = data?.openVouchers.reduce((sum, voucher) => sum + voucher.totalOutstandingQuantity, 0) ?? 0;

  const save = async () => {
    if (!selected || !selectedItem || !documentNo.trim()) return toast.error("Select an open DC/item and enter the settlement document number.");
    const qty = Number(quantity || 0);
    if (["INVOICE", "RETURN_DC"].includes(documentType) && qty <= 0) return toast.error("Enter the quantity cleared by this document.");
    if (qty > selectedItem.outstandingQuantity) return toast.error(`Only ${selectedItem.outstandingQuantity} ${selectedItem.product.unit} remains open for this item.`);

    setSaving(true);
    try {
      await createChallanSettlementFn({ data: {
        challanId: selected.id,
        challanItemId: selectedItem.itemId,
        documentType,
        documentNo: documentNo.trim(),
        documentDate,
        quantity: qty,
        amount: Number(amount || 0),
      } });
      toast.success("DC clearance recorded.");
      setDocumentNo("");
      setQuantity("");
      setAmount("");
      setOpen(false);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record DC clearance.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="surface-panel rounded-xl border border-border p-5 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">DC Reconciliation</h2>
        <p className="text-sm text-muted-foreground">Track every original DC until the complete quantity is invoiced, purchased, or returned.</p>
      </div>
      <div className="flex items-center gap-2">
        {openCount > 0 ? <span className="rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs font-semibold text-destructive">{openCount} open · {totalPending} qty</span> : <span className="rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-xs font-semibold text-emerald-700">All DCs cleared</span>}
        <Button variant="outline" onClick={() => setOpen((v) => !v)}><Plus size={15} /> {open ? "Close" : "Clear DC"}</Button>
      </div>
    </div>

    {open ? <div className="rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Select value={challanId} onValueChange={setChallanId}><SelectTrigger><SelectValue placeholder="Open DC" /></SelectTrigger><SelectContent>
          {(data?.openVouchers ?? []).map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.challanNumber} · {v.direction} · {v.deliveryType.replace("_", " ")}</SelectItem>)}
        </SelectContent></Select>
        <Select value={itemId} onValueChange={setItemId} disabled={!selected}><SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger><SelectContent>
          {(selected?.items ?? []).map((i) => <SelectItem key={i.itemId} value={String(i.itemId)}>{i.product.productName} · {i.outstandingQuantity} {i.product.unit} open</SelectItem>)}
        </SelectContent></Select>
        <Select value={documentType} onValueChange={(v) => setDocumentType(v as typeof documentType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="INVOICE">{selected?.direction === "INWARD" ? "Purchase Invoice" : "Tax Invoice"}</SelectItem>
          <SelectItem value="RETURN_DC">Return DC</SelectItem>
          <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
          <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
        </SelectContent></Select>
        <Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} placeholder={documentType === "RETURN_DC" ? "Return DC No." : "Document No."} />
        <Input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" type="number" min="0" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Cleared quantity" disabled={!selectedItem || documentType === "CREDIT_NOTE" || documentType === "DEBIT_NOTE"} />
        <Input className="max-w-xs" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (optional)" />
        <Button onClick={save} disabled={saving || !selectedItem}>{saving ? "Saving..." : "Save Clearance"}</Button>
      </div>
      {selectedItem ? <p className="mt-3 text-xs text-muted-foreground">Original: {selectedItem.originalQuantity} {selectedItem.product.unit} · Cleared: {selectedItem.clearedQuantity} · Remaining: <span className="font-semibold text-foreground">{selectedItem.outstandingQuantity}</span></p> : null}
      {documentType === "RETURN_DC" ? <p className="mt-1 text-xs text-muted-foreground">Create the opposite-direction Return/Replacement DC first and enter that exact DC number here. The server verifies the link.</p> : null}
    </div> : null}

    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="bg-muted/50"><tr><th className="p-3 text-left">Original DC</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Direction</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Item</th><th className="p-3 text-right">Original</th><th className="p-3 text-right">Cleared</th><th className="p-3 text-right">Open</th><th className="p-3 text-right">Age</th></tr></thead>
        <tbody>
          {(data?.openVouchers ?? []).flatMap((voucher) => voucher.items.map((item) => ({ voucher, item }))).map(({ voucher, item }) => <tr key={`${voucher.id}-${item.itemId}`} className="border-t">
            <td className="p-3 font-medium">{voucher.challanNumber}</td>
            <td className="p-3 text-muted-foreground">{voucher.deliveryType.replace("_", " ")}</td>
            <td className="p-3">{voucher.direction === "INWARD" ? <span className="inline-flex items-center gap-1"><ArrowDownToLine size={14} /> Inward</span> : <span className="inline-flex items-center gap-1"><ArrowUpFromLine size={14} /> Outward</span>}</td>
            <td className="p-3 text-muted-foreground">{new Date(voucher.challanDate).toLocaleDateString()}</td>
            <td className="p-3"><div className="font-medium">{item.product.productName}</div><div className="text-xs text-muted-foreground">{item.product.productCode}</div></td>
            <td className="p-3 text-right">{item.originalQuantity}</td>
            <td className="p-3 text-right">{item.clearedQuantity}</td>
            <td className="p-3 text-right font-semibold text-destructive">{item.outstandingQuantity} {item.product.unit}</td>
            <td className="p-3 text-right text-muted-foreground">{ageInDays(voucher.challanDate)}d</td>
          </tr>)}
          {!data?.openVouchers.length ? <tr><td colSpan={9} className="p-6 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-2" size={20} />No open original DCs for this party.</td></tr> : null}
        </tbody>
      </table>
    </div>

    <div>
      <div className="mb-2 flex items-center gap-2"><h3 className="text-sm font-semibold">Clearance History</h3>{(data?.settlements.length ?? 0) > 0 ? <span className="text-xs text-muted-foreground">{data?.settlements.length} entries</span> : null}</div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Document</th><th className="p-3 text-left">Against DC</th><th className="p-3 text-left">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Amount</th><th /></tr></thead>
          <tbody>{(data?.settlements ?? []).map((s) => <tr key={s.id} className="border-t"><td className="p-3">{settlementLabel(s.documentType, s.challan.direction)} · <span className="font-medium">{s.documentNo}</span></td><td className="p-3">{s.challan.challanNumber}</td><td className="p-3">{s.challanItem.stockItem.productName}</td><td className="p-3 text-right">{s.quantity}</td><td className="p-3 text-right">₹ {formatMoney(s.amount)}</td><td className="p-3 text-right"><Button variant="ghost" size="sm" onClick={async () => { try { await deleteChallanSettlementFn({ data: { id: s.id } }); await reload(); toast.success("Clearance deleted."); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete clearance."); } }}><Trash2 size={14} /></Button></td></tr>)}{!data?.settlements.length ? <tr><td colSpan={6} className="p-5 text-center text-muted-foreground">No clearance entries recorded.</td></tr> : null}</tbody>
        </table>
      </div>
    </div>

    {openCount > 0 ? <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground"><AlertTriangle size={15} className="mt-0.5 shrink-0" />An open DC means some quantity is still unaccounted for. Do not mark it closed manually; clear the balance through the appropriate invoice/purchase invoice or opposite-direction return/replacement DC.</div> : null}
  </section>;
}
