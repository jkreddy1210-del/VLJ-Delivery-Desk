import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Truck, Download, Plus, Printer, Save, Check, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataPanel, DataTable } from "@/components/EmptyTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTransportersFn } from "@/routes/api/transporters";
import { listCustomersFn } from "@/routes/api/customers";
import { getCompanySettingsFn } from "@/routes/api/company-settings";
import { toNumber, formatMoney, formatQty } from "@/lib/money";
import { saveLogisticsSummaryFn, getLogisticsSummaryFn } from "@/routes/api/logistics-summary";

export const Route = createFileRoute("/insights/logistics-summary")({
  head: () => ({
    meta: [
      { title: "Logistics Summary — VLJ Delivery Desk" },
      { name: "description", content: "Transporter-wise logistics summary and invoice register." },
    ],
  }),
  component: LogisticsSummaryPage,
});

type Row = {
  id: string;
  date?: string;
  docketNo?: string;
  customer?: string;
  from?: string;
  to?: string;
  grossWeight?: string;
  freightCharges?: string;
  secureHandling?: string;
  enhancedLiability?: string;
  fuelSurcharge?: string;
  totalTaxable?: string;
  gst?: string;
  totalInvoice?: string;
  invoiceRecDate?: string;
  paymentDate?: string;
  paid?: boolean;
};

