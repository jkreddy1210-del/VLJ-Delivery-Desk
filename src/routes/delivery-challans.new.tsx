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
import { createDeliveryChallanFn } from "@/routes/api/delivery-challans";
import { listCustomersFn } from "@/routes/api/customers";
import { listProductsFn } from "@/routes/api/products";
import { listTransportersFn } from "@/routes/api/transporters";
import { getCompanySettingsFn } from "@/routes/api/company-settings";
import { formatMoney, toNumber } from "@/lib/money";
import { createRowKey } from "@/lib/row-key";
import { DELIVERY_TYPES, type DeliveryTypeValue } from "@/lib/challan-number";

export const Route = createFileRoute("/delivery-challans/new")({
  head: () => ({
    meta: [
      { title: "New Voucher — VLJ Delivery Desk" },
      { name: "description", content: "Create a new voucher." },
      { property: "og:title", content: "New Voucher — VLJ Delivery Desk" },
      {
        property: "og:description",
        content: "Create a new voucher.",
      },
    ],
  }),
  component: NewChallan,
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
  customerType?: "CUSTOMER" | "VENDOR";
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

function NewChallan() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryCustomerId = new URLSearchParams(location.search).get("customerId") ?? "";
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [transporters, setTransporters] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customerId, setCustomerId] = useState(queryCustomerId);
  const [transporterId, setTransporterId] = useState("none");
  const [deliveryType, setDeliveryType] = useState<DeliveryTypeValue | "">("");
  const [challanDate, setChallanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [challanNumber, setChallanNumber] = useState("");
  const [roundoff, setRoundoff] = useState("0");
  const [companyState, setCompanyState] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    {
      key: createRowKey(),
      stockItemId: "",
      quantity: "",
      rate: "",
      amount: "",
      gstRate: "3",
      amountAuto: true,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [customerResult, transporterResult, productResult] = await Promise.all([
        listCustomersFn({
          data: { page: 1, pageSize: 100, status: "ACTIVE" },
        }),
        listTransportersFn({
          data: { page: 1, pageSize: 100, status: "ACTIVE" },
        }),
        listProductsFn({
          data: { page: 1, pageSize: 100, status: "ACTIVE" },
        }),
      ]);

      if (!cancelled) {
        setCustomers(customerResult.rows);
        setTransporters(transporterResult.rows);
        setProducts(productResult.rows);
      }
    };

    load().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCustomer = customers.find((c) => String(c.id) === customerId);
  const direction = selectedCustomer?.customerType === "VENDOR" ? "INWARD" : "OUTWARD";

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

  useEffect(() => {
    if (!customerId) {
      setPlaceOfSupply("");
      return;
    }

    if (!placeOfSupply && selectedCustomer?.state) {
      setPlaceOfSupply(selectedCustomer.state);
    }
  }, [customerId, selectedCustomer?.state, placeOfSupply]);

  const normalizeState = (value?: string | null) => value?.trim().toLowerCase() ?? "";

  const supplyState = normalizeState(placeOfSupply) || normalizeState(selectedCustomer?.state);
  const isInterState =
    companyState && supplyState ? normalizeState(companyState) !== supplyState : false;

  const hasSelectedCustomer = Boolean(customerId);

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
  const grandTotal = taxableTotal + (hasSelectedCustomer ? taxTotal : 0) + toNumber(roundoff);

  const gstRates = Array.from(
    new Set(items.map((it) => Number(it.gstRate)).filter((r) => !Number.isNaN(r))),
  );
  const singleGstRate = gstRates.length === 1 ? gstRates[0] : null;

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

  return (
    <>
      <PageHeader
        eyebrow="Operations · Vouchers"
        title="New Voucher"
        description="Create a delivery voucher. Stock direction is determined automatically from the party type."
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

          if (!deliveryType) {
            setError("Select delivery type");
            return;
          }

          setSaving(true);
          setError(null);
          const form = new FormData(e.currentTarget);
          const manualChallanNumber = (form.get("challanNumber")?.toString() || challanNumber).trim();

          if (!manualChallanNumber) {
            setError("Enter voucher number");
            setSaving(false);
            return;
          }

          try {
            await createDeliveryChallanFn({
              data: {
                challanNumber: manualChallanNumber,
                customerId: Number(customerId),
                transporterId: transporterId === "none" ? null : Number(transporterId),
                challanDate,
                deliveryType,
                placeOfSupply: form.get("placeOfSupply")?.toString() || placeOfSupply || "",
                referenceNo: form.get("referenceNo")?.toString() || "",
                referenceDate: form.get("referenceDate")?.toString() || null,
                buyerOrderNo: form.get("buyerOrderNo")?.toString() || "",
                dispatchDocNo: form.get("dispatchDocNo")?.toString() || "",
                roundoff: Number(form.get("roundoff")?.toString() ?? roundoff),
                modeOfPayment: form.get("modeOfPayment")?.toString() || "",
                otherReferences: form.get("otherReferences")?.toString() || "",
                destination: form.get("destination")?.toString() || "",
                termsOfDelivery: form.get("termsOfDelivery")?.toString() || "",
                remarks: form.get("remarks")?.toString() || "",
                items: validItems.map((item) => {
                  const quantity = Number(item.quantity);
                  const rate = Number(item.rate);
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
            });
            navigate({ to: "/delivery-challans" });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save voucher");
            setSaving(false);
          }
        }}
        className="space-y-6"
      >
        <FormSection title="Voucher" description="Voucher number, date and automatically determined stock direction">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Voucher No" htmlFor="challanNo" required>
              <Input
                id="challanNo"
                name="challanNumber"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="Enter voucher number"
                className="font-medium"
              />
            </Field>
            <Field label="Delivery Type" required>
              <Select
                value={deliveryType}
                onValueChange={(value) => setDeliveryType(value as DeliveryTypeValue)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select delivery type..." />
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
            <Field label="Dated" htmlFor="challanDate" required>
              <Input
                id="challanDate"
                name="challanDate"
                type="date"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
              />
            </Field>
            <Field label="Stock Direction">
              <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-medium">
                {customerId ? (direction === "INWARD" ? "INWARD · Stock Received" : "OUTWARD · Stock Sent") : "Select party first"}
              </div>
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Consignee / Buyer"
          description="Ship to & Bill to — pick from Customers master"
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="Customer / Party" required className="md:col-span-2">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.ledgerName} ({customer.customerType === "VENDOR" ? "Vendor" : "Customer"})
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
                <p className="mt-1 font-medium text-foreground">
                  Party Type: {selectedCustomer.customerType === "VENDOR" ? "Vendor" : "Customer"} · Movement: {direction}
                </p>
              </div>
            ) : null}
            <Field label="Place of Supply" htmlFor="placeOfSupply">
              <Input
                id="placeOfSupply"
                name="placeOfSupply"
                placeholder="e.g. Telangana"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
              />
            </Field>
            <Field label="Destination" htmlFor="destination">
              <Input
                id="destination"
                name="destination"
                placeholder="Destination"
                defaultValue={selectedCustomer?.city ?? ""}
                key={`dest-${customerId}`}
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
              <Input id="referenceNo" name="referenceNo" />
            </Field>
            <Field label="Reference Date" htmlFor="referenceDate">
              <Input id="referenceDate" name="referenceDate" type="date" />
            </Field>
            <Field label="Buyer's Order No." htmlFor="buyerOrderNo">
              <Input id="buyerOrderNo" name="buyerOrderNo" />
            </Field>
            <Field label="Dispatch Doc No." htmlFor="dispatchDocNo">
              <Input id="dispatchDocNo" name="dispatchDocNo" />
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
              <input type="hidden" name="modeOfPayment" value={modeOfPayment} />
              <Select value={modeOfPayment} onValueChange={setModeOfPayment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select mode of transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BY AIR/ROAD">BY AIR/ROAD</SelectItem>
                  <SelectItem value="BY HAND">BY HAND</SelectItem>
                  <SelectItem value="BY ROAD">BY ROAD</SelectItem>
                  <SelectItem value="BY AIR">BY AIR</SelectItem>
                  <SelectItem value="BY RAIL">BY RAIL</SelectItem>
                  <SelectItem value="BY SEA">BY SEA</SelectItem>
                  <SelectItem value="COURIER">COURIER</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Other References" htmlFor="otherReferences">
              <Input id="otherReferences" name="otherReferences" />
            </Field>
            <Field label="Terms of Delivery" htmlFor="termsOfDelivery">
              <Input
                id="termsOfDelivery"
                name="termsOfDelivery"
                placeholder="e.g. Prepaid, To Pay, Delivered"
              />
            </Field>
            <Field label="Purpose of Movement" htmlFor="remarks" className="md:col-span-3">
              <Input id="remarks" name="remarks" placeholder="Optional note" />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Description of Goods"
          description="Select products from Stock Items master"
          footer={
            <>
              <Button variant="outline" type="button" asChild>
                <Link to="/delivery-challans">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Voucher"}
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
                  const amount = item.amount
                    ? toNumber(item.amount)
                    : Number((toNumber(item.quantity) * toNumber(item.rate)).toFixed(2));
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
                          min="0"
                          step="0.001"
                          className="text-right min-w-[90px] text-sm md:text-base"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{product?.unit ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-right"
                          value={item.rate}
                          onChange={(e) => updateItem(item.key, { rate: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-right"
                          value={item.gstRate}
                          onChange={(e) => updateItem(item.key, { gstRate: e.target.value })}
                          onBlur={() =>
                            updateItem(item.key, {
                              gstRate: String(Math.round(toNumber(item.gstRate) * 100) / 100),
                            })
                          }
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
              {hasSelectedCustomer ? (
                isInterState ? (
                  <div className="mt-1 flex justify-between gap-6 text-muted-foreground">
                    <span>IGST{singleGstRate ? ` (${singleGstRate}%)` : " (various)"}</span>
                    <span className="tabular-nums text-foreground">₹ {formatMoney(igstTotal)}</span>
                  </div>
                ) : (
                  <>
                    <div className="mt-1 flex justify-between gap-6 text-muted-foreground">
                      <span>CGST{singleGstRate ? ` (${singleGstRate / 2}%)` : " (various)"}</span>
                      <span className="tabular-nums text-foreground">
                        ₹ {formatMoney(cgstTotal)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between gap-6 text-muted-foreground">
                      <span>SGST{singleGstRate ? ` (${singleGstRate / 2}%)` : " (various)"}</span>
                      <span className="tabular-nums text-foreground">
                        ₹ {formatMoney(sgstTotal)}
                      </span>
                    </div>
                  </>
                )
              ) : null}
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
