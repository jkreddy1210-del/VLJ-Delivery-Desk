import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { CheckCircle2, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { DataTable } from "@/components/EmptyTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDateFilter } from "@/hooks/useDateFilter";
import {
  listDeliveryChallansFn,
  deleteDeliveryChallanFn,
} from "@/routes/api/delivery-challans";
import { listCustomersFn } from "@/routes/api/customers";
import { formatMoney } from "@/lib/money";
import { DELIVERY_TYPES, deliveryTypeLabel, type DeliveryTypeValue } from "@/lib/challan-number";

export const Route = createFileRoute("/delivery-challans/")({
  head: () => ({
    meta: [
      { title: "Voucher Register — VLJ Delivery Desk" },
      {
        name: "description",
        content: "Party ledger register for issued and received vouchers.",
      },
      { property: "og:title", content: "Voucher Register — VLJ Delivery Desk" },
      {
        property: "og:description",
        content: "Party ledger register for issued and received vouchers.",
      },
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
  destination?: string | null;
  customer?: { ledgerName?: string | null } | null;
  transporter?: { name?: string | null } | null;
  items?: Array<{
    quantity?: number | string;
    amount?: number | string;
  }>;
};

type CustomerOption = {
  id: number;
  ledgerName: string;
};

function statusLabel(status: string) {
  if (status === "STOCK_RECEIVED") return "Stock Received";
  return "Stock Sent";
}

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
  const [reloadKey, setReloadKey] = useState(0);
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
          listDeliveryChallansFn({
            data: { search, status, deliveryType, page, pageSize, fromDate, toDate },
          }),
          listCustomersFn({
            data: { search, status: "ACTIVE", page: 1, pageSize: 500 },
          }),
        ]);
        if (!cancelled) {
          const challansPayload = challansResult as {
            rows: DeliveryChallanRow[];
            total: number;
          };
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const customerGroups = useMemo(() => {
    const groups = new Map<string, {
      customerName: string;
      challans: DeliveryChallanRow[];
      totalQty: number;
      totalValue: number;
    }>();

    customers.forEach((customer) => {
      const name = customer.ledgerName.trim() || "Unknown customer";
      const key = name.toLowerCase();
      groups.set(key, {
        customerName: name,
        challans: [],
        totalQty: 0,
        totalValue: 0,
      });
    });

    rows.forEach((row) => {
      const name = row.customer?.ledgerName?.trim() || "Unknown customer";
      const key = name.toLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.challans.push(row);
        existing.totalQty +=
          row.items?.reduce((itemSum, item) => itemSum + Number(item.quantity ?? 0), 0) ?? 0;
        existing.totalValue +=
          row.items?.reduce((itemSum, item) => itemSum + Number(item.amount ?? 0), 0) ?? 0;
      } else {
        groups.set(key, {
          customerName: name,
          challans: [row],
          totalQty:
            row.items?.reduce((itemSum, item) => itemSum + Number(item.quantity ?? 0), 0) ?? 0,
          totalValue:
            row.items?.reduce((itemSum, item) => itemSum + Number(item.amount ?? 0), 0) ?? 0,
        });
      }
    });

    return Array.from(groups.values())
      .sort((a, b) =>
        a.customerName.localeCompare(b.customerName, undefined, { sensitivity: "base" }),
      )
      .map((group) => ({
        ...group,
        challans: group.challans.sort(
          (a, b) => new Date(b.challanDate).getTime() - new Date(a.challanDate).getTime(),
        ),
      }));
  }, [customers, rows]);

  const handleDeleteChallan = async (id: number) => {
    try {
      await deleteDeliveryChallanFn({ data: { id } });
      setReloadKey((k) => k + 1);
      toast.success("Voucher deleted successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete voucher.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link to="/delivery-challans/new">Add Voucher</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
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
          <Select
            value={deliveryType}
            onValueChange={(value) => {
              setDeliveryType(value as "ALL" | DeliveryTypeValue);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Delivery type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {DELIVERY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as "ALL" | "STOCK_SENT" | "STOCK_RECEIVED");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="STOCK_SENT">Stock Sent</SelectItem>
              <SelectItem value="STOCK_RECEIVED">Stock Received</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          {loading ? (
            <div className="surface-panel rounded-xl border border-border p-6 text-sm text-muted-foreground">
              Loading ledgers...
            </div>
          ) : customerGroups.length === 0 ? (
            <div className="surface-panel rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
              No ledgers found. Create a voucher to add ledger movement.
            </div>
          ) : (
            customerGroups.map((group) => (
              <Link
                key={group.customerKey}
                to="/delivery-challans/customer/$customerName"
                params={{ customerName: group.customerName }}
                className="flex w-full flex-col justify-between rounded-xl border border-border/50 bg-background px-3 py-3 text-left transition-all hover:border-border focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {group.customerName}
                    </p>
                  </div>
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
