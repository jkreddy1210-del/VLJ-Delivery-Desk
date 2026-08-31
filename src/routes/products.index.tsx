import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Plus, Pencil, Trash2, Search } from "lucide-react";
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
  deleteProductFn,
  deleteProductForeverFn,
  listProductsFn,
  restoreProductFn,
} from "@/routes/api/products";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Products — VLJ Delivery Desk" },
      { name: "description", content: "Manage your stock item master." },
      { property: "og:title", content: "Products — VLJ Delivery Desk" },
      { property: "og:description", content: "Manage your stock item master." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [rows, setRows] = useState<
    Array<{
      id: number;
      productCode: string;
      productName: string;
      hsnCode?: string | null;
      unit: string;
      status: string;
      stockGroup?: { groupName?: string | null } | null;
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
        const result = await listProductsFn({
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
          toast.error(error instanceof Error ? error.message : "Failed to load products.");
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
    await deleteProductFn({ data: { id } });
    setReloadKey((k) => k + 1);
  };

  const handleRestore = async (id: number) => {
    await restoreProductFn({ data: { id } });
    setReloadKey((k) => k + 1);
  };

  const handleDeleteForever = async (id: number) => {
    try {
      await deleteProductForeverFn({ data: { id } });
      setReloadKey((k) => k + 1);
      toast.success("Product permanently deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Cannot permanently delete this product.",
      );
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Masters"
        title="Products"
        description="Stock items with HSN, unit of measure and stock group."
        action={
          <Button asChild>
            <Link to="/products/new">
              <Plus size={16} />
              Add Product
            </Link>
          </Button>
        }
      />

      <DataPanel title="Stock Items" caption={`${total} record${total === 1 ? "" : "s"}`}>
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
              placeholder="Search products..."
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

        <DataTable columns={["Item Name", "Code", "Group", "HSN", "Unit", "Status", "Actions"]}>
          {loading ? (
            <tr>
              <td colSpan={7} className="px-5 py-6 text-sm text-muted-foreground">
                Loading products...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-0">
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <Package size={20} className="text-muted-foreground" />
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      No products found
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Register your jewellery stock items to use them on delivery challans.
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/products/new">Add product</Link>
                  </Button>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((product) => (
              <tr key={product.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-foreground">{product.productName}</td>
                <td className="px-5 py-3 text-muted-foreground">{product.productCode}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {product.stockGroup?.groupName ?? "—"}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{product.hsnCode ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{product.unit}</td>
                <td className="px-5 py-3 text-muted-foreground">{product.status}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {product.status === "ACTIVE" ? (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/products/edit/$id" params={{ id: String(product.id) }}>
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
                          title="Move Product to Recycle Bin"
                          description={`Are you sure you want to move "${product.productName}" to the Recycle Bin? You can restore it later.`}
                          confirmText="Move to Recycle Bin"
                          onConfirm={() => handleDelete(product.id)}
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
                          title="Restore Product"
                          description={`Are you sure you want to restore "${product.productName}"? It will become active again.`}
                          confirmText="Restore"
                          onConfirm={() => handleRestore(product.id)}
                        />
                        <ConfirmDialog
                          trigger={
                            <Button variant="destructive" size="sm">
                              <Trash2 size={14} />
                              Delete Forever
                            </Button>
                          }
                          title="Delete Product Permanently"
                          description={`"${product.productName}" will be permanently deleted. This action cannot be undone.`}
                          confirmText="Delete Forever"
                          onConfirm={() => handleDeleteForever(product.id)}
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
