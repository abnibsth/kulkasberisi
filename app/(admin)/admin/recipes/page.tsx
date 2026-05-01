"use client";

import { useEffect, useMemo, useState } from "react";
import { RecipeApprovalCard, type ModerationRecipe } from "@/components/admin/RecipeApprovalCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";

async function getAccessToken() {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type ListPayload = { items: ModerationRecipe[]; warning?: string; error?: string };

export default function AdminRecipesPage() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [items, setItems] = useState<ModerationRecipe[]>([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const selectedList = useMemo(() => Object.keys(selectedIds).filter((id) => selectedIds[id]), [selectedIds]);
  const busy = new Set(busyIds);

  async function load() {
    setLoading(true);
    setError("");
    setWarning("");
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/recipes/pending?status=${encodeURIComponent(tab)}&limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as ListPayload | null;
      if (!res.ok) throw new Error(json?.error || `Gagal load (${res.status})`);
      setItems(json?.items ?? []);
      setWarning(json?.warning ?? "");
      setSelectedIds({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [tab]);

  async function updateOne(id: string, decision: "approve" | "reject", reason?: string) {
    setBusyIds((prev) => [...prev, id]);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/recipes/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ decision, reason }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal update (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal update");
    } finally {
      setBusyIds((prev) => prev.filter((x) => x !== id));
    }
  }

  async function bulkApproveSelected() {
    if (selectedList.length === 0) return;
    setError("");
    setWarning("");
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/recipes/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ action: "APPROVE_SELECTED", ids: selectedList }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; warning?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Bulk approve gagal (${res.status})`);
      if (json?.warning) setWarning(json.warning);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk approve gagal");
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(next: boolean) {
    const map: Record<string, boolean> = {};
    for (const r of items) map[r.id] = next;
    setSelectedIds(map);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recipes Moderation</h1>
          <div className="text-sm text-muted-foreground">Approve / reject resep yang masuk.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toggleAll(true)} disabled={loading || items.length === 0}>
            Select all
          </Button>
          <Button variant="outline" onClick={() => toggleAll(false)} disabled={loading || items.length === 0}>
            Clear
          </Button>
          <Button onClick={bulkApproveSelected} disabled={loading || selectedList.length === 0 || tab !== "pending"}>
            Approve selected ({selectedList.length})
          </Button>
        </div>
      </div>

      {warning ? <div className="p-3 rounded-md border bg-amber-50 text-amber-800 text-sm">{warning}</div> : null}
      {error ? <div className="p-3 rounded-md border bg-destructive/10 text-destructive text-sm">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Tidak ada data.</div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <RecipeApprovalCard
              key={r.id}
              recipe={r}
              selected={Boolean(selectedIds[r.id])}
              onSelectedChange={(next) => setSelectedIds((prev) => ({ ...prev, [r.id]: next }))}
              onApprove={() => void updateOne(r.id, "approve")}
              onReject={(reason) => void updateOne(r.id, "reject", reason)}
              disabled={busy.has(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

