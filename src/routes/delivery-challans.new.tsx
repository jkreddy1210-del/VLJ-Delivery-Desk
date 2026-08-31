import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection, Field } from "@/components/FormSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDeliveryChallanFn } from "@/routes/api/delivery-challans";
import { listCustomersFn } from "@/routes/api/customers";
import { listProductsFn } from "@/routes/api/products";
import { listTransportersFn } from "@/routes/api/transporters";
import { MOVEMENT_REASONS, DELIVERY_TYPES, type DeliveryTypeValue, type MovementReasonValue } from "@/lib/challan-number";
import { createRowKey } from "@/lib/row-key";
import { formatMoney, toNumber } from "@/lib/money";

export const Route = createFileRoute("/delivery-challans/new")({
  head: () => ({ meta: [{ title: "New Voucher — VLJ Delivery Desk" }] }),
  component: NewChallan,
});

type Customer = { id: number; ledgerName: string; customerType?: "CUSTOMER" | "VENDOR"; gstin?: string | null; city?: string | null; state?: string | null; addressLine1?: string | null };
type Product = { id: number; productName: string; productCode: string; hsnCode?: string | null; unit: string };
type Row = { key: string; stockItemId: string; quantity: string; rate: string; amount: string; gstRate: string };

function NewChallan() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryCustomerId = new URLSearchParams(location.search).get("customerId") ?? "";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transporters, setTransporters] = useState<Array<{ id: number; name: string }>>([]);
  const [customerId, setCustomerId] = useState(queryCustomerId);
  const [transporterId, setTransporterId] = useState("none");
  const [challanNumber, setChallanNumber] = useState("");
  const [challanDate, setChallanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deliveryType, setDeliveryType] = useState<DeliveryTypeValue | "">("");
  const [direction, setDirection] = useState<"OUTWARD" | "INWARD">("OUTWARD");
  const [movementReason, setMovementReason] = useState<MovementReasonValue>("ORIGINAL");
  const [againstVoucherNo, setAgainstVoucherNo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [noteType, setNoteType] = useState<"NONE" | "CREDIT" | "DEBIT">("NONE");
  const [noteNo, setNoteNo] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [destination, setDestination] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<Row[]>([{ key: createRowKey(), stockItemId: "", quantity: "", rate: "", amount: "", gstRate: "3" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listCustomersFn({ data: { page: 1, pageSize: 500, status: "ACTIVE" } }),
      listProductsFn({ data: { page: 1, pageSize: 500, status: "ACTIVE" } }),
      listTransportersFn({ data: { page: 1, pageSize: 500, status: "ACTIVE" } }),
    ]).then(([c, p, t]) => { setCustomers(c.rows); setProducts(p.rows); setTransporters(t.rows); }).catch(() => setError("Failed to load masters."));
  }, []);

  const selectedCustomer = customers.find((c) => String(c.id) === customerId);
  useEffect(() => { if (selectedCustomer?.state) setPlaceOfSupply(selectedCustomer.state); if (selectedCustomer?.city) setDestination(selectedCustomer.city); }, [selectedCustomer?.id]);

  const taxableTotal = useMemo(() => items.reduce((sum, item) => sum + (item.amount ? toNumber(item.amount) : toNumber(item.quantity) * toNumber(item.rate)), 0), [items]);
  const taxTotal = useMemo(() => items.reduce((sum, item) => { const amount = item.amount ? toNumber(item.amount) : toNumber(item.quantity) * toNumber(item.rate); return sum + amount * toNumber(item.gstRate) / 100; }, 0), [items]);

  const updateItem = (key: string, patch: Partial<Row>) => setItems((rows) => rows.map((row) => {
    if (row.key !== key) return row;
    const next = { ...row, ...patch };
    if (patch.quantity !== undefined || patch.rate !== undefined) next.amount = String(Number((toNumber(next.quantity) * toNumber(next.rate)).toFixed(2)) || "");
    return next;
  }));

  async function save() {
    setError(null);
    if (!challanNumber.trim()) return setError("Enter voucher number.");
    if (!customerId) return setError("Select party.");
    if (!deliveryType) return setError("Select delivery type.");
    const validItems = items.filter((item) => item.stockItemId && toNumber(item.quantity) > 0);
    if (!validItems.length) return setError("Add at least one item with quantity.");
    setSaving(true);
    try {
      await createDeliveryChallanFn({ data: {
        challanNumber: challanNumber.trim(), challanDate, customerId: Number(customerId), transporterId: transporterId === "none" ? null : Number(transporterId), deliveryType, direction,
        movementReason, againstVoucherNo: againstVoucherNo || undefined, invoiceNo: invoiceNo || undefined, noteType: noteType === "NONE" ? null : noteType, noteNo: noteNo || undefined,
        placeOfSupply, destination, referenceNo, remarks,
        items: validItems.map((item) => ({ stockItemId: Number(item.stockItemId), quantity: toNumber(item.quantity), rate: toNumber(item.rate), amount: item.amount ? toNumber(item.amount) : undefined, gstRate: toNumber(item.gstRate) })),
      } });
      navigate({ to: "/delivery-challans" });
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save voucher."); } finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Operations · Vouchers" title="New Voucher" description="Record a physical stock movement. Direction is chosen for this voucher; party type is reference information only." />
    <FormSection title="Voucher" description="The movement direction controls the inventory ledger.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Voucher No." required><Input value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)} placeholder="VLJ/001/26-27-A" /></Field>
        <Field label="Date" required><Input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} /></Field>
        <Field label="Delivery Type" required><Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as DeliveryTypeValue)}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{DELIVERY_TYPES.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Stock Direction" required><Select value={direction} onValueChange={(v) => setDirection(v as "INWARD" | "OUTWARD")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OUTWARD">OUTWARD · Stock leaves VLJ</SelectItem><SelectItem value="INWARD">INWARD · Stock comes to VLJ</SelectItem></SelectContent></Select></Field>
      </div>
    </FormSection>
    <FormSection title="Party" description="The same party can be used for both inward and outward vouchers.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Customer / Party" required><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.ledgerName} · {c.customerType === "VENDOR" ? "Vendor" : "Customer"}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Transport / Dispatched Through"><Select value={transporterId} onValueChange={setTransporterId}><SelectTrigger><SelectValue placeholder="Select transporter" /></SelectTrigger><SelectContent><SelectItem value="none">None / By Hand</SelectItem>{transporters.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
        {selectedCustomer ? <div className="md:col-span-2 rounded-lg border bg-muted/40 p-4 text-sm"><div className="font-medium">{selectedCustomer.ledgerName}</div><div>{selectedCustomer.addressLine1 || "—"}</div><div>{[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(", ") || "—"}</div><div>GSTIN: {selectedCustomer.gstin || "—"}</div><div className="mt-1 font-medium">Voucher movement: {direction}</div></div> : null}
        <Field label="Place of Supply"><Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} /></Field>
        <Field label="Destination"><Input value={destination} onChange={(e) => setDestination(e.target.value)} /></Field>
      </div>
    </FormSection>
    <FormSection title="Movement Reference" description="Use these fields when this voucher is a return or follows an invoice.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Movement Reason"><Select value={movementReason} onValueChange={(v) => setMovementReason(v as MovementReasonValue)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MOVEMENT_REASONS.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Against Voucher No."><Input value={againstVoucherNo} onChange={(e) => setAgainstVoucherNo(e.target.value)} placeholder="Original DC / voucher" /></Field>
        <Field label="Invoice No."><Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></Field>
        <Field label="Credit / Debit Note"><div className="grid grid-cols-2 gap-2"><Select value={noteType} onValueChange={(v) => setNoteType(v as "NONE" | "CREDIT" | "DEBIT")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">None</SelectItem><SelectItem value="CREDIT">Credit</SelectItem><SelectItem value="DEBIT">Debit</SelectItem></SelectContent></Select><Input value={noteNo} onChange={(e) => setNoteNo(e.target.value)} disabled={noteType === "NONE"} placeholder="No." /></div></Field>
        <Field label="Reference No."><Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} /></Field>
      </div>
    </FormSection>
    <FormSection title="Description of Goods" description="Inventory is posted automatically when the voucher is saved.">
      <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/60"><tr><th className="p-3 text-left">Sl.</th><th className="p-3 text-left">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-left">Unit</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">GST %</th><th className="p-3 text-right">Amount</th><th /></tr></thead><tbody>{items.map((item, i) => { const product = products.find((p) => String(p.id) === item.stockItemId); return <tr key={item.key} className="border-t"><td className="p-3">{i + 1}</td><td className="p-3"><Select value={item.stockItemId} onValueChange={(v) => updateItem(item.key, { stockItemId: v })}><SelectTrigger className="min-w-[280px]"><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.productName} ({p.productCode})</SelectItem>)}</SelectContent></Select>{product?.hsnCode ? <div className="mt-1 text-xs text-muted-foreground">HSN {product.hsnCode}</div> : null}</td><td className="p-3"><Input className="w-24 text-right" type="number" min="0" step="0.001" value={item.quantity} onChange={(e) => updateItem(item.key, { quantity: e.target.value })} /></td><td className="p-3 text-muted-foreground">{product?.unit || "—"}</td><td className="p-3"><Input className="w-28 text-right" type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(item.key, { rate: e.target.value })} /></td><td className="p-3"><Input className="w-20 text-right" type="number" min="0" step="0.01" value={item.gstRate} onChange={(e) => updateItem(item.key, { gstRate: e.target.value })} /></td><td className="p-3"><Input className="w-32 text-right" type="number" min="0" step="0.01" value={item.amount} onChange={(e) => updateItem(item.key, { amount: e.target.value })} /></td><td className="p-3"><Button type="button" variant="ghost" disabled={items.length === 1} onClick={() => setItems((r) => r.filter((x) => x.key !== item.key))}><Trash2 size={15} /></Button></td></tr>})}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><Button type="button" variant="outline" onClick={() => setItems((r) => [...r, { key: createRowKey(), stockItemId: "", quantity: "", rate: "", amount: "", gstRate: "3" }])}><Plus size={15} /> Add row</Button><div className="rounded-lg border bg-muted/40 p-4 text-sm"><div className="flex justify-between gap-8"><span>Taxable</span><span>₹ {formatMoney(taxableTotal)}</span></div><div className="mt-1 flex justify-between gap-8"><span>GST</span><span>₹ {formatMoney(taxTotal)}</span></div><div className="mt-2 flex justify-between gap-8 border-t pt-2 font-semibold"><span>Total</span><span>₹ {formatMoney(taxableTotal + taxTotal)}</span></div></div></div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 flex gap-3"><Button type="button" variant="outline" asChild><Link to="/delivery-challans">Cancel</Link></Button><Button type="button" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Voucher"}</Button></div>
    </FormSection>
  </div>;
}
