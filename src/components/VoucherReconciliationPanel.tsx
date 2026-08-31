import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createChallanSettlementFn, deleteChallanSettlementFn, getCustomerReconciliationFn } from "@/routes/api/delivery-challans";
import { formatMoney } from "@/lib/money";

type Voucher = { id: number; challanNumber: string; direction: "INWARD" | "OUTWARD"; items?: Array<{ id: number; quantity: number; stockItem: { productName: string; productCode: string; unit: string } }> };
type Reconciliation = { products: Array<{ product: { productName: string; productCode: string; unit: string }; outward: number; inward: number; invoiced: number; balanceWithParty: number; pending: number }>; settlements: Array<{ id: number; documentType: string; documentNo: string; quantity: number; amount: number; challan: { challanNumber: string }; challanItem: { stockItem: { productName: string } } }> };

export function VoucherReconciliationPanel({ customerId, vouchers }: { customerId: number; vouchers: Voucher[] }) {
  const [data, setData] = useState<Reconciliation | null>(null);
  const [open, setOpen] = useState(false);
  const [challanId, setChallanId] = useState("");
  const [itemId, setItemId] = useState("");
  const [documentType, setDocumentType] = useState<"INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE">("INVOICE");
  const [documentNo, setDocumentNo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const outward = useMemo(() => vouchers.filter((v) => v.direction === "OUTWARD"), [vouchers]);
  const selected = outward.find((v) => String(v.id) === challanId);

  const reload = async () => { try { setData((await getCustomerReconciliationFn({ data: { customerId } })) as Reconciliation); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load reconciliation."); } };
  useEffect(() => { reload(); }, [customerId]);
  useEffect(() => { setItemId(""); }, [challanId]);

  const save = async () => {
    if (!selected || !itemId || !documentNo.trim()) return toast.error("Select an outward voucher/item and enter document number.");
    setSaving(true);
    try {
      await createChallanSettlementFn({ data: { challanId: selected.id, challanItemId: Number(itemId), documentType, documentNo: documentNo.trim(), quantity: Number(quantity || 0), amount: Number(amount || 0) } });
      toast.success("Settlement recorded."); setDocumentNo(""); setQuantity(""); setAmount(""); setOpen(false); await reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to record settlement."); } finally { setSaving(false); }
  };

  return <section className="surface-panel rounded-xl border border-border p-5 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Stock Reconciliation</h2><p className="text-sm text-muted-foreground">Outward stock, returns and commercial settlements are tracked separately.</p></div><Button variant="outline" onClick={() => setOpen((v) => !v)}><Plus size={15} /> {open ? "Close" : "Record Invoice / Note"}</Button></div>
    {open ? <div className="rounded-lg border bg-muted/30 p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Select value={challanId} onValueChange={setChallanId}><SelectTrigger><SelectValue placeholder="Outward voucher" /></SelectTrigger><SelectContent>{outward.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.challanNumber}</SelectItem>)}</SelectContent></Select>
      <Select value={itemId} onValueChange={setItemId}><SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger><SelectContent>{(selected?.items ?? []).map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.stockItem.productName} · {i.quantity}</SelectItem>)}</SelectContent></Select>
      <Select value={documentType} onValueChange={(v) => setDocumentType(v as typeof documentType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INVOICE">Tax Invoice</SelectItem><SelectItem value="CREDIT_NOTE">Credit Note</SelectItem><SelectItem value="DEBIT_NOTE">Debit Note</SelectItem></SelectContent></Select>
      <Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} placeholder="Document No." /><Input type="number" min="0" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" />
    </div><div className="mt-3 flex gap-3"><Input className="max-w-xs" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (optional)" /><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settlement"}</Button></div></div> : null}
    <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Product</th><th className="p-3 text-right">Outward</th><th className="p-3 text-right">Returned</th><th className="p-3 text-right">Invoiced</th><th className="p-3 text-right">With Party</th><th className="p-3 text-right">Pending</th></tr></thead><tbody>{(data?.products ?? []).map((p) => <tr key={p.product.productCode} className="border-t"><td className="p-3"><div className="font-medium">{p.product.productName}</div><div className="text-xs text-muted-foreground">{p.product.productCode} · {p.product.unit}</div></td><td className="p-3 text-right">{p.outward}</td><td className="p-3 text-right">{p.inward}</td><td className="p-3 text-right">{p.invoiced}</td><td className="p-3 text-right font-medium">{p.balanceWithParty}</td><td className="p-3 text-right font-semibold">{p.pending}</td></tr>)}{!data?.products.length ? <tr><td colSpan={6} className="p-5 text-center text-muted-foreground">No stock movement yet.</td></tr> : null}</tbody></table></div>
    <div><h3 className="mb-2 text-sm font-semibold">Commercial settlements</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Document</th><th className="p-3 text-left">Against</th><th className="p-3 text-left">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Amount</th><th /></tr></thead><tbody>{(data?.settlements ?? []).map((s) => <tr key={s.id} className="border-t"><td className="p-3">{s.documentType.replace("_", " ")} · <span className="font-medium">{s.documentNo}</span></td><td className="p-3">{s.challan.challanNumber}</td><td className="p-3">{s.challanItem.stockItem.productName}</td><td className="p-3 text-right">{s.quantity}</td><td className="p-3 text-right">₹ {formatMoney(s.amount)}</td><td className="p-3 text-right"><Button variant="ghost" size="sm" onClick={async () => { try { await deleteChallanSettlementFn({ data: { id: s.id } }); await reload(); toast.success("Settlement deleted."); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete settlement."); } }}><Trash2 size={14} /></Button></td></tr>)}{!data?.settlements.length ? <tr><td colSpan={6} className="p-5 text-center text-muted-foreground">No settlements recorded.</td></tr> : null}</tbody></table></div></div>
  </section>;
}
