import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { CustomerForm } from "@/components/CustomerForm";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/customers/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Customer — VLJ Delivery Desk" },
      { name: "description", content: "Edit customer master details." },
      { property: "og:title", content: "Edit Customer — VLJ Delivery Desk" },
      { property: "og:description", content: "Edit customer master details." },
    ],
  }),
  component: EditCustomer,
});

function EditCustomer() {
  const { id } = Route.useParams();
  const customerId = Number(id);

  return (
    <>
      <PageHeader
        eyebrow="Masters · Customers"
        title="Edit Customer"
        description="Update contact and address details for this party ledger."
        action={<Badge variant="secondary">Ledger #{id}</Badge>}
      />
      <div className="max-w-4xl">
        <CustomerForm mode="edit" customerId={customerId} />
      </div>
    </>
  );
}
