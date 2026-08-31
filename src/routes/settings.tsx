import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection, Field } from "@/components/FormSection";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCompanySettingsFn, saveCompanySettingsFn } from "@/routes/api/company-settings";
import {
  buildChallanNumber,
  CHALLAN_SUFFIX_OPTIONS,
  getFinancialYearLabel,
  type ChallanSuffix,
} from "@/lib/challan-number";
import { COMPANY_LOGO_ACCEPT, COMPANY_LOGO_MAX_BYTES, readLogoFile } from "@/lib/company-logo";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VLJ Delivery Desk" },
      {
        name: "description",
        content: "Company profile and voucher numbering.",
      },
      { property: "og:title", content: "Settings — VLJ Delivery Desk" },
      {
        property: "og:description",
        content: "Company profile and voucher numbering.",
      },
    ],
  }),
  component: SettingsPage,
});

const fields: Array<[string, string, boolean?]> = [
  ["companyName", "Company Name", true],
  ["gstin", "GSTIN"],
  ["pan", "PAN"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["pinCode", "Pincode"],
  ["country", "Country"],
];

function SettingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("VLJ");
  const [nextNo, setNextNo] = useState("1");
  const [financialYear, setFinancialYear] = useState(getFinancialYearLabel());
  const [suffix, setSuffix] = useState<ChallanSuffix>("A");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const settings = await getCompanySettingsFn({ data: {} });
      if (!cancelled) {
        setValues({
          companyName: settings?.companyName ?? "",
          gstin: settings?.gstin ?? "",
          pan: settings?.pan ?? "",
          phone: settings?.phone ?? "",
          email: settings?.email ?? "",
          website: settings?.website ?? "",
          address: settings?.address ?? "",
          city: settings?.city ?? "",
          state: settings?.state ?? "",
          pinCode: settings?.pinCode ?? "",
          country: settings?.country ?? "",
        });
        setPrefix(settings?.challanPrefix ?? "VLJ");
        setNextNo(String(settings?.challanNextNo ?? 1));
        setFinancialYear(settings?.challanFinancialYear || getFinancialYearLabel());
        setSuffix((settings?.challanSuffix as ChallanSuffix) || "A");
        setCompanyLogo(settings?.companyLogo ?? null);
      }
      setLoading(false);
    };

    load().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const preview = buildChallanNumber({
    prefix,
    nextNo: Number(nextNo) || 1,
    financialYear,
    suffix,
  });

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Company profile and voucher numbering."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setMessage(null);
          setError(null);
          const form = new FormData(e.currentTarget);
          try {
            await saveCompanySettingsFn({
              data: {
                companyName: form.get("companyName")?.toString() || "",
                gstin: form.get("gstin")?.toString() || "",
                pan: form.get("pan")?.toString() || "",
                phone: form.get("phone")?.toString() || "",
                email: form.get("email")?.toString() || "",
                website: form.get("website")?.toString() || "",
                address: form.get("address")?.toString() || "",
                city: form.get("city")?.toString() || "",
                state: form.get("state")?.toString() || "",
                pinCode: form.get("pinCode")?.toString() || "",
                country: form.get("country")?.toString() || "",
                companyLogo: companyLogo ?? undefined,
                challanPrefix: prefix,
                challanNextNo: Number(nextNo) || 1,
                challanFinancialYear: financialYear,
                challanSuffix: suffix,
              },
            });
            await queryClient.invalidateQueries({ queryKey: ["company-settings"] });
            setMessage("Settings saved.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save settings");
          } finally {
            setSaving(false);
          }
        }}
        className="max-w-4xl space-y-6"
      >
        <FormSection title="Company Profile" description="Printed on every voucher and report">
          <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
            <Field
              label="Company Logo"
              hint={`PNG, JPG, WEBP, GIF, or ICO · max ${Math.round(COMPANY_LOGO_MAX_BYTES / 1024)} KB · shown in sidebar and print layout`}
            >
              <div className="flex flex-wrap items-center gap-4">
                <CompanyLogo
                  src={companyLogo}
                  className="size-16 rounded-lg"
                  fallbackClassName="size-16"
                  iconSize={24}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={COMPANY_LOGO_ACCEPT}
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      setLogoError(null);
                      try {
                        const dataUrl = await readLogoFile(file);
                        setCompanyLogo(dataUrl);
                      } catch (err) {
                        setLogoError(err instanceof Error ? err.message : "Could not upload logo");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={15} />
                    Upload logo
                  </Button>
                  {companyLogo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCompanyLogo(null);
                        setLogoError(null);
                      }}
                    >
                      <Trash2 size={15} />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
              {logoError ? <p className="mt-2 text-sm text-destructive">{logoError}</p> : null}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            {fields.map(([name, label, required]) => (
              <Field
                key={name}
                label={label}
                htmlFor={name}
                required={required}
                className={name === "address" ? "md:col-span-2" : ""}
              >
                <Input
                  id={name}
                  name={name}
                  required={required}
                  defaultValue={values[name] ?? ""}
                  key={`${name}-${values[name] ?? ""}-${loading ? "loading" : "ready"}`}
                  readOnly={loading}
                />
              </Field>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="Voucher Numbering"
          description="Set prefix, next number, financial year and suffix once. Voucher type picks A / JB / M."
          footer={
            <Button type="submit" disabled={saving || loading}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Prefix" htmlFor="challanPrefix" required>
              <Input
                id="challanPrefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="VLJ"
              />
            </Field>
            <Field
              label="Number"
              htmlFor="challanNextNo"
              required
              hint="Increments after each new voucher"
            >
              <Input
                id="challanNextNo"
                type="number"
                min={1}
                value={nextNo}
                onChange={(e) => setNextNo(e.target.value)}
              />
            </Field>
            <Field label="F. Year" htmlFor="challanFinancialYear" required>
              <Input
                id="challanFinancialYear"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                placeholder="2026-27"
              />
            </Field>
            <Field label="Suffix" htmlFor="challanSuffix" required>
              <Select value={suffix} onValueChange={(value) => setSuffix(value as ChallanSuffix)}>
                <SelectTrigger id="challanSuffix" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHALLAN_SUFFIX_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Preview</p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground">{preview}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Approval → A · Job Work → JB · Marketing → M (from Delivery Type)
            </p>
          </div>

          {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </FormSection>
      </form>
    </>
  );
}
