import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Download, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataPanel, DataTable } from "@/components/EmptyTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDateFilter } from "@/hooks/useDateFilter";
import { listStockWithPartyFn } from "@/routes/api/reports";
import { toast } from "sonner";

export const Route = createFileRoute("/reports/stock-with-party")({
  head: () => ({
    meta: [
      { title: "Stock with Party — VLJ Delivery Desk" },
      { name: "description", content: "Report of stock currently held with each party." },
      { property: "og:title", content: "Stock with Party — VLJ Delivery Desk" },
      { property: "og:description", content: "Report of stock currently held with each party." },
    ],
  }),
  component: StockWithPartyPage,
});

function StockWithPartyPage() {
  const { fromDate, toDate } = useDateFilter();
  const location = useLocation();
  const searchFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("search")?.trim() ?? "",
    [location.search],
  );
  const [search, setSearch] = useState(searchFromUrl);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<
    Array<{
      customer: string;
      voucherCount: number;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    setSearch(searchFromUrl);
    setPage(1);
  }, [searchFromUrl]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await listStockWithPartyFn({
          data: { search, page, pageSize, fromDate, toDate },
        });
        if (!cancelled) {
          setRows(result.rows);
          setTotal(result.total);
        }
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          toast.error(
            error instanceof Error ? error.message : "Failed to load stock with party.",
          );
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
  }, [search, page, fromDate, toDate]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Stock with Party"
        description="Consolidated value of jewellery currently held by each customer."
        action={
          <Button variant="outline">
            <Download size={16} />
            Export
          </Button>
        }
      />

      <DataPanel title="Party-wise Summary" caption={`${total} party${total === 1 ? "" : "ies"}`}>
        <div className="border-b border-border px-5 py-3">
          <div className="relative max-w-sm">
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
              placeholder="Search parties..."
              aria-label="Search parties"
              className="h-9 pl-9"
            />
          </div>
        </div>

        <DataTable columns={["Customer", "Vouchers"]} numericColumns={["Vouchers"]}>
          {loading ? (
            <tr>
              <td colSpan={2} className="px-5 py-6 text-sm text-muted-foreground">
                Loading stock with party...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-0">
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <BarChart3 size={20} className="text-muted-foreground" />
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      No data to report
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Once challans are issued, party-wise stock balances will show here.
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.customer} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-foreground">
                  <Link
                    to="/delivery-challans"
                    search={{ search: row.customer }}
                    className="text-sky-600 hover:underline"
                  >
                    {row.customer}
                  </Link>
                </td>
                <td className="px-5 py-3 text-right text-muted-foreground">{row.voucherCount}</td>
              </tr>
            ))
          )}
        </DataTable>

        <div className="flex items-center justify-between px-5 py-3 text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </DataPanel>
    </>
  );
}
