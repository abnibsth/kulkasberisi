"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatsCard } from "@/components/admin/StatsCard";
import { ExportButton } from "@/components/admin/ExportButton";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";
import { Users, Utensils, Leaf, TrendingUp, Package, DollarSign, Activity, RefreshCw } from "lucide-react";

type AnalyticsPayload = {
  stats: {
    usersTotal: number; usersBanned: number; recipesTotal: number;
    recipesAi: number; recipesUser: number; ingredientsTotal: number;
    foodWasteReducedKg: number; foodWasteReducedRp: number; newUsersThisMonth: number;
  };
  categoryDistribution: Array<{ name: string; count: number }>;
  recent: {
    users: Array<{ id: string; email: string | null; createdAt: string; role: string; banned: boolean }>;
    recipes: Array<{ id: string; name: string; created_at: string; source: string | null }>;
    reviews: Array<{ id: string; display_name: string | null; rating: number; is_public: boolean; created_at: string }>;
  };
  series?: {
    usersNewPerDay30d?: Array<{ day: string; count: number }>;
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

// ── Chart: Mini Sparkline ────────────────────────────────────────────────────
function Sparkline({ data, color = "#8b5cf6" }: { data: Array<{ day: string; count: number }>; color?: string }) {
  if (!data || data.length < 2) return <div className="h-16 flex items-center justify-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Belum ada data</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.count / max) * 100}`).join(" ");
  return (
    <div className="w-full">
      <svg viewBox="0 0 100 100" className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sg-${color.replace("#","")}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${pts} 100,100`} fill={`url(#sg-${color.replace("#","")})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-xs mt-1" style={{ color: "rgba(0,0,0,0.3)" }}>
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

// ── Chart: Bar ───────────────────────────────────────────────────────────────
function BarChart({ data, color = "#8b5cf6" }: { data: Array<{ month: string; kg: number }>; color?: string }) {
  if (!data || data.length === 0) return <div className="h-24 flex items-center justify-center text-xs" style={{ color: "rgba(0,0,0,0.3)" }}>Belum ada data</div>;
  const max = Math.max(...data.map(d => d.kg), 1);
  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full rounded-t-lg transition-all" style={{ height: `${(d.kg / max) * 100}%`, minHeight: d.kg > 0 ? "4px" : "0", background: color, opacity: 0.7 + (i / data.length) * 0.3 }} />
        </div>
      ))}
    </div>
  );
}

// ── Chart: Donut ─────────────────────────────────────────────────────────────
function DonutChart({ data }: { data: Array<{ name: string; count: number }> }) {
  if (!data || data.length === 0) return <div className="text-sm text-center py-8" style={{ color: "rgba(0,0,0,0.3)" }}>Belum ada data</div>;
  const total = data.reduce((a, b) => a + b.count, 0);
  const colors = ["#8b5cf6", "#2d6a4f", "#0369a1", "#b45309", "#dc2626", "#6b7280"];
  let cumulative = 0;
  const segments = data.slice(0, 5).map((d, i) => {
    const pct = (d.count / total) * 100;
    const start = cumulative; cumulative += pct;
    return { ...d, pct, color: colors[i % colors.length], start };
  });
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-20 w-20 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {segments.map((seg, i) => {
            const x1 = 50 + 40 * Math.cos((2 * Math.PI * seg.start) / 100);
            const y1 = 50 + 40 * Math.sin((2 * Math.PI * seg.start) / 100);
            const x2 = 50 + 40 * Math.cos((2 * Math.PI * (seg.start + seg.pct)) / 100);
            const y2 = 50 + 40 * Math.sin((2 * Math.PI * (seg.start + seg.pct)) / 100);
            return <path key={i} d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${seg.pct > 50 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={seg.color} />;
          })}
          <circle cx="50" cy="50" r="26" fill="white" />
        </svg>
      </div>
      <div className="flex-1 space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="truncate" style={{ color: "#5a5550" }}>{seg.name}</span>
            <span className="ml-auto font-semibold shrink-0" style={{ color: "#141210" }}>{Math.round(seg.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared card style ────────────────────────────────────────────────────────
const panel = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  borderRadius: "1.25rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
} as React.CSSProperties;

const panelHead = {
  padding: "1rem 1.25rem 0.75rem",
  borderBottom: "1px solid rgba(0,0,0,0.05)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
} as React.CSSProperties;

// ── TYPE BADGE ───────────────────────────────────────────────────────────────
const typeBadge = (type: "user" | "recipe" | "review") => ({
  user:   { bg: "rgba(45,106,79,0.08)",    color: "#2d6a4f",  label: "User"   },
  recipe: { bg: "rgba(139,92,246,0.08)",   color: "#8b5cf6",  label: "Resep"  },
  review: { bg: "rgba(245,158,11,0.08)",   color: "#b45309",  label: "Review" },
}[type]);

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/analytics?series=1", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = await res.json().catch(() => null) as AnalyticsPayload | { error?: string } | null;
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error || `Gagal load (${res.status})`);
      setData(json as AnalyticsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const usersGrowth = useMemo(() => {
    const s = data?.series?.usersNewPerDay30d ?? [];
    if (!s.length) return null;
    const last7 = s.slice(-7).reduce((a, b) => a + b.count, 0);
    const prev7 = s.slice(-14, -7).reduce((a, b) => a + b.count, 0);
    if (prev7 <= 0) return last7 > 0 ? 100 : 0;
    return Math.round(((last7 - prev7) / prev7) * 100);
  }, [data?.series?.usersNewPerDay30d]);

  const totalCategoryItems = useMemo(() => data?.categoryDistribution?.reduce((a, b) => a + b.count, 0) ?? 0, [data?.categoryDistribution]);

  // Merge recent activity into single sorted list
  const recentActivity = useMemo(() => {
    const rows: Array<{ type: "user" | "recipe" | "review"; detail: string; time: string; link?: { href: string; label: string } }> = [
      ...(data?.recent.users ?? []).map(u => ({ type: "user" as const, detail: u.email ?? u.id, time: u.createdAt, link: { href: `/admin/users/${u.id}`, label: "Lihat" } })),
      ...(data?.recent.recipes ?? []).map(r => ({ type: "recipe" as const, detail: `${r.name} · ${r.source ?? "user"}`, time: r.created_at })),
      ...(data?.recent.reviews ?? []).map(rv => ({ type: "review" as const, detail: `${rv.display_name ?? "User"} · ★ ${rv.rating}`, time: rv.created_at, link: { href: "/admin/reviews", label: "Moderasi" } })),
    ];
    rows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return rows.slice(0, 12);
  }, [data?.recent]);

  const LoadBox = () => (
    <div className="h-24 flex items-center justify-center">
      <div className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6" }} />
    </div>
  );

  return (
    <div className="space-y-5 pb-8">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#141210" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "#5a5550" }}>Ringkasan & aktivitas terbaru platform.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors" style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#5a5550" }}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} /> Refresh
          </button>
          <ExportButton href="/api/admin/analytics?export=users"   filename="users.csv"   label="Export Users CSV" />
          <ExportButton href="/api/admin/analytics?export=recipes" filename="recipes.csv" label="Export Recipes CSV" />
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="p-4 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>{error}</div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Total Pengguna"       value={loading ? "—" : data?.stats.usersTotal ?? 0}                subtitle={loading ? undefined : `+${data?.stats.newUsersThisMonth ?? 0} bulan ini`}                  icon={<Users     className="h-4 w-4" />} />
        <StatsCard title="Total Resep"          value={loading ? "—" : data?.stats.recipesTotal ?? 0}              subtitle={loading ? undefined : `AI: ${data?.stats.recipesAi ?? 0} · User: ${data?.stats.recipesUser ?? 0}`} icon={<Utensils  className="h-4 w-4" />} />
        <StatsCard title="Makanan Diselamatkan" value={loading ? "—" : `${data?.stats.foodWasteReducedKg ?? 0} kg`} subtitle={loading ? undefined : `≈ ${formatCurrency(data?.stats.foodWasteReducedRp ?? 0)}`}            icon={<Leaf      className="h-4 w-4" />} />
        <StatsCard title="Total Bahan"          value={loading ? "—" : data?.stats.ingredientsTotal ?? 0}          subtitle={loading ? undefined : `${totalCategoryItems} item tercatat`}                                icon={<Package   className="h-4 w-4" />} />
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* User growth */}
        <div className="lg:col-span-2" style={panel}>
          <div style={panelHead}>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: "#8b5cf6" }} strokeWidth={1.5} />
              <span className="font-semibold text-sm" style={{ color: "#141210" }}>Pertumbuhan Pengguna (30 Hari)</span>
            </div>
            {usersGrowth !== null && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: usersGrowth >= 0 ? "rgba(45,106,79,0.08)" : "rgba(239,68,68,0.08)", color: usersGrowth >= 0 ? "#2d6a4f" : "#dc2626" }}>
                {usersGrowth >= 0 ? "+" : ""}{usersGrowth}% 7h
              </span>
            )}
          </div>
          <div className="p-4">
            {loading ? <LoadBox /> : <Sparkline data={data?.series?.usersNewPerDay30d ?? []} color="#8b5cf6" />}
          </div>
        </div>

        {/* Category donut */}
        <div style={panel}>
          <div style={panelHead}>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" style={{ color: "#8b5cf6" }} strokeWidth={1.5} />
              <span className="font-semibold text-sm" style={{ color: "#141210" }}>Kategori Bahan</span>
            </div>
          </div>
          <div className="p-4">
            {loading ? <LoadBox /> : <DonutChart data={data?.categoryDistribution ?? []} />}
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 2 ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Food waste bar */}
        <div style={panel}>
          <div style={panelHead}>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" style={{ color: "#2d6a4f" }} strokeWidth={1.5} />
              <span className="font-semibold text-sm" style={{ color: "#141210" }}>Makanan Diselamatkan / Bulan</span>
            </div>
          </div>
          <div className="p-4">
            {loading ? <LoadBox /> : <BarChart data={data?.series?.foodWastePerMonth ?? []} color="#2d6a4f" />}
          </div>
        </div>

        {/* Recipe source progress bars */}
        <div style={panel}>
          <div style={panelHead}>
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4" style={{ color: "#8b5cf6" }} strokeWidth={1.5} />
              <span className="font-semibold text-sm" style={{ color: "#141210" }}>Resep berdasarkan Source</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {loading ? <LoadBox /> : (data?.series?.recipesBySource ?? []).length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "rgba(0,0,0,0.3)" }}>Belum ada data</p>
            ) : (
              (data?.series?.recipesBySource ?? []).slice(0, 5).map((item, i) => {
                const total = data?.series?.recipesBySource?.reduce((a, b) => a + b.count, 0) ?? 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium capitalize" style={{ color: "#141210" }}>{item.source}</span>
                      <span style={{ color: "#a09890" }}>{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#8b5cf6" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── RECENT ACTIVITY ── */}
      <div style={panel}>
        <div style={panelHead}>
          <span className="font-semibold text-sm" style={{ color: "#141210" }}>Aktivitas Terbaru</span>
          <span className="text-xs" style={{ color: "#a09890" }}>{recentActivity.length} item</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                {["Tipe", "Detail", "Waktu", "Aksi"].map(h => (
                  <th key={h} className="py-2.5 px-5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#a09890" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="py-6 text-center text-sm" style={{ color: "#a09890" }}>Memuat...</td></tr>
              ) : recentActivity.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-sm" style={{ color: "#a09890" }}>Belum ada aktivitas</td></tr>
              ) : (
                recentActivity.map((row, i) => {
                  const badge = typeBadge(row.type);
                  return (
                    <tr key={i} style={{ borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td className="py-3 px-5 max-w-xs truncate text-sm" style={{ color: "#3d3530" }}>{row.detail}</td>
                      <td className="py-3 px-5 text-xs whitespace-nowrap" style={{ color: "#a09890" }}>{new Date(row.time).toLocaleString("id-ID")}</td>
                      <td className="py-3 px-5">
                        {row.link ? (
                          <Link href={row.link.href} className="text-xs font-semibold hover:underline" style={{ color: "#8b5cf6" }}>{row.link.label}</Link>
                        ) : <span style={{ color: "#d4cfc8" }}>—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TOP AI RECIPES ── */}
      {data?.topAiRecipes && data.topAiRecipes.length > 0 && (
        <div style={panel}>
          <div style={panelHead}>
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4" style={{ color: "#8b5cf6" }} strokeWidth={1.5} />
              <span className="font-semibold text-sm" style={{ color: "#141210" }}>Top 10 Resep AI Paling Sering Digenerate</span>
            </div>
          </div>
          <div className="p-5">
            <ol className="space-y-2.5">
              {data.topAiRecipes.slice(0, 10).map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: i < 3 ? "rgba(139,92,246,0.15)" : "rgba(0,0,0,0.05)", color: i < 3 ? "#8b5cf6" : "#a09890" }}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "#141210" }}>{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: "rgba(139,92,246,0.08)", color: "#8b5cf6" }}>{item.count}×</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
