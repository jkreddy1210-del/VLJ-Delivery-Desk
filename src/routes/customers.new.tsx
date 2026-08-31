import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { CustomerForm } from "@/components/CustomerForm";

export const Route = createFileRoute("/customers/new")({
  head: () => ({
    meta: [
      { title: "New Customer — VLJ Delivery Desk" },
      { name: "description", content: "Add a new customer to the master." },
      { property: "og:title", content: "New Customer — VLJ Delivery Desk" },
      { property: "og:description", content: "Add a new customer to the master." },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        eyebrow="Masters · Customers"
        title="New Customer"
        description="Create a party ledger for challans, approvals and reports."
      />
      <div className="max-w-4xl">
        <CustomerForm mode="new" />
      </div>
    </>
  ),
});
