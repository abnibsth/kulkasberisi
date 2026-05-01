"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReviewListItem, type ModerationReview } from "@/components/admin/ReviewListItem";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";

async function getAccessToken() {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type ReviewsPayload = { items: ModerationReview[]; warning?: string; error?: string };

export default function AdminReviewsPage() {
  const [q, setQ] = useState("");
  const [isPublic, setIsPublic] = useState<"ALL" | "true" | "false">("ALL");
  const [rating, setRating] = useState<"ALL" | "5" | "4" | "3" | "2" | "1">("ALL");

  const [items, setItems] = useState<ModerationReview[]>([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    setWarning("");
    try {
      const token = await getAccessToken();
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (isPublic !== "ALL") sp.set("public", isPublic);
      if (rating !== "ALL") sp.set("rating", rating);
      sp.set("limit", "100");
      const res = await fetch(`/api/admin/reviews?${sp.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as ReviewsPayload | null;
      if (!res.ok) throw new Error(json?.error || `Gagal load (${res.status})`);
      setItems(json?.items ?? []);
      setWarning(json?.warning ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [q, isPublic, rating]);

  async function updateReview(id: string, patch: { isPublic?: boolean; isHidden?: boolean }) {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ id, ...patch }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal update (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal update");
    } finally {
      setBusy(false);
    }
  }

  async function deleteReview(id: string) {
    const reason = prompt("Alasan delete (opsional):") ?? "";
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/reviews", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ id, reason }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal delete (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reviews Moderation</h1>
        <div className="text-sm text-muted-foreground">Hide/unhide atau hapus ulasan.</div>
      </div>

      <div className="grid md:grid-cols-3 gap-2">
        <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={isPublic} onValueChange={(v) => setIsPublic(v as typeof isPublic)}>
          <SelectTrigger>
            <SelectValue placeholder="Public" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="true">Public</SelectItem>
            <SelectItem value="false">Private</SelectItem>
          </SelectContent>
        </Select>
        <Select value={rating} onValueChange={(v) => setRating(v as typeof rating)}>
          <SelectTrigger>
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All ratings</SelectItem>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="1">1</SelectItem>
          </SelectContent>
        </Select>
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
            <ReviewListItem
              key={r.id}
              review={r}
              disabled={busy}
              onToggleHidden={(next) => void updateReview(r.id, { isHidden: next })}
              onTogglePublic={(next) => void updateReview(r.id, { isPublic: next })}
              onDelete={() => void deleteReview(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

