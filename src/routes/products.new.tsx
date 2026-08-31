import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useUnsaved } from "@/hooks/useUnsaved";
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
import { createProductFn } from "@/routes/api/products";
import { getParentGroupsFn } from "@/routes/api/stock-groups";

export const Route = createFileRoute("/products/new")({
  head: () => ({
    meta: [
      { title: "New Product — VLJ Delivery Desk" },
      { name: "description", content: "Add a new stock item." },
      { property: "og:title", content: "New Product — VLJ Delivery Desk" },
      { property: "og:description", content: "Add a new stock item." },
    ],
  }),
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const [stockGroups, setStockGroups] = useState<{ id: number; groupName: string }[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [stockGroupId, setStockGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { setDirty, registerSaveHandler } = useUnsaved();

  useEffect(() => {
    getParentGroupsFn({ data: {} })
      .then(setStockGroups)
      .catch(() => setStockGroups([]));
  }, []);

  useEffect(() => {
    // register save handler so global guard can save
    registerSaveHandler(async () => {
      // programmatically submit the form
      if (formRef.current) {
        await doSubmit();
      }
    });

    return () => registerSaveHandler(null);
  }, [stockGroupId]);

  const doSubmit = async () => {
    if (!formRef.current) return;
    if (!stockGroupId) {
      setError("Select a stock group");
      throw new Error("missing stock group");
    }

    setSaving(true);
    setError(null);
    const form = new FormData(formRef.current);

    try {
      await createProductFn({
        data: {
          productCode: form.get("productCode")?.toString() || "",
          productName: form.get("productName")?.toString() || "",
          hsnCode: form.get("hsnCode")?.toString() || "",
          unit: form.get("unit")?.toString() || "",
          description: form.get("description")?.toString() || "",
          stockGroupId: Number(stockGroupId),
        },
      });

      setDirty(false);
      setSaving(false);
      navigate({ to: "/products" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
      setSaving(false);
      throw err;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Masters · Products"
        title="New Product"
        description="Register a stock item in the catalogue."
      />
      <form
        ref={formRef}
        onChange={() => setDirty(true)}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await doSubmit();
          } catch (err) {
            // error already handled in doSubmit
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
                {saving ? "Saving..." : "Create Product"}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="Item Code" htmlFor="productCode" required className="md:col-span-1">
              <Input id="productCode" name="productCode" required placeholder="e.g. 22K-BA-08" />
            </Field>
            <Field label="Item Name" htmlFor="productName" required className="md:col-span-1">
              <Input
                id="productName"
                name="productName"
                required
                placeholder="e.g. 22K Gold Bangle — 8 gm"
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
            <Field
              label="HSN Code"
              htmlFor="hsnCode"
              hint="Harmonised tariff code used on invoices"
            >
              <Input id="hsnCode" name="hsnCode" placeholder="7113" />
            </Field>
            <Field label="Unit" htmlFor="unit" required>
              <Input id="unit" name="unit" required placeholder="Nos / Gm / Ct" />
            </Field>
            <Field label="Description" htmlFor="description" className="md:col-span-2">
              <Input id="description" name="description" placeholder="Optional notes" />
            </Field>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </FormSection>
      </form>
    </>
  );
}
