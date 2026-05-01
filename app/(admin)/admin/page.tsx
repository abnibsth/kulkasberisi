"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatsCard } from "@/components/admin/StatsCard";
import { ExportButton } from "@/components/admin/ExportButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";
import { Users, Utensils, AlertTriangle, Leaf } from "lucide-react";

type AnalyticsPayload = {
  stats: {
    usersTotal: number;
    usersBanned: number;
    recipesTotal: number;
    recipesAi: number;
    recipesUser: number;
    ingredientsTotal: number;
    foodWasteReducedKg: number;
    pendingApprovals: number | null;
  };
  recent: {
    users: Array<{ id: string; email: string | null; createdAt: string; role: string; banned: boolean }>;
    recipes: Array<{ id: string; name: string; created_at: string; status: string | null; source: string | null }>;
    reviews: Array<{ id: string; display_name: string | null; rating: number; is_public: boolean; created_at: string }>;
  };
  series?: {
    usersNewPerDay30d?: Array<{ day: string; count: number }>;
  };
  warnings?: Record<string, string | null>;
};

async function getAccessToken() {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/analytics", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as AnalyticsPayload | { error?: string } | null;
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error || `Gagal load (${res.status})`);
      setData(json as AnalyticsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const usersGrowth = useMemo(() => {
    const series = data?.series?.usersNewPerDay30d ?? [];
    const last7 = series.slice(-7).reduce((a, b) => a + b.count, 0);
    const prev7 = series.slice(-14, -7).reduce((a, b) => a + b.count, 0);
    if (!series.length) return null;
    if (prev7 <= 0) return last7 > 0 ? 100 : 0;
    return Math.round(((last7 - prev7) / prev7) * 100);
  }, [data?.series?.usersNewPerDay30d]);

  async function approveAllPending() {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/recipes/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ action: "APPROVE_ALL_PENDING" }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal approve (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal approve");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="text-sm text-muted-foreground">Ringkasan & aktivitas terbaru.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={approveAllPending} disabled={busy}>
            Approve semua pending
          </Button>
          <ExportButton href="/api/admin/analytics?export=users" filename="users.csv" label="Export users CSV" />
        </div>
      </div>

      {error ? <div className="p-3 rounded-md border bg-destructive/10 text-destructive text-sm">{error}</div> : null}
      {data?.warnings?.recipesModeration ? (
        <div className="p-3 rounded-md border bg-amber-50 text-amber-800 text-sm">{data.warnings.recipesModeration}</div>
      ) : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Total Users"
          value={loading ? "..." : data?.stats.usersTotal ?? 0}
          subtitle={usersGrowth === null ? undefined : `Growth 7 hari: ${usersGrowth}%`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Total Recipes"
          value={loading ? "..." : data?.stats.recipesTotal ?? 0}
          subtitle={
            loading
              ? undefined
              : `AI: ${data?.stats.recipesAi ?? 0} · User: ${data?.stats.recipesUser ?? 0}`
          }
          icon={<Utensils className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Food Waste Terkurangi (kg)"
          value={loading ? "..." : data?.stats.foodWasteReducedKg ?? 0}
          subtitle={loading ? undefined : `Berdasarkan bahan yang ditandai terpakai`}
          icon={<Leaf className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Pending Approvals"
          value={loading ? "..." : data?.stats.pendingApprovals ?? 0}
          subtitle={loading ? undefined : "Recipes pending"}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          variant="warning"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Tipe</th>
                <th className="py-2 text-left font-medium">Detail</th>
                <th className="py-2 text-left font-medium">Waktu</th>
                <th className="py-2 text-left font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-3 text-muted-foreground">
                    Memuat...
                  </td>
                </tr>
              ) : (
                <>
                  {(data?.recent.users ?? []).map((u) => (
                    <tr key={`u:${u.id}`} className="border-b last:border-b-0">
                      <td className="py-2">User</td>
                      <td className="py-2 text-muted-foreground">{u.email ?? u.id}</td>
                      <td className="py-2 text-muted-foreground">{new Date(u.createdAt).toLocaleString("id-ID")}</td>
                      <td className="py-2">
                        <Link className="text-primary hover:underline" href={`/admin/users/${u.id}`}>
                          Lihat
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {(data?.recent.recipes ?? []).map((r) => (
                    <tr key={`r:${r.id}`} className="border-b last:border-b-0">
                      <td className="py-2">Recipe</td>
                      <td className="py-2 text-muted-foreground">
                        {r.name} · {r.status ?? "unknown"}
                      </td>
                      <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                      <td className="py-2">
                        <Link className="text-primary hover:underline" href="/admin/recipes">
                          Moderasi
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {(data?.recent.reviews ?? []).map((rv) => (
                    <tr key={`rv:${rv.id}`} className="border-b last:border-b-0">
                      <td className="py-2">Review</td>
                      <td className="py-2 text-muted-foreground">
                        {rv.display_name ?? "User"} · rating {rv.rating}
                      </td>
                      <td className="py-2 text-muted-foreground">{new Date(rv.created_at).toLocaleString("id-ID")}</td>
                      <td className="py-2">
                        <Link className="text-primary hover:underline" href="/admin/reviews">
                          Moderasi
                        </Link>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

