"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsChart, type ChartPoint } from "@/components/admin/AnalyticsChart";
import { ExportButton } from "@/components/admin/ExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";

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
  series?: {
    usersNewPerDay30d?: Array<{ day: string; count: number }>;
    recipesCreatedPerDay30d?: Array<{ day: string; count: number }>;
    recipesAiShare30d?: Array<{ day: string; ai: number; total: number }>;
  };
  topAiRecipes?: Array<{ name: string; count: number }>;
  error?: string;
};

async function getAccessToken() {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/analytics?series=1", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as AnalyticsPayload | null;
      if (!res.ok) throw new Error(json?.error || `Gagal load (${res.status})`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const userGrowthSeries: ChartPoint[] = useMemo(() => {
    return (data?.series?.usersNewPerDay30d ?? []).map((x) => ({ label: x.day, value: x.count }));
  }, [data?.series?.usersNewPerDay30d]);

  const recipeSeries: ChartPoint[] = useMemo(() => {
    return (data?.series?.recipesCreatedPerDay30d ?? []).map((x) => ({ label: x.day, value: x.count }));
  }, [data?.series?.recipesCreatedPerDay30d]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <div className="text-sm text-muted-foreground">Charts & reports (30 hari terakhir).</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton href="/api/admin/analytics?export=users" filename="users.csv" label="Export users CSV" />
          <ExportButton href="/api/admin/analytics?export=recipes" filename="recipes.csv" label="Export recipes CSV" />
        </div>
      </div>

      {error ? <div className="p-3 rounded-md border bg-destructive/10 text-destructive text-sm">{error}</div> : null}
      {loading ? <div className="text-sm text-muted-foreground">Memuat...</div> : null}

      <div className="grid lg:grid-cols-2 gap-3">
        <AnalyticsChart title="User growth (new per day)" type="line" data={userGrowthSeries} />
        <AnalyticsChart title="Recipe creation rate (per day)" type="bar" data={recipeSeries} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top 10 AI recipes (by frequency, sample)</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.topAiRecipes ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada data.</div>
          ) : (
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              {(data?.topAiRecipes ?? []).slice(0, 10).map((x) => (
                <li key={x.name}>
                  {x.name} <span className="text-muted-foreground">({x.count})</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

