import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { FormSection, Field } from "@/components/FormSection";
import { createCustomerFn, getCustomerFn, updateCustomerFn } from "@/routes/api/customers";

type FieldDef = { name: string; label: string; required?: boolean; type?: string; span?: boolean };

type CustomerValues = {
  ledgerName?: string;
  contactPerson?: string;
  gstin?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  customerType?: "CUSTOMER" | "VENDOR";
};

const identity: FieldDef[] = [
  { name: "ledgerName", label: "Ledger Name", required: true, span: true },
  { name: "contactPerson", label: "Contact Person" },
  { name: "gstin", label: "GSTIN" },
  { name: "mobile", label: "Mobile" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "email", span: true },
];

const address: FieldDef[] = [
  { name: "addressLine1", label: "Address Line 1", span: true },
  { name: "addressLine2", label: "Address Line 2", span: true },
  { name: "city", label: "City" },
  { name: "district", label: "District" },
  { name: "state", label: "State" },
  { name: "pinCode", label: "Pin Code" },
  { name: "country", label: "Country" },
];

function Grid({ fields, values }: { fields: FieldDef[]; values?: CustomerValues }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
      {fields.map((f) => (
        <Field
          key={f.name}
          label={f.label}
          htmlFor={f.name}
          required={f.required}
          className={f.span ? "md:col-span-2" : ""}
        >
          <Input
            id={f.name}
            name={f.name}
            type={f.type}
            required={f.required}
            defaultValue={values?.[f.name as keyof CustomerValues] ?? ""}
          />
        </Field>
      ))}
    </div>
  );
}

export function CustomerForm({ mode, customerId }: { mode: "new" | "edit"; customerId?: number }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState<CustomerValues>({ customerType: "CUSTOMER" });

  useEffect(() => {
    if (mode !== "edit" || !customerId) return;

    let cancelled = false;
    const load = async () => {
      const customer = await getCustomerFn({ data: { id: customerId } });
      if (!cancelled) {
        setValues({
          ledgerName: customer?.ledgerName,
          contactPerson: customer?.contactPerson ?? "",
          gstin: customer?.gstin ?? "",
          mobile: customer?.mobile ?? "",
          phone: customer?.phone ?? "",
          email: customer?.email ?? "",
          addressLine1: customer?.addressLine1 ?? "",
          addressLine2: customer?.addressLine2 ?? "",
          city: customer?.city ?? "",
          district: customer?.district ?? "",
          state: customer?.state ?? "",
          pinCode: customer?.pinCode ?? "",
          country: customer?.country ?? "",
          customerType: customer?.customerType ?? "CUSTOMER",
        });
      }
    };

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [customerId, mode]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
          const form = new FormData(e.currentTarget);
          const payload = {
            ledgerName: form.get("ledgerName")?.toString() || "",
            contactPerson: form.get("contactPerson")?.toString() || "",
            mobile: form.get("mobile")?.toString() || "",
            phone: form.get("phone")?.toString() || "",
            email: form.get("email")?.toString() || "",
            gstin: form.get("gstin")?.toString() || "",
            addressLine1: form.get("addressLine1")?.toString() || "",
            addressLine2: form.get("addressLine2")?.toString() || "",
            city: form.get("city")?.toString() || "",
            district: form.get("district")?.toString() || "",
            state: form.get("state")?.toString() || "",
            pinCode: form.get("pinCode")?.toString() || "",
            country: form.get("country")?.toString() || "",
            customerType: (form.get("customerType")?.toString() || "CUSTOMER") as "CUSTOMER" | "VENDOR",
          };

          if (mode === "edit" && customerId) {
            await updateCustomerFn({ data: { id: customerId, data: payload } });
          } else {
            await createCustomerFn({ data: payload });
          }

          navigate({ to: "/customers" });
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="space-y-6"
    >
      <FormSection title="Party Details" description="Identity, contact information and party classification">
        <Grid fields={identity} values={values} />
        <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
          <Field label="Party Type" htmlFor="customerType" required>
            <select
              id="customerType"
              name="customerType"
              required
              defaultValue={values.customerType ?? "CUSTOMER"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="CUSTOMER">Customer — Stock goes OUT</option>
              <option value="VENDOR">Vendor — Stock comes IN</option>
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Address"
        description="Used on printed challans and despatch documents"
        footer={
          <>
            <Button variant="outline" type="button" asChild>
              <Link to="/customers">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "new" ? "Create Customer" : "Save Changes"}
            </Button>
          </>
        }
      >
        <Grid fields={address} values={values} />
      </FormSection>
    </form>
  );
}
