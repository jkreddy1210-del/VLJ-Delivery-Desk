import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection, Field } from "@/components/FormSection";
import { createTransporterFn } from "@/routes/api/transporters";

export const Route = createFileRoute("/transport-master/new")({
  head: () => ({
    meta: [
      { title: "New Transporter — VLJ Delivery Desk" },
      { name: "description", content: "Add a transporter." },
    ],
  }),
  component: NewTransporter,
});

function NewTransporter() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Masters · Transporters"
        title="New Transporter"
        description="Add a carrier used on delivery vouchers."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError(null);
          const form = new FormData(e.currentTarget);
          try {
            await createTransporterFn({
              data: {
                name: form.get("name")?.toString() || "",
                mobile: form.get("mobile")?.toString() || "",
                gstin: form.get("gstin")?.toString() || "",
                vehicleNumber: form.get("vehicleNumber")?.toString() || "",
                address: form.get("address")?.toString() || "",
              },
            });
            navigate({ to: "/transport-master" });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create transporter");
            setSaving(false);
          }
        }}
        className="max-w-3xl"
      >
        <FormSection
          title="Transporter Details"
          description="Identity and vehicle information"
          footer={
            <>
              <Button variant="outline" type="button" asChild>
                <Link to="/transport-master">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Transporter"}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="Name" htmlFor="name" required className="md:col-span-2">
              <Input id="name" name="name" required placeholder="Carrier name" />
            </Field>
            <Field label="Mobile" htmlFor="mobile">
              <Input id="mobile" name="mobile" placeholder="Mobile number" />
            </Field>
            <Field label="GSTIN" htmlFor="gstin">
              <Input id="gstin" name="gstin" placeholder="GSTIN" />
            </Field>
            <Field label="Vehicle Number" htmlFor="vehicleNumber">
              <Input id="vehicleNumber" name="vehicleNumber" placeholder="e.g. MH12AB1234" />
            </Field>
            <Field label="Address" htmlFor="address" className="md:col-span-2">
              <Input id="address" name="address" placeholder="Optional address" />
            </Field>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </FormSection>
      </form>
    </>
  );
}