function LogisticsSummaryPage() {
  const [transporters, setTransporters] = useState<Array<{ id: number; name: string }>>([]);
  const [customers, setCustomers] = useState<
    Array<{ id: number; ledgerName: string; city?: string | null }>
  >([]);
  const [transporterId, setTransporterId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listTransportersFn({ data: { page: 1, pageSize: 200, status: "ACTIVE" } })
      .then((res) => {
        if (!cancelled) setTransporters(res.rows);
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // load customers for dropdown
    listCustomersFn({ data: { page: 1, pageSize: 500, status: "ACTIVE" } })
      .then((res) => {
        if (!cancelled) setCustomers(res.rows);
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load logistics summary data when transporter is selected
  useEffect(() => {
    if (!transporterId) {
      setRows([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    
    getLogisticsSummaryFn({ data: { transporterId } })
      .then((data: any) => {
        if (!cancelled) {
          setRows(data.rows as Row[]);
          setAmountPaid(data.amountPaid);
        }
      })
      .catch((error: any) => {
        console.error("Error loading logistics summary:", error);
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [transporterId]);

  // print handled via print-only DOM; no external popup

  const addRow = () => {
    setRows((s) => [
      ...s,
      {
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        grossWeight: "",
        freightCharges: "",
        secureHandling: "",
        enhancedLiability: "",
        fuelSurcharge: "",
        totalTaxable: "",
        gst: "0",
        totalInvoice: "0",
        paid: false,
      },
    ]);
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch } as Row;

        // when customer selected, default 'from' to customer's city and 'to' to company city
        if (patch.customer) {
          const sel = customers.find((c) => String(c.id) === String(patch.customer));
          next.from = sel?.city ?? next.from;
          next.to = companySettings?.city ?? next.to;
        }

        // when totalTaxable changes, compute GST @18% and totalInvoice
        if (patch.totalTaxable !== undefined) {
          const tax = toNumber((next.totalTaxable ?? "").toString().replace(/,/g, ""));
          const gstVal = +(tax * 0.18).toFixed(2);
          next.gst = String(gstVal);
          next.totalInvoice = String(+(tax + gstVal).toFixed(2));
        }

        return next;
      }),
    );
  };

  const togglePaid = (id: string) => {
    setRows((current) =>
      current.map((r) => {
        if (r.id !== id) return r;
        // Only allow marking paid if paymentDate is present
        if (!r.paymentDate && !r.paid) return r;
        return { ...r, paid: !r.paid };
      }),
    );
  };

  const removeRow = (id: string) => setRows((current) => current.filter((r) => r.id !== id));

  const handleSave = async () => {
    if (!transporterId) {
      setSaveMessage("Please select a transporter first");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");
    setSaveMessage("Saving logistics summary...");

    try {
      await saveLogisticsSummaryFn({
        data: {
          transporterId,
          rows,
          amountPaid,
        },
      });
      setSaveStatus("success");
      setSaveMessage("Logistics summary saved successfully");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error: any) {
      console.error("Error saving logistics summary:", error);
      setSaveStatus("error");
      setSaveMessage("Failed to save logistics summary");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "S.NO",
      "DATE",
      "DOCKET NO",
      "NAME OF THE CUSTOMER",
      "FROM",
      "TO",
      "GROSS WEIGHT",
      "FREIGHT CHARGES",
      "SECURE HANDLING",
      "Enhanced liability charges",
      "FUEL SURCHARGE",
      "TOTAL TAXABLE VALUE",
      "GST",
      "TOTAL INVOICE VALUE",
      "INVOICE RECD DATE",
      "PAYMENT DATE",
    ];

    const lines = [headers.join(",")];
    rows.forEach((row, idx) => {
      const line = [
        String(idx + 1),
        row.date ?? "",
        row.docketNo ?? "",
        row.customer ?? "",
        row.from ?? "",
        row.to ?? "",
        row.grossWeight ?? "",
        row.freightCharges ?? "",
        row.secureHandling ?? "",
        row.enhancedLiability ?? "",
        row.fuelSurcharge ?? "",
        row.totalTaxable ?? "",
        row.gst ?? "",
        row.totalInvoice ?? "",
        row.invoiceRecDate ?? "",
        row.paymentDate ?? "",
      ];
      lines.push(line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logistics-summary-${transporterId || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const totalRows = rows.length;

  const totals = useMemo(() => {
    return {
      grossWeight: rows.reduce(
        (s, r) => s + toNumber((r.grossWeight ?? "").toString().replace(/,/g, "")),
        0,
      ),
      freightCharges: rows.reduce(
        (s, r) => s + toNumber((r.freightCharges ?? "").toString().replace(/,/g, "")),
        0,
      ),
      secureHandling: rows.reduce(
        (s, r) => s + toNumber((r.secureHandling ?? "").toString().replace(/,/g, "")),
        0,
      ),
      enhancedLiability: rows.reduce(
        (s, r) => s + toNumber((r.enhancedLiability ?? "").toString().replace(/,/g, "")),
        0,
      ),
      fuelSurcharge: rows.reduce(
        (s, r) => s + toNumber((r.fuelSurcharge ?? "").toString().replace(/,/g, "")),
        0,
      ),
      totalTaxable: rows.reduce(
        (s, r) => s + toNumber((r.totalTaxable ?? "").toString().replace(/,/g, "")),
        0,
      ),
      gst: rows.reduce((s, r) => s + toNumber((r.gst ?? "").toString().replace(/,/g, "")), 0),
      totalInvoice: rows.reduce(
        (s, r) => s + toNumber((r.totalInvoice ?? "").toString().replace(/,/g, "")),
        0,
      ),
    };
  }, [rows]);

  const [amountPaid, setAmountPaid] = useState("");

  const paidNumeric = toNumber((amountPaid || "").toString().replace(/,/g, ""));
  const paidFromRows = rows.reduce(
    (s, r) => s + (r.paid ? toNumber((r.totalInvoice ?? "").toString().replace(/,/g, "")) : 0),
    0,
  );
  const pendingAmount = Math.max(0, totals.totalInvoice - (paidNumeric + paidFromRows));
  const tds = +(totals.totalTaxable * 0.02).toFixed(2);
  const netPayable = Math.max(0, pendingAmount - tds);
  const effectiveRatePerGm = totals.grossWeight
    ? +(totals.totalTaxable / totals.grossWeight).toFixed(2)
    : 0;

  const [companySettings, setCompanySettings] = useState<{
    companyName?: string | null;
    companyLogo?: string | null;
    city?: string | null;
    gstin?: string | null;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getCompanySettingsFn({ data: {} })
      .then((s) => {
        if (!cancelled) setCompanySettings(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <style>
        {`@page { size: A4 landscape; margin: 12mm 10mm; }
@media print {
  html, body {
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide app chrome (sidebar, headers, toasts, screen UI). */
  body * {
    visibility: hidden !important;
  }

  .print-only,
  .print-only * {
    visibility: visible !important;
  }

  .print-only {
    display: block !important;
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  .no-print {
    display: none !important;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .print-table th,
  .print-table td {
    border: 1px solid #ddd;
    padding: 6px;
  }

  .print-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6mm;
  }
}

.print-only {
  display: none;
}
`}
      </style>

      {/* Print view */}
      <div className="print-only p-4">
        <div className="print-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {companySettings?.companyLogo ? (
              <img
                src={companySettings.companyLogo}
                alt={companySettings.companyName ?? "Company logo"}
                style={{ height: 72, objectFit: "contain" }}
              />
            ) : null}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {companySettings?.companyName ?? "VLJ"}
              </div>
              {companySettings?.gstin ? (
                <div style={{ fontSize: 12 }}>GSTIN: {companySettings?.gstin}</div>
              ) : null}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Logistics Summary</div>
            <div style={{ fontSize: 12 }}>
              Transporter:{" "}
              {transporters.find((t) => String(t.id) === transporterId)?.name ??
                (transporterId ? transporterId : "All")}
            </div>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date</th>
              <th>Docket No</th>
              <th>Customer</th>
              <th>From</th>
              <th>To</th>
              <th>Gross Weight</th>
              <th>Freight</th>
              <th>Secure Handling</th>
              <th>Enhanced liability</th>
              <th>Fuel Surcharge</th>
              <th>Total Taxable</th>
              <th>GST</th>
              <th>Total Invoice</th>
              <th>Invoice Recd Date</th>
              <th>Payment Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.date ?? ""}</td>
                <td>{r.docketNo ?? ""}</td>
                <td>
                  {customers.find((c) => String(c.id) === String(r.customer))?.ledgerName ??
                    r.customer ??
                    ""}
                </td>
                <td>{r.from ?? ""}</td>
                <td>{r.to ?? ""}</td>
                <td style={{ textAlign: "right" }}>{formatQty(r.grossWeight ?? "")}</td>
                <td style={{ textAlign: "right" }}>₹ {formatMoney(r.freightCharges ?? "")}</td>
                <td style={{ textAlign: "right" }}>₹ {formatMoney(r.secureHandling ?? "")}</td>
                <td style={{ textAlign: "right" }}>₹ {formatMoney(r.enhancedLiability ?? "")}</td>
                <td style={{ textAlign: "right" }}>₹ {formatMoney(r.fuelSurcharge ?? "")}</td>
                <td style={{ textAlign: "right" }}>₹ {formatMoney(r.totalTaxable ?? "")}</td>
                <td style={{ textAlign: "right" }}>₹ {formatMoney(r.gst ?? "")}</td>
                <td style={{ textAlign: "right" }}>₹ {formatMoney(r.totalInvoice ?? "")}</td>
                <td>{r.invoiceRecDate ?? ""}</td>
                <td>{r.paymentDate ?? ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} style={{ textAlign: "right", fontWeight: 700 }}>
                Grand Total
              </td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                {formatQty(totals.grossWeight)}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                ₹ {formatMoney(totals.freightCharges)}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                ₹ {formatMoney(totals.secureHandling)}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                ₹ {formatMoney(totals.enhancedLiability)}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                ₹ {formatMoney(totals.fuelSurcharge)}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                ₹ {formatMoney(totals.totalTaxable)}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>₹ {formatMoney(totals.gst)}</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                ₹ {formatMoney(totals.totalInvoice)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Summary</div>
            <div>Total Cost before GST: ₹ {formatMoney(totals.totalTaxable)}</div>
            <div>Gross Weight: {formatQty(totals.grossWeight)}</div>
            <div>Effective Rate per GM: {effectiveRatePerGm}</div>
            <div>Pending amount: ₹ {formatMoney(pendingAmount)}</div>
            <div>Less : TDS (2%): ₹ {formatMoney(tds)}</div>
            <div style={{ fontWeight: 700 }}>Net Amount Payable: ₹ {formatMoney(netPayable)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>Prepared By: ____________________</div>
            <div>Checked By: _____________________</div>
            <div>Authorised Signatory: ____________</div>
          </div>
        </div>
      </div>
      <div className="no-print">
        <PageHeader
          eyebrow="Insights"
          title="Logistics Summary"
          description="Transporter-wise docket & invoice register. Add or import transporter invoices and export for accounting."
          action={
            <div className="flex items-center gap-2">
              <Button 
                variant={saveStatus === "success" ? "default" : "outline"} 
                onClick={handleSave}
                disabled={isSaving}
              >
                {saveStatus === "saving" && <Save size={14} className="mr-2 animate-spin" />}
                {saveStatus === "success" && <Check size={14} className="mr-2" />}
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={14} /> Print
              </Button>
              <Button onClick={exportCsv}>
                <Download size={14} /> Export CSV
              </Button>
            </div>
          }
        />

        <DataPanel
          title="Transporter Summary"
          caption={`${totalRows} row${totalRows === 1 ? "" : "s"}`}
        >
          {saveStatus !== "idle" && (
            <div className={`px-5 py-3 flex items-center gap-2 ${
              saveStatus === "success" ? "bg-green-50 text-green-700" : 
              saveStatus === "error" ? "bg-red-50 text-red-700" : 
              "bg-blue-50 text-blue-700"
            }`}>
              {saveStatus === "success" && <Check size={16} />}
              {saveStatus === "error" && <AlertCircle size={16} />}
              {saveStatus === "saving" && <Save size={16} className="animate-spin" />}
              <span className="text-sm">{saveMessage}</span>
            </div>
          )}
          <div className="border-b border-border px-5 py-3 flex items-center gap-3">
            <Select 
              value={transporterId} 
              onValueChange={setTransporterId}
              disabled={isLoading}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder={isLoading ? "Loading..." : "Select transporter..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Transporters</SelectItem>
                {transporters.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={addRow} disabled={isLoading}>
              <Plus size={14} /> Add Row
            </Button>
          </div>

          <DataTable
            columns={[
              "S.No",
              "Date",
              "Docket No",
              "Name of the Customer",
              "From",
              "To",
              "Gross Weight",
              "Freight Charges",
              "Secure Handling",
              "Enhanced liability charges",
              "Fuel Surcharge",
              "Total Taxable Value",
              "GST",
              "Total Invoice Value",
              "Invoice Recd Date",
              "Payment Date",
              "Actions",
            ]}
          >
            {rows.length === 0 ? (
              <tr>
                <td colSpan={17} className="p-0">
                  <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                    <Truck size={20} className="text-muted-foreground" />
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">
                        No logistics recorded
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Click Add Row to start entering transporter invoices/dockets.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.date ?? ""}
                      onChange={(e) => updateRow(row.id, { date: e.target.value })}
                      type="date"
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.docketNo ?? ""}
                      onChange={(e) => updateRow(row.id, { docketNo: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.customer ?? ""}
                      onValueChange={(value) => updateRow(row.id, { customer: value })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.ledgerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.from ?? ""}
                      onChange={(e) => updateRow(row.id, { from: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.to ?? ""}
                      onChange={(e) => updateRow(row.id, { to: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.grossWeight ?? ""}
                      onChange={(e) => updateRow(row.id, { grossWeight: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.freightCharges ?? ""}
                      onChange={(e) => updateRow(row.id, { freightCharges: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.secureHandling ?? ""}
                      onChange={(e) => updateRow(row.id, { secureHandling: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.enhancedLiability ?? ""}
                      onChange={(e) => updateRow(row.id, { enhancedLiability: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.fuelSurcharge ?? ""}
                      onChange={(e) => updateRow(row.id, { fuelSurcharge: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.totalTaxable ?? ""}
                      onChange={(e) => updateRow(row.id, { totalTaxable: e.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={row.gst ?? ""} readOnly className="h-8 bg-muted/10" />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={row.totalInvoice ?? ""} readOnly className="h-8 bg-muted/10" />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.invoiceRecDate ?? ""}
                      onChange={(e) => updateRow(row.id, { invoiceRecDate: e.target.value })}
                      type="date"
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.paymentDate ?? ""}
                      onChange={(e) => updateRow(row.id, { paymentDate: e.target.value })}
                      type="date"
                      className="h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 items-center">
                      <Button
                        variant={row.paid ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => togglePaid(row.id)}
                        disabled={!row.paymentDate && !row.paid}
                      >
                        {row.paid ? "Unmark" : "Paid"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeRow(row.id)}>
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {/* Totals row */}
            {rows.length > 0 ? (
              <tr className="font-medium bg-muted/10">
                <td colSpan={6} className="px-3 py-2 text-right">
                  Grand Total
                </td>
                <td className="px-3 py-2 text-right">{formatQty(totals.grossWeight)}</td>
                <td className="px-3 py-2 text-right">₹ {formatMoney(totals.freightCharges)}</td>
                <td className="px-3 py-2 text-right">₹ {formatMoney(totals.secureHandling)}</td>
                <td className="px-3 py-2 text-right">₹ {formatMoney(totals.enhancedLiability)}</td>
                <td className="px-3 py-2 text-right">₹ {formatMoney(totals.fuelSurcharge)}</td>
                <td className="px-3 py-2 text-right">₹ {formatMoney(totals.totalTaxable)}</td>
                <td className="px-3 py-2 text-right">₹ {formatMoney(totals.gst)}</td>
                <td className="px-3 py-2 text-right">₹ {formatMoney(totals.totalInvoice)}</td>
                <td colSpan={3} />
              </tr>
            ) : null}
          </DataTable>
          <div className="px-5 py-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground w-36">Amount Paid</label>
              <Input
                className="w-48"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total Cost before GST</span>
                <span>₹ {formatMoney(totals.totalTaxable)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Gross Weight</span>
                <span>{formatQty(totals.grossWeight)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Effective Rate per GM</span>
                <span>{effectiveRatePerGm}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pending amount</span>
                <span>₹ {formatMoney(pendingAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Less : TDS (2%)</span>
                <span>₹ {formatMoney(tds)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-foreground">
                <span>Net Amount Payable</span>
                <span>₹ {formatMoney(netPayable)}</span>
              </div>
            </div>
          </div>
        </DataPanel>
      </div>
    </>
  );
}
