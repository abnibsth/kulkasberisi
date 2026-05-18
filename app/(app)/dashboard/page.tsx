"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore, Recipe } from "@/lib/store";
import { AlertTriangle, ChefHat, Plus, ScanLine, Sparkles, BarChart3, ArrowRight, Package } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getIngredientCategoryMeta } from "@/components/ingredients/category";

type UserSummary = { name?: string; email?: string } | null;

// ── Shared Styles ──────────────────────────────────────────────────────────
const card = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  borderRadius: "1.25rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)",
} as React.CSSProperties;

const cardInner = {
  background: "rgba(250,249,247,0.8)",
  border: "1px solid rgba(0,0,0,0.05)",
  borderRadius: "0.875rem",
} as React.CSSProperties;

export default function DashboardPage() {
  const router = useRouter();
  const { ingredients, loadIngredients, loadSavedRecipes, savedRecipes } = useAppStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<UserSummary>(null);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) { router.replace("/login"); return; }
        const userRes = await supabase.auth.getUser();
        if (!cancelled) {
          setUser({
            email: userRes.data.user?.email ?? undefined,
            name: (userRes.data.user?.user_metadata as { name?: string } | null)?.name,
          });
        }
        await loadIngredients();
        await loadSavedRecipes().catch(() => undefined);
        if (!cancelled) setLoadError(null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Gagal mengambil data");
      }
    })();
    return () => { cancelled = true; };
  }, [loadIngredients, router]);

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };
  const getEffectiveExpiry = (ing: { expiryDate?: string; estimatedExpiryDate?: string }) =>
    ing.expiryDate || ing.estimatedExpiryDate;

  const warningCount  = ingredients.filter(i => { const d = getDaysUntilExpiry(getEffectiveExpiry(i)); return d !== null && d >= 3 && d <= 7; }).length;
  const urgentCount   = ingredients.filter(i => { const d = getDaysUntilExpiry(getEffectiveExpiry(i)); return d !== null && d >= 0 && d <= 2; }).length;
  const expiredCount  = ingredients.filter(i => { const d = getDaysUntilExpiry(getEffectiveExpiry(i)); return d !== null && d < 0; }).length;
  const attentionCount = warningCount + urgentCount + expiredCount;

  const savedThisMonthKg = useMemo(() => {
    const now = new Date();
    const count = ingredients.filter(i => {
      if (!i.createdAt) return true;
      const d = new Date(i.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return Math.round(count * 0.2 * 10) / 10;
  }, [ingredients]);

  const estimatedSavings = useMemo(() =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(savedThisMonthKg * 25000)
  , [savedThisMonthKg]);

  const todayText = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());
  const greetingName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  const urgentIngredients = useMemo(() =>
    ingredients.map(ing => ({ ing, days: getDaysUntilExpiry(getEffectiveExpiry(ing)) }))
      .filter(x => x.days !== null && x.days <= 2)
      .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
      .slice(0, 8).map(x => x.ing)
  , [ingredients]);

  const nearExpiryIngredients = useMemo(() =>
    ingredients.map(ing => ({ ing, days: getDaysUntilExpiry(getEffectiveExpiry(ing)) }))
      .filter(x => x.days !== null && x.days <= 7)
      .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
      .map(x => x.ing)
  , [ingredients]);

  const fridgeContents = useMemo(() =>
    [...ingredients].sort((a, b) => {
      const da = getDaysUntilExpiry(getEffectiveExpiry(a));
      const db = getDaysUntilExpiry(getEffectiveExpiry(b));
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    }).slice(0, 8)
  , [ingredients]);

  const generateRecommendations = async () => {
    if (urgentIngredients.length === 0) return;
    setIsLoadingRecommendations(true);
    setRecommendationError(null);
    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: urgentIngredients.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
          filters: { maxTime: "30", difficulty: "", vegetarian: false, halal: true },
        }),
      });
      const data = await res.json() as { recipes?: Recipe[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal generate rekomendasi");
      setRecommendedRecipes((data.recipes ?? []).map(r => ({ ...r, id: r.id || crypto.randomUUID(), source: r.source || "ai" })));
    } catch (err) {
      setRecommendationError(err instanceof Error ? err.message : "Gagal generate");
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const expiryPill = (days: number | null) => {
    if (days === null) return { label: "Tanpa exp", bg: "rgba(0,0,0,0.05)", color: "#a09890" };
    if (days < 0)   return { label: `${Math.abs(days)}h lalu`, bg: "rgba(239,68,68,0.1)", color: "#dc2626" };
    if (days === 0) return { label: "Hari ini!", bg: "rgba(239,68,68,0.1)", color: "#dc2626" };
    if (days <= 2)  return { label: `H-${days}`, bg: "rgba(245,158,11,0.1)", color: "#b45309" };
    if (days <= 7)  return { label: `H-${days}`, bg: "rgba(245,158,11,0.07)", color: "#d97706" };
    return { label: `${days}h lagi`, bg: "rgba(45,106,79,0.07)", color: "#2d6a4f" };
  };

  // Stat cards data
  const stats = [
    { value: ingredients.length.toString(), label: "Total Bahan", sub: "di kulkas", color: "#141210", accent: "rgba(0,0,0,0.06)" },
    { value: attentionCount.toString(), label: "Butuh Perhatian", sub: "hampir expired", color: attentionCount > 0 ? "#b45309" : "#2d6a4f", accent: attentionCount > 0 ? "rgba(245,158,11,0.08)" : "rgba(45,106,79,0.06)" },
    { value: `${savedThisMonthKg} kg`, label: "Makanan Selamat", sub: "bulan ini", color: "#2d6a4f", accent: "rgba(45,106,79,0.07)" },
    { value: estimatedSavings, label: "Uang Dihemat", sub: "perkiraan", color: "#141210", accent: "rgba(0,0,0,0.04)" },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* ── GREETING HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#a09890" }}>{todayText}</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: "#141210" }}>
            Halo, {greetingName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5a5550" }}>
            {attentionCount > 0
              ? <><span className="font-semibold" style={{ color: "#b45309" }}>{attentionCount} bahan</span> perlu segera dimasak.</>
              : "Kulkas aman — tidak ada bahan yang perlu perhatian."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bahan/tambah"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: "#141210", color: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Tambah Bahan
          </Link>
          <Link href="/generator"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: "rgba(45,106,79,0.1)", border: "1px solid rgba(45,106,79,0.2)", color: "#2d6a4f" }}>
            <ChefHat className="h-4 w-4" strokeWidth={1.5} /> Generate Resep
          </Link>
        </div>
      </div>

      {/* ── LOAD ERROR ── */}
      {loadError && (
        <div className="p-4 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
          {loadError}
        </div>
      )}

      {/* ── EXPIRY ALERT BANNER ── */}
      {attentionCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: expiredCount > 0 ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)", border: `1px solid ${expiredCount > 0 ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.25)"}` }}>
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: expiredCount > 0 ? "#dc2626" : "#b45309" }} strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: expiredCount > 0 ? "#dc2626" : "#b45309" }}>
              {expiredCount > 0 ? `${expiredCount} bahan sudah expired` : urgentCount > 0 ? `${urgentCount} bahan urgent (0–2 hari)` : `${warningCount} bahan warning (3–7 hari)`}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#5a5550" }}>Prioritaskan bahan yang mendekati kadaluarsa untuk mengurangi food waste.</div>
          </div>
          <Link href="/bahan" className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#5a5550" }}>
            Lihat <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </Link>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ value, label, sub, color, accent }) => (
          <div key={label} className="p-4 rounded-2xl" style={card}>
            <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ background: accent }}>
              <Package className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
            </div>
            <div className="font-bold text-xl md:text-2xl font-mono-nums leading-none mb-1" style={{ color }}>{value}</div>
            <div className="text-xs font-medium" style={{ color: "#3d3530" }}>{label}</div>
            <div className="text-xs" style={{ color: "#a09890" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── URGENT INGREDIENTS ── */}
      {nearExpiryIngredients.length > 0 && (
        <div style={card}>
          <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "#dc2626" }} strokeWidth={1.5} />
              <span className="font-semibold text-sm" style={{ color: "#141210" }}>Harus Dimasak Sekarang</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>{attentionCount}</span>
            </div>
            <Link href="/bahan" className="text-xs font-medium flex items-center gap-1" style={{ color: "#5a5550" }}>
              Semua <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          </div>
          <div className="p-4">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {nearExpiryIngredients.slice(0, 10).map(ingredient => {
                const meta = getIngredientCategoryMeta(ingredient.category);
                const Icon = meta.Icon;
                const days = getDaysUntilExpiry(getEffectiveExpiry(ingredient));
                const pill = expiryPill(days);
                const isUrgent = days !== null && days <= 2;
                return (
                  <div key={ingredient.id} className="min-w-[140px] p-3 rounded-2xl flex-shrink-0"
                    style={{ ...cardInner, border: `1px solid ${isUrgent ? "rgba(245,158,11,0.25)" : "rgba(0,0,0,0.06)"}`, background: isUrgent ? "rgba(254,243,199,0.5)" : "rgba(250,249,247,0.8)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.06)" }}>
                      <Icon className="h-4 w-4" style={{ color: "#5a5550" }} />
                    </div>
                    <div className="font-semibold text-sm truncate mb-0.5" style={{ color: "#141210" }}>{ingredient.name}</div>
                    <div className="text-xs mb-2" style={{ color: "#a09890" }}>{ingredient.quantity} {ingredient.unit}</div>
                    <div className="text-xs font-semibold px-2 py-1 rounded-lg text-center" style={{ background: pill.bg, color: pill.color }}>{pill.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Fridge contents */}
        <div className="lg:col-span-2" style={card}>
          <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <span className="font-semibold text-sm" style={{ color: "#141210" }}>Isi Kulkas</span>
            <Link href="/bahan" className="text-xs font-medium flex items-center gap-1" style={{ color: "#5a5550" }}>
              Lihat Semua <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {fridgeContents.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="h-8 w-8 mx-auto mb-2" style={{ color: "#d4cfc8" }} strokeWidth={1} />
                <p className="text-sm" style={{ color: "#a09890" }}>Belum ada bahan. Tambahkan dari tombol di atas.</p>
              </div>
            ) : (
              fridgeContents.map(ingredient => {
                const days = getDaysUntilExpiry(getEffectiveExpiry(ingredient));
                const pill = expiryPill(days);
                return (
                  <div key={ingredient.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl"
                    style={{ background: days !== null && days < 0 ? "rgba(239,68,68,0.04)" : days !== null && days <= 2 ? "rgba(245,158,11,0.04)" : "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: "#141210" }}>{ingredient.name}</div>
                      <div className="text-xs" style={{ color: "#a09890" }}>
                        {ingredient.quantity} {ingredient.unit} · {getIngredientCategoryMeta(ingredient.category).label}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div style={card}>
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span className="font-semibold text-sm" style={{ color: "#141210" }}>Aksi Cepat</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                { href: "/bahan/tambah", Icon: Plus, label: "Tambah Bahan Baru", primary: true },
                { href: "/resep", Icon: ChefHat, label: "Cari Resep", primary: false },
                { href: "/analitik", Icon: BarChart3, label: "Lihat Statistik", primary: false },
                { href: "/scanner", Icon: ScanLine, label: "Scan Barcode", primary: false },
              ].map(({ href, Icon, label, primary }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={primary
                    ? { background: "#141210", color: "#ffffff" }
                    : { background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", color: "#3d3530" }}>
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div style={card}>
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: "#2d6a4f" }} strokeWidth={1.5} />
                <span className="font-semibold text-sm" style={{ color: "#141210" }}>Resep Rekomendasi</span>
              </div>
              {urgentIngredients.length > 0 && (
                <p className="text-xs mt-1 truncate" style={{ color: "#a09890" }}>
                  {urgentIngredients.map(i => i.name).join(" · ")}
                </p>
              )}
            </div>
            <div className="p-4 space-y-3">
              {urgentIngredients.length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: "#a09890" }}>
                  Rekomendasi muncul saat ada bahan 0–2 hari menuju kadaluarsa.
                </p>
              ) : null}

              {recommendationError && (
                <p className="text-xs" style={{ color: "#dc2626" }}>{recommendationError}</p>
              )}

              {recommendedRecipes.length > 0 && (
                <div className="space-y-2">
                  {recommendedRecipes.slice(0, 3).map(recipe => (
                    <div key={recipe.id} className="p-3 rounded-2xl" style={cardInner}>
                      <div className="font-semibold text-sm" style={{ color: "#141210" }}>{recipe.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#a09890" }}>
                        {recipe.prepTime + recipe.cookTime} mnt · {recipe.servings} porsi · {recipe.difficulty}
                      </div>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: "#5a5550" }}>{recipe.description}</p>
                    </div>
                  ))}
                  <button onClick={() => router.push("/generator")}
                    className="w-full py-2 rounded-2xl text-xs font-semibold transition-colors"
                    style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#5a5550" }}>
                    Lihat Semua Resep
                  </button>
                </div>
              )}

              <button onClick={generateRecommendations}
                disabled={urgentIngredients.length === 0 || isLoadingRecommendations}
                className="w-full py-2.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: urgentIngredients.length === 0 ? "rgba(0,0,0,0.05)" : "rgba(45,106,79,0.1)", border: `1px solid ${urgentIngredients.length === 0 ? "rgba(0,0,0,0.08)" : "rgba(45,106,79,0.2)"}`, color: urgentIngredients.length === 0 ? "#a09890" : "#2d6a4f" }}>
                {isLoadingRecommendations ? (
                  <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Membuat resep...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> Generate Rekomendasi</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
