import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataPanel, DataTable } from "@/components/EmptyTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDateFilter } from "@/hooks/useDateFilter";
import { listPendingRegisterFn } from "@/routes/api/reports";
import { toast } from "sonner";

export const Route = createFileRoute("/material-movement/pending-register")({
  head: () => ({
    meta: [
      { title: "Pending Register — VLJ Delivery Desk" },
      { name: "description", content: "Track material movement pending receipt or return." },
      { property: "og:title", content: "Pending Register — VLJ Delivery Desk" },
      { property: "og:description", content: "Track material movement pending receipt or return." },
    ],
  }),
  component: PendingRegisterPage,
});

function PendingRegisterPage() {
  const { fromDate, toDate } = useDateFilter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<
    Array<{
      id: number;
      challanNumber: string;
      date: string | null;
      customer: string;
      item: string;
      pendingQty: number;
      days: number;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await listPendingRegisterFn({
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
            error instanceof Error ? error.message : "Failed to load pending register.",
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
        eyebrow="Operations"
        title="Pending Register"
        description="Every item still lying with a party, ageing since the day it was despatched."
        action={<Badge variant="secondary">Live register</Badge>}
      />

      <DataPanel title="Pending Items" caption={`${total} open line${total === 1 ? "" : "s"}`}>
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
              placeholder="Search by party or item..."
              aria-label="Search by party or item"
              className="h-9 pl-9"
            />
          </div>
        </div>

        <DataTable
          columns={["Challan", "Date", "Customer", "Item", "Pending Qty", "Days"]}
          numericColumns={["Pending Qty", "Days"]}
        >
          {loading ? (
            <tr>
              <td colSpan={6} className="px-5 py-6 text-sm text-muted-foreground">
                Loading pending register...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-0">
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <ClipboardList size={20} className="text-muted-foreground" />
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      Nothing pending
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      All despatched material has been received back or settled.
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-foreground">{row.challanNumber}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{row.customer}</td>
                <td className="px-5 py-3 text-muted-foreground">{row.item}</td>
                <td className="px-5 py-3 text-right text-muted-foreground">{row.pendingQty}</td>
                <td className="px-5 py-3 text-right text-muted-foreground">{row.days}</td>
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
