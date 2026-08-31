import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { getProductFn, updateProductFn } from "@/routes/api/products";
import { getParentGroupsFn } from "@/routes/api/stock-groups";

export const Route = createFileRoute("/products/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Product — VLJ Delivery Desk" },
      { name: "description", content: "Update a stock item." },
    ],
  }),
  component: EditProduct,
});

function EditProduct() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const productId = Number(id);

  const [stockGroups, setStockGroups] = useState<{ id: number; groupName: string }[]>([]);
  const [stockGroupId, setStockGroupId] = useState("");
  const [values, setValues] = useState({
    productCode: "",
    productName: "",
    hsnCode: "",
    unit: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getProductFn({ data: { id: productId } }), getParentGroupsFn({ data: {} })])
      .then(([product, groups]) => {
        if (cancelled) return;
        setStockGroups(groups);
        if (!product) {
          setError("Product not found");
          return;
        }
        setValues({
          productCode: product.productCode ?? "",
          productName: product.productName ?? "",
          hsnCode: product.hsnCode ?? "",
          unit: product.unit ?? "",
          description: product.description ?? "",
        });
        setStockGroupId(String(product.stockGroupId));
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load product");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <PageHeader eyebrow="Masters · Products" title="Edit Product" description="Loading..." />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Masters · Products"
        title="Edit Product"
        description="Update stock item details."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!stockGroupId) {
            setError("Select a stock group");
            return;
          }

          setSaving(true);
          setError(null);
          const form = new FormData(e.currentTarget);

          try {
            await updateProductFn({
              data: {
                id: productId,
                data: {
                  productCode: form.get("productCode")?.toString() || "",
                  productName: form.get("productName")?.toString() || "",
                  hsnCode: form.get("hsnCode")?.toString() || "",
                  unit: form.get("unit")?.toString() || "",
                  description: form.get("description")?.toString() || "",
                  stockGroupId: Number(stockGroupId),
                },
              },
            });
            navigate({ to: "/products" });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update product");
            setSaving(false);
          }
        }}
        className="max-w-3xl"
      >
        <FormSection
          title="Item Details"
          description="Name, tax classification and unit of measure"
          footer={
            <>
              <Button variant="outline" type="button" asChild>
                <Link to="/products">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="Item Code" htmlFor="productCode" required>
              <Input
                id="productCode"
                name="productCode"
                required
                defaultValue={values.productCode}
              />
            </Field>
            <Field label="Item Name" htmlFor="productName" required>
              <Input
                id="productName"
                name="productName"
                required
                defaultValue={values.productName}
              />
            </Field>
            <Field label="Stock Group" required className="md:col-span-2">
              <Select value={stockGroupId} onValueChange={setStockGroupId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stock group..." />
                </SelectTrigger>
                <SelectContent>
                  {stockGroups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="HSN Code" htmlFor="hsnCode">
              <Input id="hsnCode" name="hsnCode" defaultValue={values.hsnCode} />
            </Field>
            <Field label="Unit" htmlFor="unit" required>
              <Input id="unit" name="unit" required defaultValue={values.unit} />
            </Field>
            <Field label="Description" htmlFor="description" className="md:col-span-2">
              <Input id="description" name="description" defaultValue={values.description} />
            </Field>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </FormSection>
      </form>
    </>
  );
}
