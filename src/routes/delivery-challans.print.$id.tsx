import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/CompanyLogo";
import { getDeliveryChallanFn } from "@/routes/api/delivery-challans";
import { getCompanySettingsFn } from "@/routes/api/company-settings";
import { amountInWords, formatMoney, formatQty, toNumber } from "@/lib/money";
export const Route = createFileRoute("/delivery-challans/print/$id")({
  head: () => ({
    meta: [{ title: "Print Voucher — VLJ Delivery Desk" }],
  }),
  component: PrintDeliveryChallanPage,
});

type PrintChallan = {
  challanNumber: string;
  challanDate: string;
  deliveryType?: string | null;
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
  roundoff?: number | null;
  customer?: {
    ledgerName?: string | null;
    gstin?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pinCode?: string | null;
  } | null;
  transporter?: { name?: string | null } | null;
  items?: Array<{
    quantity: number;
    rate: number;
    amount: number;
    gstRate?: number;
    stockItem?: {
      productName?: string | null;
      hsnCode?: string | null;
      unit?: string | null;
    } | null;
  }>;
};

type CompanySettings = {
  companyName?: string | null;
  companyLogo?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  email?: string | null;
  phone?: string | null;
} | null;

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function customerAddress(customer?: PrintChallan["customer"]) {
  if (!customer) return [];
  return [
    customer.addressLine1,
    customer.addressLine2,
    [customer.city, customer.state, customer.pinCode ? `PIN ${customer.pinCode}` : null]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean) as string[];
}

function formatQtyWithUnit(quantity: unknown, unit?: string | null) {
  const qty = formatQty(quantity);
  return unit ? `${qty} ${unit}` : qty;
}

function taxAmountInWords(value: unknown) {
  const words = amountInWords(value);
  return words.replace(/^Indian Rupees /, "INR ");
}

function FieldCell({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}) {
  return (
    <td className={`border border-black px-1.5 py-1 align-top text-[10px] ${className}`}>
      <p className="font-semibold leading-tight">{label}</p>
      <p className="mt-0.5 leading-snug">{value || "—"}</p>
    </td>
  );
}

