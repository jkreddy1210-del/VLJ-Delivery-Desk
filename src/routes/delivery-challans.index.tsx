import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDateFilter } from "@/hooks/useDateFilter";
import { listDeliveryChallansFn } from "@/routes/api/delivery-challans";
import { listCustomersFn } from "@/routes/api/customers";
import { formatMoney } from "@/lib/money";
import { DELIVERY_TYPES, type DeliveryTypeValue } from "@/lib/challan-number";

export const Route = createFileRoute("/delivery-challans/")({
  head: () => ({
    meta: [
      { title: "Voucher Register — VLJ Delivery Desk" },
      { name: "description", content: "Party ledger register for issued and received vouchers." },
      { property: "og:title", content: "Voucher Register — VLJ Delivery Desk" },
      { property: "og:description", content: "Party ledger register for issued and received vouchers." },
    ],
  }),
  component: DeliveryChallansPage,
});

type DeliveryChallanRow = {
  id: number;
  challanNumber: string;
  challanDate: string;
  deliveryType?: DeliveryTypeValue;
  status: "STOCK_SENT" | "STOCK_RECEIVED";
  customer?: { ledgerName?: string | null } | null;
  items?: Array<{ quantity?: number | string; amount?: number | string }>;
};

type CustomerOption = { id: number; ledgerName: string };

function DeliveryChallansPage() {
  const [status, setStatus] = useState<"ALL" | "STOCK_SENT" | "STOCK_RECEIVED">("ALL");
  const [deliveryType, setDeliveryType] = useState<"ALL" | DeliveryTypeValue>("ALL");
  const { fromDate, toDate } = useDateFilter();
  const location = useLocation();
  const searchFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("search")?.trim() ?? "",
    [location.search],
  );
  const [search, setSearch] = useState(searchFromUrl);
  const [page, setPage] = useState(1);
  const [reloadKey] = useState(0);
  const [rows, setRows] = useState<DeliveryChallanRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 500;

  useEffect(() => {
    setSearch(searchFromUrl);
    setPage(1);
  }, [searchFromUrl]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [challansResult, customerResult] = await Promise.all([
          listDeliveryChallansFn({ data: { search, status, deliveryType, page, pageSize, fromDate, toDate } }),
          listCustomersFn({ data: { search, status: "ACTIVE", page: 1, pageSize: 500 } }),
        ]);
        if (!cancelled) {
          const challansPayload = challansResult as { rows: DeliveryChallanRow[]; total: number };
          setRows(challansPayload.rows);
          setTotal(challansPayload.total);
          setCustomers(customerResult.rows ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          setCustomers([]);
          toast.error(error instanceof Error ? error.message : "Failed to load vouchers.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [search, status, deliveryType, page, reloadKey, fromDate, toDate]);

  const customerGroups = useMemo(() => {
    const groups = new Map<string, { customerName: string; challans: DeliveryChallanRow[]; totalQty: number; totalValue: number }>();

    customers.forEach((customer) => {
      const name = customer.ledgerName.trim() || "Unknown customer";
      groups.set(name.toLowerCase(), { customerName: name, challans: [], totalQty: 0, totalValue: 0 });
    });

    rows.forEach((row) => {
      const name = row.customer?.ledgerName?.trim() || "Unknown customer";
      const key = name.toLowerCase();
      const existing = groups.get(key);
      const qty = row.items?.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) ?? 0;
      const value = row.items?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0;
      if (existing) {
        existing.challans.push(row);
        existing.totalQty += qty;
        existing.totalValue += value;
      } else {
        groups.set(key, { customerName: name, challans: [row], totalQty: qty, totalValue: value });
      }
    });

    return Array.from(groups.values())
      .sort((a, b) => a.customerName.localeCompare(b.customerName, undefined, { sensitivity: "base" }))
      .map((group) => ({
        ...group,
        challans: group.challans.sort((a, b) => new Date(b.challanDate).getTime() - new Date(a.challanDate).getTime()),
      }));
  }, [customers, rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild>
            <Link to="/delivery-challans/new">Add Voucher</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search customer name..."
              className="h-10 pl-9"
            />
          </div>
          <Select value={deliveryType} onValueChange={(value) => { setDeliveryType(value as "ALL" | DeliveryTypeValue); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Delivery type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {DELIVERY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => { setStatus(value as "ALL" | "STOCK_SENT" | "STOCK_RECEIVED"); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="STOCK_SENT">Stock Sent</SelectItem>
              <SelectItem value="STOCK_RECEIVED">Stock Received</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          {loading ? (
            <div className="surface-panel rounded-xl border border-border p-6 text-sm text-muted-foreground">Loading ledgers...</div>
          ) : customerGroups.length === 0 ? (
            <div className="surface-panel rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">No ledgers found. Create a voucher to add ledger movement.</div>
          ) : (
            customerGroups.map((group) => (
              <Link
                key={group.customerName.toLowerCase()}
                to="/delivery-challans/customer/$customerName"
                params={{ customerName: group.customerName }}
                className="flex w-full flex-col justify-between rounded-xl border border-border/50 bg-background px-3 py-3 text-left transition-all hover:border-border focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{group.customerName}</p></div>
                  <div className="flex min-w-[160px] items-center justify-end gap-3 text-xs text-muted-foreground">
                    <span>{group.challans.length} voucher{group.challans.length === 1 ? "" : "s"}</span>
                    <span>{group.totalQty} qty</span>
                    <span>₹ {formatMoney(group.totalValue)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
