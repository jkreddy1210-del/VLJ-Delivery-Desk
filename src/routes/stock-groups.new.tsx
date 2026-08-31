import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStockGroupFn, getParentGroupsFn } from "@/routes/api/stock-groups";

export const Route = createFileRoute("/stock-groups/new")({
  component: NewStockGroupPage,
});

function NewStockGroupPage() {
  const navigate = useNavigate();
  const [parentGroups, setParentGroups] = useState<{ id: number; groupName: string }[]>([]);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [parentGroupId, setParentGroupId] = useState("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getParentGroupsFn({ data: {} })
      .then((groups) => {
        if (!cancelled) setParentGroups(groups);
      })
      .catch(() => {
        if (!cancelled) setParentGroups([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setError("Group Name is Required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createStockGroupFn({
        data: {
          groupName: trimmedName,
          description: description.trim() || undefined,
          parentGroupId: parentGroupId === "none" ? null : Number(parentGroupId),
        },
      });
      navigate({ to: "/stock-groups" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save stock group";
      setError(
        message.includes("Unique constraint") || message.includes("P2002")
          ? `Stock group "${trimmedName}" already exists. Please use a different name.`
          : message,
      );
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Masters"
        title="New Stock Group"
        description="Create a stock group to organise inventory."
      />

      <Card className="max-w-3xl">
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Example: Gold Jewellery"
              />
            </div>

            <div className="space-y-2">
              <Label>Parent Group</Label>
              <Select value={parentGroupId} onValueChange={setParentGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="No parent group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent group</SelectItem>
                  {parentGroups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional remarks..."
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : "Save Stock Group"}
            </Button>

            <Button asChild variant="outline">
              <Link to="/stock-groups">
                <ArrowLeft size={16} />
                Cancel
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