function PrintDeliveryChallanPage() {
  const location = useLocation();
  const { id } = Route.useParams();
  const challanId = Number(id);
  const returnTo = new URLSearchParams(location.search).get("returnTo") ?? "/delivery-challans";
  const [challan, setChallan] = useState<PrintChallan | null>(null);
  const [company, setCompany] = useState<CompanySettings>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const row = await getDeliveryChallanFn({ data: { id: challanId } });
        if (cancelled) return;
        if (!row) {
          setError("Voucher not found");
          setLoading(false);
          return;
        }
        setChallan(row as PrintChallan);
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading challan", err);
          setError(err instanceof Error ? err.message : "Failed to load voucher");
          setLoading(false);
          return;
        }
      }

      try {
        const settings = await getCompanySettingsFn({ data: {} });
        if (!cancelled) setCompany(settings as CompanySettings);
      } catch (err) {
        // Non-fatal: log and continue without company settings
        console.warn("Failed to load company settings for print", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [challanId]);

  const totals = useMemo(() => {
    const items = challan?.items ?? [];
    const taxable = items.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const tax = items.reduce((sum, item) => {
      return sum + (toNumber(item.amount) * toNumber(item.gstRate ?? 3)) / 100;
    }, 0);
    const storedRoundoff = Number(challan?.roundoff ?? 0);
    const qty = items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
    const placeOfSupply = challan?.placeOfSupply?.trim().toLowerCase();
    const customerState = challan?.customer?.state?.trim().toLowerCase();
    const companyState = company?.state?.trim().toLowerCase();
    const supplyState = placeOfSupply || customerState;
    const isInterState = companyState && supplyState && companyState !== supplyState;
    const rawGrand = taxable + tax + storedRoundoff;
    const roundedGrand = Number((Math.round(rawGrand * 100) / 100).toFixed(2));
    const roundoff = Number((roundedGrand - rawGrand).toFixed(2));
    const gstRates = Array.from(
      new Set(items.map((item) => toNumber(item.gstRate ?? 0)).filter(Boolean)),
    );
    const rateLabel = gstRates.length === 1 ? `${gstRates[0]}%` : "";
    const primaryUnit = items[0]?.stockItem?.unit ?? "";
    return {
      taxable,
      tax,
      igst: isInterState ? tax : 0,
      cgst: isInterState ? 0 : tax / 2,
      sgst: isInterState ? 0 : tax / 2,
      grand: roundedGrand,
      qty,
      isInterState,
      roundoff: storedRoundoff,
      rateLabel,
      primaryUnit,
    };
  }, [challan, company]);

  if (loading) {
    return <p className="p-8 text-sm text-muted-foreground">Loading print preview...</p>;
  }

  if (error || !challan) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-sm text-destructive">{error ?? "Voucher not found"}</p>
        <Button asChild variant="outline">
          <Link to="/delivery-challans">Back</Link>
        </Button>
      </div>
    );
  }

  const partyLines = customerAddress(challan.customer);
  const companyLines = [
    company?.address,
    [company?.city, company?.state, company?.pinCode].filter(Boolean).join(", "),
  ].filter(Boolean);

  const cell = "border border-black px-1.5 py-1 text-[10px] align-top";
  const cellR = `${cell} text-right`;
  const cellEmpty = `${cell} text-right`;
  const descTax = `${cell} text-right italic`;

  return (
    <div className="print-page mx-auto max-w-4xl bg-white p-8 text-black" style={{ width: "210mm", margin: "0 auto" }}>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to={returnTo}>
            <ArrowLeft size={14} />
            Back
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer size={14} />
          Print
        </Button>
      </div>

      <div className="challan-sheet border border-black text-[11px] leading-snug">
        <div className="border-b border-black px-3 py-2 text-center">
          <h1 className="text-base font-bold tracking-wide">DELIVERY CHALLAN</h1>
        </div>

        {/* Company details + Delivery details grid */}
        <table className="w-full border-collapse border border-black">
          <colgroup>
            <col className="w-1/2" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>
          <tbody>
            {/* First row: Company (left) + Delivery Note No + Dated (right) */}
            <tr>
              <td rowSpan={3} className="border border-black p-2 align-top text-[10px]">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold uppercase tracking-wide">
                    {company?.companyName || "VARLAKSHMI JEWELLERY"}
                  </p>
                  {companyLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p>GSTIN/UIN: {company?.gstin || "—"}</p>
                  <p>State Name: {company?.state || "—"}</p>
                  {company?.email ? <p>E-Mail: {company.email}</p> : null}
                </div>
              </td>
              <td className="border-r border-black border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Delivery Note No.</p>
                <p className="mt-0.5 leading-snug">{challan.challanNumber}</p>
              </td>
              <td className="border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Dated</p>
                <p className="mt-0.5 leading-snug">{formatDate(challan.challanDate)}</p>
              </td>
            </tr>
            {/* Second row: Mode/Payment + Reference No */}
            <tr>
              <td className="border-r border-black border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Mode/Terms of Payment</p>
                <p className="mt-0.5 leading-snug">{challan.modeOfPayment || "—"}</p>
              </td>
              <td className="border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Reference No. & Date</p>
                <p className="mt-0.5 leading-snug">
                  {challan.referenceNo
                    ? `${challan.referenceNo}${challan.referenceDate ? ` / ${formatDate(challan.referenceDate)}` : ""}`
                    : "—"}
                </p>
              </td>
            </tr>
            {/* Third row: Other References + Buyer Order No */}
            <tr>
              <td className="border-r border-black border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Other References</p>
                <p className="mt-0.5 leading-snug">{challan.otherReferences || "—"}</p>
              </td>
              <td className="border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Buyer's Order No.</p>
                <p className="mt-0.5 leading-snug">{challan.buyerOrderNo || "—"}</p>
              </td>
            </tr>
            {/* Fourth row: Consignee (left) + Dispatch Doc No + Destination */}
            <tr>
              <td rowSpan={2} className="border border-black p-2 align-top text-[10px]">
                <p className="mb-1 font-semibold">Consignee (Ship to)</p>
                <p className="font-bold">{challan.customer?.ledgerName || "—"}</p>
                {partyLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>GSTIN/UIN: {challan.customer?.gstin || "—"}</p>
                <p>State Name: {challan.customer?.state || "—"}</p>
              </td>
              <td className="border-r border-black border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Dispatch Doc No.</p>
                <p className="mt-0.5 leading-snug">{challan.dispatchDocNo || "—"}</p>
              </td>
              <td className="border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Destination</p>
                <p className="mt-0.5 leading-snug">{challan.destination || "—"}</p>
              </td>
            </tr>
            {/* Fifth row: Dispatched through + Terms of Delivery */}
            <tr>
              <td className="border-r border-black border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Dispatched through</p>
                <p className="mt-0.5 leading-snug">{challan.transporter?.name ?? "—"}</p>
              </td>
              <td className="border-b border-black px-1.5 py-1 align-top text-[10px]">
                <p className="font-semibold leading-tight">Terms of Delivery</p>
                <p className="mt-0.5 leading-snug">
                  {challan.termsOfDelivery?.trim() ? challan.termsOfDelivery : "—"}
                </p>
              </td>
            </tr>
            {/* Buyer section */}
            <tr>
              <td className="border border-black p-2 align-top text-[10px]">
                <p className="mb-1 font-semibold">Buyer (Bill to)</p>
                <p className="font-bold">{challan.customer?.ledgerName || "—"}</p>
                {partyLines.map((line) => (
                  <p key={`bill-${line}`}>{line}</p>
                ))}
                <p>GSTIN/UIN: {challan.customer?.gstin || "—"}</p>
                <p>State Name: {challan.customer?.state || "—"}</p>
                <p className="mt-1 font-semibold">
                  Place of Supply: {challan.placeOfSupply || challan.customer?.state || "—"}
                </p>
              </td>
              <td colSpan={2} className="border border-black p-2 align-top text-[10px]">
                {challan.remarks ? (
                  <>
                    <p className="font-semibold leading-tight">Purpose of Movement</p>
                    <p className="mt-0.5 leading-snug">{challan.remarks}</p>
                  </>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Goods table — Tally layout */}
        <table className="w-full table-fixed border-collapse border border-black">
          <colgroup>
            <col className="w-[32px]" />
            <col />
            <col className="w-[64px]" />
            <col className="w-[52px]" />
            <col className="w-[88px]" />
            <col className="w-[72px]" />
            <col className="w-[44px]" />
            <col className="w-[96px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-black bg-neutral-100 text-[10px]">
              <th className={`${cell} text-left font-semibold`}>Sl No.</th>
              <th className={`${cell} text-left font-semibold`}>Description of Goods</th>
              <th className={`${cell} text-left font-semibold`}>HSN/SAC</th>
              <th className={`${cellR} font-semibold`}>GST Rate</th>
              <th className={`${cellR} font-semibold`}>Quantity</th>
              <th className={`${cellR} font-semibold`}>Rate</th>
              <th className={`${cell} text-center font-semibold`}>per</th>
              <th className={`${cellR} font-semibold`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(challan.items ?? []).map((item, index) => {
              const unit = item.stockItem?.unit ?? "";
              return (
                <tr key={`${index}-${item.stockItem?.productName}`} className="text-[10px]">
                  <td className={cell}>{index + 1}</td>
                  <td className={`${cell} font-medium`}>{item.stockItem?.productName || "—"}</td>
                  <td className={cell}>{item.stockItem?.hsnCode || "—"}</td>
                  <td className={cellEmpty}>&nbsp;</td>
                  <td className={cellR}>{formatQtyWithUnit(item.quantity, unit)}</td>
                  <td className={cellR}>{formatMoney(item.rate)}</td>
                  <td className={`${cell} text-center`}>{unit || "—"}</td>
                  <td className={cellR}>{formatMoney(item.amount)}</td>
                </tr>
              );
            })}

            {totals.isInterState ? (
              <tr className="text-[10px]">
                <td className={cell}>&nbsp;</td>
                <td className={descTax}>IGST {totals.rateLabel ? `@${totals.rateLabel}` : ""}</td>
                <td className={cell}>&nbsp;</td>
                <td className={cell}>&nbsp;</td>
                <td className={cell}>&nbsp;</td>
                <td className={cell}>&nbsp;</td>
                <td className={cell}>&nbsp;</td>
                <td className={cellR}>{formatMoney(totals.igst)}</td>
              </tr>
            ) : (
              <>
                <tr className="text-[10px]">
                  <td className={cell}>&nbsp;</td>
                  <td className={descTax}>
                    CGST{" "}
                    {totals.rateLabel ? `@${Number(totals.rateLabel.replace("%", "")) / 2}%` : ""}
                  </td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cellR}>{formatMoney(totals.cgst)}</td>
                </tr>
                <tr className="text-[10px]">
                  <td className={cell}>&nbsp;</td>
                  <td className={descTax}>
                    SGST{" "}
                    {totals.rateLabel ? `@${Number(totals.rateLabel.replace("%", "")) / 2}%` : ""}
                  </td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cellR}>{formatMoney(totals.sgst)}</td>
                </tr>
              </>
            )}

            {Math.abs(totals.roundoff) >= 0.005 ? (
              <tr className="text-[10px]">
                <td className={cell}>&nbsp;</td>
                <td className={descTax}>Roundoff</td>
                <td className={cell}>&nbsp;</td>
                <td className={cell}>&nbsp;</td>
                <td className={cell}>&nbsp;</td>
                <td className={cell}>&nbsp;</td>
                <td className={cell}>&nbsp;</td>
                <td className={cellR}>{formatMoney(totals.roundoff)}</td>
              </tr>
            ) : null}

            <tr className="border-t-2 border-black font-bold text-[10px]">
              <td className={cell}>&nbsp;</td>
              <td className={`${cell} text-right`}>Total</td>
              <td className={cell}>&nbsp;</td>
              <td className={cell}>&nbsp;</td>
              <td className={cellR}>{formatQtyWithUnit(totals.qty, totals.primaryUnit)}</td>
              <td className={cell}>&nbsp;</td>
              <td className={cell}>&nbsp;</td>
              <td className={cellR}>₹ {formatMoney(totals.grand)}</td>
            </tr>
          </tbody>
        </table>

        <div className="border-b border-black px-2 py-1.5 text-[10px]">
          <p>
            <span className="font-semibold">Amount Chargeable (in words):</span>{" "}
            {amountInWords(totals.grand)}
          </p>
        </div>

        {/* HSN / tax summary — Tally sub-header layout */}
        <table className="w-full text-[10px] border-collapse border border-black">
          <thead>
            <tr className="bg-neutral-100">
              <th rowSpan={2} className={`${cell} text-left font-semibold`}>
                HSN/SAC
              </th>
              <th rowSpan={2} className={`${cellR} font-semibold`}>
                Taxable Value
              </th>
              {totals.isInterState ? (
                <th colSpan={2} className={`${cell} text-center font-semibold`}>
                  Integrated Tax
                </th>
              ) : (
                <>
                  <th colSpan={2} className={`${cell} text-center font-semibold`}>
                    Central Tax
                  </th>
                  <th colSpan={2} className={`${cell} text-center font-semibold`}>
                    State Tax
                  </th>
                </>
              )}
              <th rowSpan={2} className={`${cellR} font-semibold`}>
                Total Tax Amount
              </th>
            </tr>
            <tr className="bg-neutral-100">
              {totals.isInterState ? (
                <>
                  <th className={`${cellR} font-semibold`}>Rate</th>
                  <th className={`${cellR} font-semibold`}>Amount</th>
                </>
              ) : (
                <>
                  <th className={`${cellR} font-semibold`}>Rate</th>
                  <th className={`${cellR} font-semibold`}>Amount</th>
                  <th className={`${cellR} font-semibold`}>Rate</th>
                  <th className={`${cellR} font-semibold`}>Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {(challan.items ?? []).map((item, index) => {
              const taxable = toNumber(item.amount);
              const gstRate = toNumber(item.gstRate ?? 3);
              const itemTax = (taxable * gstRate) / 100;
              const half = itemTax / 2;
              const halfRate = gstRate / 2;
              return (
                <tr key={`tax-${index}`}>
                  <td className={cell}>{item.stockItem?.hsnCode || "—"}</td>
                  <td className={cellR}>{formatMoney(taxable)}</td>
                  {totals.isInterState ? (
                    <>
                      <td className={cellR}>{formatMoney(gstRate, 2)}%</td>
                      <td className={cellR}>{formatMoney(itemTax)}</td>
                    </>
                  ) : (
                    <>
                      <td className={cellR}>{formatMoney(halfRate, 2)}%</td>
                      <td className={cellR}>{formatMoney(half)}</td>
                      <td className={cellR}>{formatMoney(halfRate, 2)}%</td>
                      <td className={cellR}>{formatMoney(half)}</td>
                    </>
                  )}
                  <td className={cellR}>{formatMoney(itemTax)}</td>
                </tr>
              );
            })}
            <tr className="font-bold">
              <td className={cell}>Total</td>
              <td className={cellR}>{formatMoney(totals.taxable)}</td>
              {totals.isInterState ? (
                <>
                  <td className={cell}>&nbsp;</td>
                  <td className={cellR}>{formatMoney(totals.igst)}</td>
                </>
              ) : (
                <>
                  <td className={cell}>&nbsp;</td>
                  <td className={cellR}>{formatMoney(totals.cgst)}</td>
                  <td className={cell}>&nbsp;</td>
                  <td className={cellR}>{formatMoney(totals.sgst)}</td>
                </>
              )}
              <td className={cellR}>{formatMoney(totals.tax)}</td>
            </tr>
          </tbody>
        </table>

        <div className="border-b border-black px-2 py-1.5 text-[10px]">
          <p>
            <span className="font-semibold">Tax Amount (in words):</span>{" "}
            {taxAmountInWords(totals.tax)}
          </p>
        </div>

        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <td className="w-1/2 p-3 align-top text-[10px] border-r border-black">
                <p className="font-semibold">Company&apos;s PAN: {company?.pan || "—"}</p>
                <p className="mt-6">Recd. in Good Condition</p>
              </td>
              <td className="w-1/2 p-3 text-right align-top text-[10px]">
                <p>for {company?.companyName || "VARLAKSHMI JEWELLERY"}</p>
                <p className="mt-12 font-semibold">Authorised Signatory</p>
              </td>
            </tr>
          </tbody>
        </table>

        <p className="py-1 text-center text-[10px]">This is a Computer Generated Document</p>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body { background: white !important; margin: 0; padding: 0; }
          .print-page { 
            max-width: 210mm !important; 
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            height: auto !important;
          }
          .challan-sheet { margin: 0; }
          .print\\:hidden { display: none !important; }
          aside, nav, header, .toaster, [data-sonner-toaster] { display: none !important; }
        }
        
        @media screen {
          .print-page { width: 210mm; }
        }
      `}</style>
    </div>
  );
}
