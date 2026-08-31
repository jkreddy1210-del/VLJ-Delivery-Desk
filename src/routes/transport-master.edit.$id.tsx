import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection, Field } from "@/components/FormSection";
import { getTransporterFn, updateTransporterFn } from "@/routes/api/transporters";

export const Route = createFileRoute("/transport-master/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Transporter — VLJ Delivery Desk" },
      { name: "description", content: "Update a transporter." },
    ],
  }),
  component: EditTransporter,
});

function EditTransporter() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const transporterId = Number(id);
  const [values, setValues] = useState({
    name: "",
    mobile: "",
    gstin: "",
    vehicleNumber: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTransporterFn({ data: { id: transporterId } })
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setError("Transporter not found");
          return;
        }
        setValues({
          name: row.name ?? "",
          mobile: row.mobile ?? "",
          gstin: row.gstin ?? "",
          vehicleNumber: row.vehicleNumber ?? "",
          address: row.address ?? "",
        });
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load transporter");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transporterId]);

  if (loading) {
    return (
      <PageHeader
        eyebrow="Masters · Transporters"
        title="Edit Transporter"
        description="Loading..."
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Masters · Transporters"
        title="Edit Transporter"
        description="Update carrier details."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError(null);
          const form = new FormData(e.currentTarget);
          try {
            await updateTransporterFn({
              data: {
                id: transporterId,
                data: {
                  name: form.get("name")?.toString() || "",
                  mobile: form.get("mobile")?.toString() || "",
                  gstin: form.get("gstin")?.toString() || "",
                  vehicleNumber: form.get("vehicleNumber")?.toString() || "",
                  address: form.get("address")?.toString() || "",
                },
              },
            });
            navigate({ to: "/transport-master" });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update transporter");
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
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="Name" htmlFor="name" required className="md:col-span-2">
              <Input id="name" name="name" required defaultValue={values.name} />
            </Field>
            <Field label="Mobile" htmlFor="mobile">
              <Input id="mobile" name="mobile" defaultValue={values.mobile} />
            </Field>
            <Field label="GSTIN" htmlFor="gstin">
              <Input id="gstin" name="gstin" defaultValue={values.gstin} />
            </Field>
            <Field label="Vehicle Number" htmlFor="vehicleNumber">
              <Input id="vehicleNumber" name="vehicleNumber" defaultValue={values.vehicleNumber} />
            </Field>
            <Field label="Address" htmlFor="address" className="md:col-span-2">
              <Input id="address" name="address" defaultValue={values.address} />
            </Field>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </FormSection>
      </form>
    </>
  );
}
