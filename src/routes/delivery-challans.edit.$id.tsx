import { useEffect, useState } from "react";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection, Field } from "@/components/FormSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDeliveryChallanFn, updateDeliveryChallanFn } from "@/routes/api/delivery-challans";
import { listCustomersFn } from "@/routes/api/customers";
import { listProductsFn } from "@/routes/api/products";
import { listTransportersFn } from "@/routes/api/transporters";
import { getCompanySettingsFn } from "@/routes/api/company-settings";
import { formatMoney, toNumber } from "@/lib/money";
import { createRowKey } from "@/lib/row-key";
import { DELIVERY_TYPES, deliveryTypeLabel, type DeliveryTypeValue } from "@/lib/challan-number";

export const Route = createFileRoute("/delivery-challans/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Voucher — VLJ Delivery Desk" },
      { name: "description", content: "Update a delivery voucher." },
    ],
  }),
  component: EditChallan,
});

type LineItem = {
  key: string;
  stockItemId: string;
  quantity: string;
  rate: string;
  amount: string;
  gstRate: string;
  amountAuto?: boolean;
};

type CustomerOption = {
  id: number;
  ledgerName: string;
  gstin?: string | null;
  city?: string | null;
  state?: string | null;
  addressLine1?: string | null;
};

type ProductOption = {
  id: number;
  productName: string;
  productCode: string;
  hsnCode?: string | null;
  unit: string;
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function EditChallan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = Route.useParams();
  const challanId = Number(id);
  const returnTo = new URLSearchParams(location.search).get("returnTo") ?? "/delivery-challans";

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [transporters, setTransporters] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [transporterId, setTransporterId] = useState("none");
  const [status, setStatus] = useState<"STOCK_SENT" | "STOCK_RECEIVED">("STOCK_SENT");
  const [deliveryType, setDeliveryType] = useState<DeliveryTypeValue>("APPROVAL");
  const [challanNumber, setChallanNumber] = useState("");
  const [challanDate, setChallanDate] = useState("");
  const [roundoff, setRoundoff] = useState("0");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [buyerOrderNo, setBuyerOrderNo] = useState("");
  const [dispatchDocNo, setDispatchDocNo] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [otherReferences, setOtherReferences] = useState("");
  const [destination, setDestination] = useState("");
  const [termsOfDelivery, setTermsOfDelivery] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [challan, customerResult, transporterResult, productResult] = await Promise.all([
        getDeliveryChallanFn({ data: { id: challanId } }),
        listCustomersFn({
          data: { page: 1, pageSize: 100, status: "ALL" },
        }),
        listTransportersFn({
          data: { page: 1, pageSize: 100, status: "ALL" },
        }),
        listProductsFn({
          data: { page: 1, pageSize: 100, status: "ALL" },
        }),
      ]);

      if (cancelled) return;

      setCustomers(customerResult.rows);
      setTransporters(transporterResult.rows);
      setProducts(productResult.rows);

      if (!challan) {
        setError("Voucher not found");
        return;
      }

      const row = challan as {
        challanNumber: string;
        challanDate: string;
        roundoff?: number | string | null;
        deliveryType?: DeliveryTypeValue;
        status: "STOCK_SENT" | "STOCK_RECEIVED";
        placeOfSupply?: string | null;
        referenceNo?: string | null;
        referenceDate?: string | null;
        buyerOrderNo?: string | null;
        dispatchDocNo?: string | null;
        modeOfPayment?: string | null;
        otherReferences?: string | null;
        destination?: string | null;
        termsOfDelivery?: string | null;
        remarks?: string | null;
        customerId: number;
        transporterId?: number | null;
        items?: Array<{
          stockItemId: number;
          quantity: number;
          rate: number;
          gstRate?: number;
        }>;
      };

      setChallanNumber(row.challanNumber);
      setChallanDate(toDateInput(row.challanDate));
      setRoundoff(String(Number(row.roundoff ?? 0)));
      setDeliveryType(row.deliveryType ?? "APPROVAL");
      setStatus(row.status);
      setPlaceOfSupply(row.placeOfSupply ?? "");
      setReferenceNo(row.referenceNo ?? "");
      setReferenceDate(toDateInput(row.referenceDate));
      setBuyerOrderNo(row.buyerOrderNo ?? "");
      setDispatchDocNo(row.dispatchDocNo ?? "");
      setModeOfPayment(row.modeOfPayment ?? "");
      setOtherReferences(row.otherReferences ?? "");
      setDestination(row.destination ?? "");
      setTermsOfDelivery(row.termsOfDelivery ?? "");
      setRemarks(row.remarks ?? "");
      setCustomerId(String(row.customerId));
      setTransporterId(row.transporterId ? String(row.transporterId) : "none");
      setItems(
        (row.items ?? []).map((item) => ({
          key: createRowKey(),
          stockItemId: String(item.stockItemId),
          quantity: String(item.quantity),
          rate: String(item.rate),
          amount: String(item.amount ?? ""),
          gstRate: String(item.gstRate ?? 3),
          amountAuto: true,
        })),
      );
    };

    load()
      .catch(() => {
        if (!cancelled) setError("Failed to load voucher");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [challanId]);

  useEffect(() => {
    let cancelled = false;

    getCompanySettingsFn({ data: {} })
      .then((settings) => {
        if (cancelled) return;
        setCompanyState(settings?.state?.trim() ?? "");
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCustomer = customers.find((c) => String(c.id) === customerId);

  useEffect(() => {
    if (!customerId) return;
    if (!placeOfSupply && selectedCustomer?.state) {
      setPlaceOfSupply(selectedCustomer.state);
    }
  }, [customerId, selectedCustomer?.state, placeOfSupply]);

  const normalizeState = (value?: string | null) => value?.trim().toLowerCase() ?? "";

  const supplyState = normalizeState(placeOfSupply) || normalizeState(selectedCustomer?.state);
  const isInterState =
    companyState && supplyState ? normalizeState(companyState) !== supplyState : false;

  const taxableTotal = items.reduce((sum, item) => {
    const amount = item.amount
      ? toNumber(item.amount)
      : Number((toNumber(item.quantity) * toNumber(item.rate)).toFixed(2));
    return sum + amount;
  }, 0);

  const taxTotal = items.reduce((sum, item) => {
    const amount = item.amount
      ? toNumber(item.amount)
      : Number((toNumber(item.quantity) * toNumber(item.rate)).toFixed(2));
    return sum + (amount * toNumber(item.gstRate)) / 100;
  }, 0);

  const igstTotal = isInterState ? taxTotal : 0;
  const cgstTotal = isInterState ? 0 : taxTotal / 2;
  const sgstTotal = isInterState ? 0 : taxTotal / 2;
  const grandTotal = taxableTotal + taxTotal + toNumber(roundoff);

  const updateItem = (key: string, patch: Partial<LineItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;

        const nextItem = { ...item, ...patch };

        if (patch.amount !== undefined) {
          return {
            ...nextItem,
            amount: patch.amount,
            amountAuto: patch.amount === "" ? true : false,
          };
        }

        if ((patch.rate !== undefined || patch.quantity !== undefined) && item.amountAuto !== false) {
          const amount = Number(
            (toNumber(nextItem.quantity) * toNumber(nextItem.rate)).toFixed(2),
          );
          return {
            ...nextItem,
            amount: amount > 0 ? String(amount) : "",
            amountAuto: true,
          };
        }

        return nextItem;
      }),
    );
  };

  if (loading) {
    return (
      <PageHeader eyebrow="Operations · Vouchers" title="Edit Voucher" description="Loading..." />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations · Vouchers"
        title="Edit Voucher"
        description="Update voucher, party, despatch and goods."
      />

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!customerId) {
            setError("Select consignee / buyer (customer)");
            return;
          }

          const validItems = items.filter(
            (item) =>
              item.stockItemId &&
              Number(item.quantity) > 0 &&
              (Number(item.rate) > 0 || Number(item.amount) > 0),
          );

          if (validItems.length === 0) {
            setError("Add at least one valid line item");
            return;
          }

          if (!challanNumber.trim()) {
            setError("Enter voucher number");
            setSaving(false);
            return;
          }

          setSaving(true);
          setError(null);

          try {
            await updateDeliveryChallanFn({
              data: {
                id: challanId,
                data: {
                  challanNumber: challanNumber.trim(),
                  customerId: Number(customerId),
                  transporterId: transporterId === "none" ? null : Number(transporterId),
                  challanDate,
                  deliveryType,
                  roundoff: Number(roundoff),
                  placeOfSupply,
                  referenceNo,
                  referenceDate: referenceDate || null,
                  buyerOrderNo,
                  dispatchDocNo,
                  modeOfPayment,
                  otherReferences,
                  destination,
                  termsOfDelivery,
                  remarks,
                  status,
                  items: validItems.map((item) => {
                    const quantity = Number(item.quantity);
                    const rate = Number(item.rate || 0);
                    const amount = item.amount
                      ? Number(item.amount)
                      : Number((quantity * rate).toFixed(2));
                    return {
                      stockItemId: Number(item.stockItemId),
                      quantity,
                      rate,
                      amount,
                      gstRate: Number(item.gstRate || 3),
                    };
                  }),
                },
              },
            });
            navigate({ to: returnTo });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update voucher");
            setSaving(false);
          }
        }}
        className="space-y-6"
      >
        <FormSection title="Voucher" description="Number, type, date and status">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Voucher No" htmlFor="challanNo" required>
              <Input
                id="challanNo"
                name="challanNumber"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                className="font-medium"
              />
            </Field>
            <Field label="Delivery Type" required>
              <Select
                value={deliveryType}
                onValueChange={(value) => setDeliveryType(value as DeliveryTypeValue)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={deliveryTypeLabel(deliveryType)} />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} ({type.suffix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Dated" htmlFor="challanDate">
              <Input
                id="challanDate"
                type="date"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
              />
            </Field>
            <Field label="Status" required>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as "STOCK_SENT" | "STOCK_RECEIVED")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK_SENT">Stock Sent</SelectItem>
                  <SelectItem value="STOCK_RECEIVED">Stock Received</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Consignee / Buyer"
          description="Ship to & Bill to from Customers master"
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="Customer" required className="md:col-span-2">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.ledgerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {selectedCustomer ? (
              <div className="md:col-span-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{selectedCustomer.ledgerName}</p>
                <p>{selectedCustomer.addressLine1 || "—"}</p>
                <p>
                  {[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(", ") ||
                    "—"}
                </p>
                <p>GSTIN: {selectedCustomer.gstin || "—"}</p>
              </div>
            ) : null}
            <Field label="Place of Supply" htmlFor="placeOfSupply">
              <Input
                id="placeOfSupply"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
              />
            </Field>
            <Field label="Destination" htmlFor="destination">
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="References & Despatch"
          description="Order refs and how goods are dispatched"
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-3">
            <Field label="Reference No." htmlFor="referenceNo">
              <Input
                id="referenceNo"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
              />
            </Field>
            <Field label="Reference Date" htmlFor="referenceDate">
              <Input
                id="referenceDate"
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
              />
            </Field>
            <Field label="Buyer's Order No." htmlFor="buyerOrderNo">
              <Input
                id="buyerOrderNo"
                value={buyerOrderNo}
                onChange={(e) => setBuyerOrderNo(e.target.value)}
              />
            </Field>
            <Field label="Dispatch Doc No." htmlFor="dispatchDocNo">
              <Input
                id="dispatchDocNo"
                value={dispatchDocNo}
                onChange={(e) => setDispatchDocNo(e.target.value)}
              />
            </Field>
            <Field label="Dispatched through" className="md:col-span-2">
              <Select value={transporterId} onValueChange={setTransporterId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select transporter..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No transporter</SelectItem>
                  {transporters.map((transporter) => (
                    <SelectItem key={transporter.id} value={String(transporter.id)}>
                      {transporter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mode of Transport" htmlFor="modeOfPayment">
              <Select value={modeOfPayment} onValueChange={setModeOfPayment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select mode of transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BY AIR/ROAD">BY AIR/ROAD</SelectItem>
                  <SelectItem value="BY ROAD">BY ROAD</SelectItem>
                  <SelectItem value="BY AIR">BY AIR</SelectItem>
                  <SelectItem value="BY RAIL">BY RAIL</SelectItem>
                  <SelectItem value="BY SEA">BY SEA</SelectItem>
                  <SelectItem value="COURIER">COURIER</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Other References" htmlFor="otherReferences">
              <Input
                id="otherReferences"
                value={otherReferences}
                onChange={(e) => setOtherReferences(e.target.value)}
              />
            </Field>
            <Field label="Terms of Delivery" htmlFor="termsOfDelivery">
              <Input
                id="termsOfDelivery"
                value={termsOfDelivery}
                onChange={(e) => setTermsOfDelivery(e.target.value)}
                placeholder="e.g. Delivered, Prepaid, To Pay"
              />
            </Field>
            <Field label="Purpose of Movement" htmlFor="remarks" className="md:col-span-3">
              <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Description of Goods"
          description="Products from Stock Items master"
          footer={
            <>
              <Button variant="outline" type="button" asChild>
                <Link to={returnTo}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          }
        >
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[920px] text-sm md:text-base">
              <thead className="bg-muted/60">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-eyebrow text-muted-foreground">Sl No.</th>
                  <th className="px-4 py-3 text-left text-eyebrow text-muted-foreground">
                    Description of Goods
                  </th>
                  <th className="px-4 py-3 text-left text-eyebrow text-muted-foreground">HSN</th>
                  <th className="px-4 py-3 text-right text-eyebrow text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-left text-eyebrow text-muted-foreground">Unit</th>
                  <th className="px-4 py-3 text-right text-eyebrow text-muted-foreground">Rate</th>
                  <th className="px-4 py-3 text-right text-eyebrow text-muted-foreground">GST %</th>
                  <th className="px-4 py-3 text-right text-eyebrow text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const product = products.find((p) => String(p.id) === item.stockItemId);
                  const amount = toNumber(item.quantity) * toNumber(item.rate);
                  return (
                    <tr key={item.key} className="border-b border-border">
                      <td className="px-4 py-3 text-sm text-muted-foreground align-top">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Select
                          value={item.stockItemId}
                          onValueChange={(value) => updateItem(item.key, { stockItemId: value })}
                        >
                          <SelectTrigger className="w-full min-w-[280px] text-sm md:text-base">
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((productOption) => (
                              <SelectItem key={productOption.id} value={String(productOption.id)}>
                                {productOption.productName} ({productOption.productCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {product?.productCode ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Code: {product.productCode}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{product?.hsnCode ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          className="text-right min-w-[90px] text-sm md:text-base"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{product?.unit ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          className="text-right"
                          value={item.rate}
                          onChange={(e) => updateItem(item.key, { rate: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          className="text-right"
                          value={item.gstRate}
                          onChange={(e) => updateItem(item.key, { gstRate: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-right"
                          value={item.amount}
                          onChange={(e) => updateItem(item.key, { amount: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={items.length === 1}
                          onClick={() =>
                            setItems((current) => current.filter((row) => row.key !== item.key))
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                setItems((current) => [
                  ...current,
                  {
                    key: createRowKey(),
                    stockItemId: "",
                    quantity: "",
                    rate: "",
                    amount: "",
                    gstRate: "3",
                    amountAuto: true,
                  },
                ])
              }
            >
              <Plus size={15} />
              Add row
            </Button>
            <div className="min-w-[260px] rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              <div className="flex justify-between gap-6 text-muted-foreground">
                <span>Taxable Value</span>
                <span className="tabular-nums text-foreground">₹ {formatMoney(taxableTotal)}</span>
              </div>
              {isInterState ? (
                <div className="mt-1 flex justify-between gap-6 text-muted-foreground">
                  <span>IGST</span>
                  <span className="tabular-nums text-foreground">₹ {formatMoney(igstTotal)}</span>
                </div>
              ) : (
                <>
                  <div className="mt-1 flex justify-between gap-6 text-muted-foreground">
                    <span>CGST</span>
                    <span className="tabular-nums text-foreground">₹ {formatMoney(cgstTotal)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-6 text-muted-foreground">
                    <span>SGST</span>
                    <span className="tabular-nums text-foreground">₹ {formatMoney(sgstTotal)}</span>
                  </div>
                </>
              )}
              <div className="mt-1 flex justify-between gap-6 text-muted-foreground">
                <label htmlFor="roundoff" className="whitespace-nowrap">
                  Round Off
                </label>
                <Input
                  id="roundoff"
                  name="roundoff"
                  type="number"
                  step="0.01"
                  value={roundoff}
                  onChange={(e) => setRoundoff(e.target.value)}
                  className="h-8 w-28 text-right"
                />
              </div>
              <div className="mt-2 flex justify-between gap-6 border-t border-border pt-2">
                <span className="font-medium text-foreground">Total Amount</span>
                <span className="font-display text-xl font-semibold tabular-nums text-foreground">
                  ₹ {formatMoney(grandTotal)}
                </span>
              </div>
            </div>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </FormSection>
      </form>
    </>
  );
}
