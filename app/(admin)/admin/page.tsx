"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatsCard } from "@/components/admin/StatsCard";
import { ExportButton } from "@/components/admin/ExportButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";
import { Users, Utensils, Leaf, TrendingUp, Package, DollarSign, Activity } from "lucide-react";

type AnalyticsPayload = {
  stats: {
    usersTotal: number;
    usersBanned: number;
    recipesTotal: number;
    recipesAi: number;
    recipesUser: number;
    ingredientsTotal: number;
    foodWasteReducedKg: number;
    foodWasteReducedRp: number;
    newUsersThisMonth: number;
  };
  categoryDistribution: Array<{ name: string; count: number }>;
  recent: {
    users: Array<{ id: string; email: string | null; createdAt: string; role: string; banned: boolean }>;
    recipes: Array<{ id: string; name: string; created_at: string; source: string | null }>;
    reviews: Array<{ id: string; display_name: string | null; rating: number; is_public: boolean; created_at: string }>;
  };
  series?: {
    usersNewPerDay30d?: Array<{ day: string; count: number }>;
    usersNewPerMonth12m?: Array<{ month: string; count: number }>;
    recipesCreatedPerDay30d?: Array<{ day: string; count: number }>;
    recipesAiShare30d?: Array<{ day: string; ai: number; total: number }>;
    foodWastePerMonth?: Array<{ month: string; kg: number }>;
    recipesBySource?: Array<{ source: string; count: number }>;
  };
  topAiRecipes?: Array<{ name: string; count: number }>;
};

async function getAccessToken() {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function SimpleLineChart({ data, color = "#10b981" }: { data: Array<{ day: string; count: number }>; color?: string }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.count / max) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="h-32 w-full">
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={`url(#gradient-${color})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

function SimpleBarChart({ data }: { data: Array<{ month: string; kg: number }> }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.kg), 1);
  
  return (
    <div className="h-32 w-full flex items-end gap-1">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div 
            className="w-full bg-primary rounded-t transition-all"
            style={{ height: `${(d.kg / max) * 100}%`, minHeight: d.kg > 0 ? "4px" : "0" }}
          />
          <span className="text-xs text-muted-foreground transform -rotate-45 origin-top-left translate-y-2">
            {d.month.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ name: string; count: number }> }) {
  if (!data || data.length === 0) return (
    <div className="text-sm text-muted-foreground text-center py-8">Belum ada data</div>
  );
  
  const total = data.reduce((a, b) => a + b.count, 0);
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#6b7280"];
  
  let cumulative = 0;
  const segments = data.slice(0, 5).map((d, i) => {
    const percentage = (d.count / total) * 100;
    const start = cumulative;
    cumulative += percentage;
    return {
      ...d,
      percentage,
      color: colors[i % colors.length],
      start,
    };
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {segments.map((seg, i) => {
            const x1 = 50 + 40 * Math.cos((2 * Math.PI * seg.start) / 100);
            const y1 = 50 + 40 * Math.sin((2 * Math.PI * seg.start) / 100);
            const x2 = 50 + 40 * Math.cos((2 * Math.PI * (seg.start + seg.percentage)) / 100);
            const y2 = 50 + 40 * Math.sin((2 * Math.PI * (seg.start + seg.percentage)) / 100);
            const largeArc = seg.percentage > 50 ? 1 : 0;
            return (
              <path
                key={i}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={seg.color}
              />
            );
          })}
          <circle cx="50" cy="50" r="25" fill="white" />
        </svg>
      </div>
      <div className="flex-1 space-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.name}</span>
            <span className="font-medium">{Math.round(seg.percentage)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string>("");
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

  const totalCategoryItems = useMemo(() => {
    return data?.categoryDistribution?.reduce((a, b) => a + b.count, 0) ?? 0;
  }, [data?.categoryDistribution]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="text-sm text-muted-foreground">Ringkasan & aktivitas terbaru.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton href="/api/admin/analytics?export=users" filename="users.csv" label="Export users CSV" />
          <ExportButton href="/api/admin/analytics?export=recipes" filename="recipes.csv" label="Export recipes CSV" />
        </div>
      </div>

      {error ? <div className="p-3 rounded-md border bg-destructive/10 text-destructive text-sm">{error}</div> : null}

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Total Pengguna"
          value={loading ? "..." : data?.stats.usersTotal ?? 0}
          subtitle={loading ? undefined : `+${data?.stats.newUsersThisMonth ?? 0} bulan ini`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Total Resep"
          value={loading ? "..." : data?.stats.recipesTotal ?? 0}
          subtitle={loading ? undefined : `AI: ${data?.stats.recipesAi ?? 0} · User: ${data?.stats.recipesUser ?? 0}`}
          icon={<Utensils className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Makanan Diselamatkan"
          value={loading ? "..." : `${data?.stats.foodWasteReducedKg ?? 0} kg`}
          subtitle={loading ? undefined : `≈ ${formatCurrency(data?.stats.foodWasteReducedRp ?? 0)}`}
          icon={<Leaf className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Total Bahan"
          value={loading ? "..." : data?.stats.ingredientsTotal ?? 0}
          subtitle={loading ? undefined : `${totalCategoryItems} item tercatat`}
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Pertumbuhan Pengguna (30 Hari)
              </CardTitle>
              {usersGrowth !== null && (
                <span className={`text-xs font-medium ${usersGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {usersGrowth >= 0 ? "+" : ""}{usersGrowth}% vs 7 hari sebelumnya
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">Memuat...</div>
            ) : (
              <SimpleLineChart data={data?.series?.usersNewPerDay30d ?? []} color="#10b981" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Kategori Bahan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">Memuat...</div>
            ) : (
              <DonutChart data={data?.categoryDistribution ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Makanan Diselamatkan per Bulan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">Memuat...</div>
            ) : (
              <SimpleBarChart data={data?.series?.foodWastePerMonth ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-primary" />
              Resep berdasarkan Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">Memuat...</div>
            ) : (
              <div className="space-y-3">
                {(data?.series?.recipesBySource ?? []).slice(0, 5).map((item, i) => {
                  const total = data?.series?.recipesBySource?.reduce((a, b) => a + b.count, 0) ?? 1;
                  const pct = Math.round((item.count / total) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize font-medium">{item.source}</span>
                        <span className="text-muted-foreground">{item.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(data?.series?.recipesBySource ?? []).length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">Belum ada data</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
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
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> User
                        </span>
                      </td>
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
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1">
                          <Utensils className="h-3 w-3" /> Recipe
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {r.name} · <span className="capitalize">{r.source ?? "user"}</span>
                      </td>
                      <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                      <td className="py-2">
                        <span className="text-muted-foreground">-</span>
                      </td>
                    </tr>
                  ))}
                  {(data?.recent.reviews ?? []).map((rv) => (
                    <tr key={`rv:${rv.id}`} className="border-b last:border-b-0">
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1">
                          <Activity className="h-3 w-3" /> Review
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {rv.display_name ?? "User"} · ⭐ {rv.rating}
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

      {/* Top AI Recipes */}
      {data?.topAiRecipes && data.topAiRecipes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-primary" />
              Top 10 Resep AI Paling Sering Digenerate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {data.topAiRecipes.slice(0, 10).map((item, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  <span className="text-muted-foreground">{item.count}x</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
