import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Plus, Pencil, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataPanel, DataTable } from "@/components/EmptyTable";
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
import {
  deleteTransporterFn,
  deleteTransporterForeverFn,
  listTransportersFn,
  restoreTransporterFn,
} from "@/routes/api/transporters";

export const Route = createFileRoute("/transport-master/")({
  head: () => ({
    meta: [
      { title: "Transporters — VLJ Delivery Desk" },
      { name: "description", content: "Manage transporter master." },
      { property: "og:title", content: "Transporters — VLJ Delivery Desk" },
      { property: "og:description", content: "Manage transporter master." },
    ],
  }),
  component: TransportMasterPage,
});

function TransportMasterPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [rows, setRows] = useState<
    Array<{
      id: number;
      name: string;
      mobile?: string | null;
      vehicleNumber?: string | null;
      gstin?: string | null;
      status: string;
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
        const result = await listTransportersFn({
          data: { search, status, page, pageSize },
        });
        if (!cancelled) {
          setRows(result.rows);
          setTotal(result.total);
        }
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          toast.error(error instanceof Error ? error.message : "Failed to load transporters.");
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
  }, [search, status, page, reloadKey]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const handleDelete = async (id: number) => {
    await deleteTransporterFn({ data: { id } });
    setReloadKey((k) => k + 1);
  };

  const handleRestore = async (id: number) => {
    await restoreTransporterFn({ data: { id } });
    setReloadKey((k) => k + 1);
  };

  const handleDeleteForever = async (id: number) => {
    try {
      await deleteTransporterForeverFn({ data: { id } });
      setReloadKey((k) => k + 1);
      toast.success("Transporter permanently deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Cannot permanently delete this transporter.",
      );
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Masters"
        title="Transporters"
        description="Carriers and courier partners used when despatching consignments."
        action={
          <Button asChild>
            <Link to="/transport-master/new">
              <Plus size={16} />
              New Transporter
            </Link>
          </Button>
        }
      />

      <DataPanel title="Transporters" caption={`${total} record${total === 1 ? "" : "s"}`}>
        <div className="flex items-center gap-4 border-b border-border px-5 py-3">
          <div className="relative max-w-sm flex-1">
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
              placeholder="Search transporters..."
              className="h-9 pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as "ACTIVE" | "INACTIVE" | "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable columns={["Name", "Mobile", "Vehicle", "GSTIN", "Status", "Actions"]}>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-5 py-6 text-sm text-muted-foreground">
                Loading transporters...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-0">
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <Truck size={20} className="text-muted-foreground" />
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      No transporters yet
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add carriers to attach despatch details on every delivery challan.
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/transport-master/new">New Transporter</Link>
                  </Button>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((transporter) => (
              <tr key={transporter.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-foreground">{transporter.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{transporter.mobile ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {transporter.vehicleNumber ?? "—"}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{transporter.gstin ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{transporter.status}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {transporter.status === "ACTIVE" ? (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            to="/transport-master/edit/$id"
                            params={{ id: String(transporter.id) }}
                          >
                            <Pencil size={14} />
                            Edit
                          </Link>
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Trash2 size={14} />
                              Delete
                            </Button>
                          }
                          title="Move Transporter to Recycle Bin"
                          description={`Are you sure you want to move "${transporter.name}" to the Recycle Bin? You can restore it later.`}
                          confirmText="Move to Recycle Bin"
                          onConfirm={() => handleDelete(transporter.id)}
                        />
                      </>
                    ) : (
                      <>
                        <ConfirmDialog
                          trigger={
                            <Button variant="outline" size="sm">
                              Restore
                            </Button>
                          }
                          title="Restore Transporter"
                          description={`Are you sure you want to restore "${transporter.name}"? It will become active again.`}
                          confirmText="Restore"
                          onConfirm={() => handleRestore(transporter.id)}
                        />
                        <ConfirmDialog
                          trigger={
                            <Button variant="destructive" size="sm">
                              <Trash2 size={14} />
                              Delete Forever
                            </Button>
                          }
                          title="Delete Transporter Permanently"
                          description={`"${transporter.name}" will be permanently deleted. This action cannot be undone.`}
                          confirmText="Delete Forever"
                          onConfirm={() => handleDeleteForever(transporter.id)}
                        />
                      </>
                    )}
                  </div>
                </td>
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
