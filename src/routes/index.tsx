import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Package, FileText, ArrowRight, Plus, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { DataPanel, DataTable } from "@/components/EmptyTable";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useDateFilter } from "@/hooks/useDateFilter";
import { getDashboardStatsFn } from "@/routes/api/reports";
import { listDeliveryChallansFn } from "@/routes/api/delivery-challans";
import { toast } from "sonner";

function CalendarPopoverContent({
  fromDate,
  toDate,
  onApply,
  onClose,
}: {
  fromDate: string;
  toDate: string;
  onApply: (fromIso: string, toIso: string) => void;
  onClose: () => void;
}) {
  const [provisional, setProvisional] = useState<{ from: Date | null; to: Date | null }>({
    from: new Date(fromDate),
    to: new Date(toDate),
  });

  useEffect(() => {
    setProvisional({ from: new Date(fromDate), to: new Date(toDate) });
  }, [fromDate, toDate]);

  return (
    <div className="p-3">
      <Calendar
        mode="range"
        selected={{ from: provisional.from ?? undefined, to: provisional.to ?? undefined }}
        onSelect={(range) => {
          setProvisional({ from: range?.from ?? null, to: range?.to ?? null });
        }}
      />

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" onClick={() => onClose()}>
          Cancel
        </Button>

        <Button
          onClick={() => {
            if (provisional.from && provisional.to) {
              onApply(
                provisional.from.toISOString().slice(0, 10),
                provisional.to.toISOString().slice(0, 10),
              );
              onClose();
            }
          }}
        >
          OK
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VLJ Delivery Desk" },
      {
        name: "description",
        content: "Overview of customers, products and vouchers.",
      },
      { property: "og:title", content: "Dashboard — VLJ Delivery Desk" },
      {
        property: "og:description",
        content: "Overview of customers, products and vouchers.",
      },
    ],
  }),
  component: Dashboard,
});

const quickActions = [
  {
    title: "New Voucher",
    description: "Approval, job-work or marketing",
    to: "/delivery-challans/new",
  },
  {
    title: "Add Customer",
    description: "Create a new party ledger",
    to: "/customers/new",
  },
  {
    title: "Add Product",
    description: "Register a stock item",
    to: "/products/new",
  },
  {
    title: "Stock Groups",
    description: "Organise catalogue groups",
    to: "/stock-groups",
  },
] as const;

function Dashboard() {
  const { financialYear, fromDate, toDate, options, setFinancialYear, setDateRange } =
    useDateFilter();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [stats, setStats] = useState([
    { label: "Customers", value: "—" as number | string, icon: Users, hint: "Active ledgers in master" },
    { label: "Products", value: "—" as number | string, icon: Package, hint: "Stock items catalogued" },
    { label: "Vouchers", value: "—" as number | string, icon: FileText, hint: "Issued in selected range" },
  ]);

  const formatLocalDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  const [recent, setRecent] = useState<
    Array<{
      id: number;
      challanNumber: string;
      challanDate: string;
      status: string;
      customer?: { ledgerName?: string | null } | null;
      items?: Array<{ quantity: number }>;
    }>
  >([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [result, challans] = await Promise.all([
          getDashboardStatsFn({ data: { fromDate, toDate } }),
          listDeliveryChallansFn({
            data: { page: 1, pageSize: 5, status: "ALL", fromDate, toDate },
          }),
        ]);

        if (cancelled) return;

        setStats([
          {
            label: "Customers",
            value: result.customers,
            icon: Users,
            hint: "Active ledgers in master",
          },
          {
            label: "Products",
            value: result.products,
            icon: Package,
            hint: "Stock items catalogued",
          },
          {
            label: "Vouchers",
            value: result.challans,
            icon: FileText,
            hint: "Issued this financial year",
          },
        ]);

        const payload = challans as { rows: typeof recent };
        setRecent(payload.rows ?? []);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load dashboard.");
        }
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    };

    load().catch(() => {
      if (!cancelled) setLoadingRecent(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live snapshot of masters, material movement and pending stock across the desk."
        action={
          <Button asChild>
            <Link to="/delivery-challans/new">
              <Plus size={16} />
              New Voucher
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(340px,auto)]">
        <div className="grid gap-3 rounded-xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">Financial year</span>
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Date range</span>
              <Popover open={datePickerOpen} onOpenChange={(open) => setDatePickerOpen(open)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>
                      {new Date(fromDate).toLocaleDateString()} –{" "}
                      {new Date(toDate).toLocaleDateString()}
                    </span>
                    <CalendarDays className="size-4" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[320px] p-0">
                  <CalendarPopoverContent
                    fromDate={fromDate}
                    toDate={toDate}
                    onApply={(fromIso, toIso) => setDateRange({ fromDate: fromIso, toDate: toIso })}
                    onClose={() => setDatePickerOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DataPanel title="Recent Vouchers" caption="Latest material movement entries">
            <DataTable
              columns={["Voucher No", "Date", "Status", "Customer", "Qty"]}
              numericColumns={["Qty"]}
            >
              {loadingRecent ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-sm text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      icon={<FileText size={20} />}
                      title="No vouchers yet"
                      description="Create your first voucher to start tracking goods sent on approval or job work."
                      action={
                        <Button asChild size="sm">
                          <Link to="/delivery-challans/new">Create voucher</Link>
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                recent.map((challan) => {
                  const qty = (challan.items ?? []).reduce(
                    (sum, item) => sum + Number(item.quantity || 0),
                    0,
                  );
                  return (
                    <tr key={challan.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">
                        {challan.challanNumber}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(challan.challanDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{challan.status}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {challan.customer?.ledgerName ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                        {qty}
                      </td>
                    </tr>
                  );
                })
              )}
            </DataTable>
          </DataPanel>
        </div>

        <Card className="gap-0 overflow-hidden rounded-xl border-border p-0 shadow-none">
          <div className="border-b border-border bg-muted/40 px-5 py-4">
            <h2 className="font-display text-base font-semibold">Quick Actions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Jump straight into daily tasks</p>
          </div>
          <div className="divide-y divide-border">
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-accent/60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
