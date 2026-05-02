"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Ingredient } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const CATEGORIES = [
  "sayur",
  "buah",
  "protein",
  "dairy",
  "bumbu",
  "karbohidrat",
  "minuman",
  "lainnya",
] as const;

function getDaysUntilExpiry(expiryDate?: string) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getEffectiveExpiryDate(ing: Ingredient) {
  return ing.expiryDate || ing.estimatedExpiryDate;
}

type StatusKey = "fresh" | "warning" | "urgent" | "expired" | "no_date";

function statusOf(ing: Ingredient): StatusKey {
  const days = getDaysUntilExpiry(getEffectiveExpiryDate(ing));
  if (days === null) return "no_date";
  if (days < 0) return "expired";
  if (days <= 2) return "urgent";
  if (days <= 7) return "warning";
  return "fresh";
}

export default function AnalitikPage() {
  const router = useRouter();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.replace("/login");
          return;
        }
        const token = data.session.access_token;
        const res = await fetch("/api/ingredients?includeUsed=1", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await res.json().catch(() => null)) as { items?: Ingredient[]; error?: string } | null;
        if (!res.ok) throw new Error(payload?.error || "Gagal mengambil data analitik");
        if (!cancelled) {
          setItems(payload?.items ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat analitik");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const summary = useMemo(() => {
    const total = items.length;
    const used = items.filter((i) => Boolean(i.usedAt)).length;
    const expired = items.filter((i) => statusOf(i) === "expired" && !i.usedAt).length;
    const wasteRate = total === 0 ? 0 : Math.round((expired / total) * 100);

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const thisMonth = items.filter((i) => {
      if (!i.createdAt) return true;
      const createdAt = new Date(i.createdAt);
      return createdAt.getMonth() === month && createdAt.getFullYear() === year;
    }).length;
    const savedKg = Math.round(thisMonth * 0.2 * 10) / 10;

    return { total, used, expired, wasteRate, savedKg };
  }, [items]);

  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) counts[cat] = 0;
    for (const i of items) {
      const key = i.category?.toLowerCase() || "lainnya";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max };
  }, [items]);

  const byStatus = useMemo(() => {
    const counts: Record<StatusKey, number> = {
      fresh: 0,
      warning: 0,
      urgent: 0,
      expired: 0,
      no_date: 0,
    };
    for (const i of items.filter((x) => !x.usedAt)) {
      counts[statusOf(i)] += 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return { counts, total };
  }, [items]);

  const achievements = useMemo(() => {
    const badges: string[] = [];
    if (summary.expired === 0 && summary.total >= 5) badges.push("Zero Waste Week");
    if (summary.used >= 10) badges.push("Master Chef");
    if (summary.savedKg >= 5) badges.push("Food Saver");
    return badges;
  }, [summary.expired, summary.total, summary.used, summary.savedKg]);

  const targetKg = 10;
  const progress = Math.min(100, Math.round((summary.savedKg / targetKg) * 100));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold">Analitik</div>
        <div className="text-sm text-muted-foreground">Ringkasan performa dan status bahan.</div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bahan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sudah Dipakai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.used}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Diselamatkan (kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{summary.savedKg}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Waste Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.wasteRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target Bulanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Progress: {summary.savedKg} / {targetKg} kg
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden border">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bahan per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CATEGORIES.map((cat) => {
              const count = byCategory.counts[cat] ?? 0;
              const width = Math.round((count / byCategory.max) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="capitalize">{cat}</div>
                    <div className="text-muted-foreground">{count}</div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden border">
                    <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Bahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden border flex">
              <div className="h-full bg-green-500" style={{ width: `${Math.round((byStatus.counts.fresh / byStatus.total) * 100)}%` }} />
              <div className="h-full bg-amber-400" style={{ width: `${Math.round((byStatus.counts.warning / byStatus.total) * 100)}%` }} />
              <div className="h-full bg-destructive" style={{ width: `${Math.round((byStatus.counts.urgent / byStatus.total) * 100)}%` }} />
              <div className="h-full bg-slate-400" style={{ width: `${Math.round((byStatus.counts.expired / byStatus.total) * 100)}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>Fresh</div>
                <div className="font-medium">{byStatus.counts.fresh}</div>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>Warning</div>
                <div className="font-medium">{byStatus.counts.warning}</div>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>Urgent</div>
                <div className="font-medium">{byStatus.counts.urgent}</div>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>Expired</div>
                <div className="font-medium">{byStatus.counts.expired}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pencapaian</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {achievements.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada badge.</div>
          ) : (
            achievements.map((b) => (
              <span key={b} className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                {b}
              </span>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
