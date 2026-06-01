"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore, Recipe } from "@/lib/store";
import {
  Utensils,
  Clock,
  Flame,
  Share2,
  Bookmark,
  ChefHat,
  Sparkles,
  ImageIcon,
  X,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getRecipeImageUrl } from "@/lib/utils";

// ── Starbucks Design Tokens ─────────────────────────────────────────────────
const C = {
  green:        "#006241",
  accent:       "#00754A",
  house:        "#1E3932",
  uplift:       "#2b5148",
  light:        "#d4e9e2",
  cream:        "#f2f0eb",
  ceramic:      "#edebe9",
  gold:         "#cba258",
  text:         "#33433d",          // Rewards Green – warm, not cold black
  textSoft:     "rgba(51,67,61,0.72)",
  textFaint:    "rgba(51,67,61,0.48)",
  whiteSoft:    "rgba(255,255,255,0.80)",
  whiteFaint:   "rgba(255,255,255,0.55)",
  shadow:       "0px 0px .5px rgba(30,57,50,0.12), 0px 1px 1px rgba(30,57,50,0.20)",
  shadowLg:     "0 32px 64px rgba(30,57,50,0.22)",
};

// ── Types ──────────────────────────────────────────────────────────────────
type ImageState = "idle" | "loading" | "done" | "error";
type RecipeImages = Record<string, { url: string; state: ImageState }>;

// ── Shimmer loading for card images ───────────────────────────────────────
function ImageSkeleton() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2.5"
      style={{
        background: `linear-gradient(135deg, ${C.cream} 0%, ${C.ceramic} 50%, ${C.cream} 100%)`,
      }}
    >
      <div
        className="h-7 w-7 rounded-full border-2 animate-spin"
        style={{ borderColor: C.light, borderTopColor: C.accent }}
      />
      <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: C.textSoft }}>
        <Sparkles className="h-3 w-3" strokeWidth={1.5} />
        AI sedang menggambar...
      </div>
    </div>
  );
}

// ── Match % badge ──────────────────────────────────────────────────────────
function MatchBadge({ pct }: { pct: number }) {
  const bg = pct >= 80 ? C.accent : pct >= 50 ? C.gold : "#c82014";
  return (
    <div
      className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold text-white"
      style={{ background: bg, letterSpacing: "-0.01em" }}
    >
      {pct}% Cocok
    </div>
  );
}

// ── Recipe detail modal ────────────────────────────────────────────────────
function RecipeModal({
  recipe, imageUrl, onClose,
}: {
  recipe: Recipe; imageUrl?: string; onClose: () => void;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const total = recipe.prepTime + recipe.cookTime;
  const diffLabel =
    recipe.difficulty === "easy" ? "Mudah"
    : recipe.difficulty === "medium" ? "Sedang" : "Sulit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,40,34,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        style={{ borderRadius: "16px", background: C.cream, boxShadow: C.shadowLg }}
      >
        {/* ── Hero image – House Green header ── */}
        <div
          className="relative h-56 overflow-hidden flex items-center justify-center"
          style={{ borderRadius: "16px 16px 0 0", background: C.house }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <ChefHat className="h-10 w-10 mx-auto mb-2" style={{ color: C.whiteSoft }} strokeWidth={1.5} />
              <p className="text-sm font-semibold" style={{ color: C.whiteSoft }}>
                {recipe.name}
              </p>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(30,57,50,0.55)", color: "#fff", backdropFilter: "blur(4px)" }}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>

          {/* match badge */}
          {recipe.matchPercentage && <MatchBadge pct={recipe.matchPercentage} />}

          {/* Bottom green overlay label */}
          <div
            className="absolute bottom-0 inset-x-0 px-5 py-3 flex items-center gap-3"
            style={{ background: "linear-gradient(transparent, rgba(30,57,50,0.7))" }}
          >
            {[
              { icon: Clock, label: `${total} mnt` },
              { icon: Flame, label: `${recipe.calories ?? "?"} kal` },
              { icon: Utensils, label: `${recipe.servings} porsi` },
              { icon: ChefHat, label: diffLabel },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
                <Icon className="h-3 w-3" strokeWidth={1.5} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <h2
              className="text-2xl font-bold leading-tight mb-2"
              style={{ color: C.green, letterSpacing: "-0.01em" }}
            >
              {recipe.name}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: C.textSoft }}>
              {recipe.description}
            </p>
          </div>

          {/* Bahan-bahan */}
          <div>
            <div
              className="flex items-center gap-2 mb-3 pb-2"
              style={{ borderBottom: `1px solid ${C.light}` }}
            >
              <div className="h-3 w-0.5 rounded-full" style={{ background: C.accent }} />
              <h3 className="font-semibold text-sm tracking-tight" style={{ color: C.green }}>
                Bahan-bahan
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recipe.ingredients?.map((ing, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm px-3 py-2.5"
                  style={{
                    borderRadius: "10px",
                    background: "#fff",
                    border: `1px solid ${C.light}`,
                  }}
                >
                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: C.accent }} />
                  <span style={{ color: C.text }}>
                    {ing.quantity} {ing.unit}{" "}
                    <span className="font-semibold">{ing.name}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Langkah */}
          <div>
            <div
              className="flex items-center gap-2 mb-3 pb-2"
              style={{ borderBottom: `1px solid ${C.light}` }}
            >
              <div className="h-3 w-0.5 rounded-full" style={{ background: C.accent }} />
              <h3 className="font-semibold text-sm tracking-tight" style={{ color: C.green }}>
                Langkah Memasak
              </h3>
            </div>
            <ol className="space-y-3">
              {recipe.instructions?.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span
                    className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: C.light, color: C.accent }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: C.textSoft, lineHeight: "1.65" }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* CTA pair – gaya Starbucks: filled + outlined */}
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-all active:scale-95"
              style={{ borderRadius: "50px", background: C.accent, letterSpacing: "-0.01em" }}
              onClick={onClose}
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
              Saya mengerti
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all active:scale-95"
              style={{
                borderRadius: "50px",
                border: `1px solid ${C.accent}`,
                color: C.accent,
                letterSpacing: "-0.01em",
              }}
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function GeneratorPage() {
  const router = useRouter();
  const {
    ingredients, loadIngredients,
    generatedRecipes, setGeneratedRecipes,
    isGenerating, setIsGenerating,
    saveRecipe,
  } = useAppStore();

  const [filters, setFilters] = useState({ difficulty: "", maxTime: "", vegetarian: false, halal: true });
  const [mainIngredient, setMainIngredient] = useState("");
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [savingId, setSavingId]       = useState<string | null>(null);
  const [recipeImages, setRecipeImages] = useState<RecipeImages>({});
  const [activeModal, setActiveModal] = useState<Recipe | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!cancelled && !data.session) { router.replace("/login"); return; }
      try { await loadIngredients(); } catch {}
    })();
    return () => { cancelled = true; };
  }, [loadIngredients, router]);

  const fetchImage = async (recipeName: string, signal: AbortSignal) => {
    setRecipeImages(p => ({ ...p, [recipeName]: { url: "", state: "loading" } }));
    try {
      const res  = await fetch("/api/recipes/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeName }), signal,
      });
      const json = await res.json() as { imageUrl?: string; error?: string };
      if (!res.ok || !json.imageUrl) throw new Error(json.error || "No image");
      setRecipeImages(p => ({ ...p, [recipeName]: { url: json.imageUrl!, state: "done" } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "The user aborted a request." && msg !== "AbortError")
        setRecipeImages(p => ({ ...p, [recipeName]: { url: "", state: "error" } }));
    }
  };

  const handleGenerate = async () => {
    if (!ingredients.length) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsGenerating(true); setRecipeImages({}); setSaveError(null);
    try {
      const res  = await fetch("/api/recipes/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: ingredients.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
          mainIngredient: mainIngredient || undefined, filters,
        }),
      });
      const data = await res.json();
      console.log("Data dari backend:", data);
      if (!res.ok || data.error) throw new Error(data.error || "Gagal menghasilkan resep");
      const recipes: Recipe[] = data.recipes || [];
      setGeneratedRecipes(recipes);
      const signal = abortRef.current.signal;
      recipes.forEach(r => {
        if (r.imageUrl) setRecipeImages(p => ({ ...p, [r.name]: { url: r.imageUrl!, state: "done" } }));
        else void fetchImage(r.name, signal);
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Gagal generate");
      setGeneratedRecipes([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = (recipe: Recipe) => {
    (async () => {
      setSaveError(null);
      const id = recipe.id || crypto.randomUUID();
      setSavingId(id);
      try {
        await saveRecipe({ ...recipe, id });
        router.push("/resep?tab=favorites");
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Gagal menyimpan");
      } finally { setSavingId(null); }
    })();
  };

  const handleShare = async (recipe: Recipe) => {
    const text = `${recipe.name}\n\n${recipe.description}\n\nWaktu: ${recipe.prepTime + recipe.cookTime} menit | Porsi: ${recipe.servings}`;
    if (navigator.share) {
      try { await navigator.share({ title: recipe.name, text, url: window.location.href }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", height: "44px", padding: "0 16px",
    fontSize: "14px", borderRadius: "50px",
    background: "#fff", border: `1px solid ${C.light}`,
    color: C.text, outline: "none", cursor: "pointer",
    appearance: "none", letterSpacing: "-0.01em",
  };

  const diffOpts = [{ v:"",l:"Semua" },{ v:"easy",l:"Mudah" },{ v:"medium",l:"Sedang" },{ v:"hard",l:"Sulit" }];
  const timeOpts = [{ v:"",l:"Semua" },{ v:"15",l:"15 mnt" },{ v:"30",l:"30 mnt" },{ v:"45",l:"45 mnt" },{ v:"60",l:"60 mnt" }];

  return (
    <div className="space-y-0 pb-10" style={{ background: C.cream, minHeight: "100%" }}>

      {/* ══════════════════════════════════════════════════════════════
          FEATURE BAND — House Green header (Starbucks feature-band)
          ══════════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl overflow-hidden mb-8"
        style={{ background: C.house }}
      >
        {/* top row – eyebrow */}
        <div className="px-6 pt-6 pb-0">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ background: "rgba(212,233,226,0.15)", color: C.light, letterSpacing: "0.1em" }}
          >
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
            AI Powered
          </span>
        </div>

        {/* split row – 60/40 */}
        <div className="flex flex-col lg:flex-row items-center gap-0">
          {/* left – text */}
          <div className="flex-1 px-6 py-6 lg:py-8">
            <h1
              className="text-2xl lg:text-3xl font-bold leading-tight mb-3"
              style={{ color: "#ffffff", letterSpacing: "-0.01em" }}
            >
              Generator Resep
            </h1>
            <p className="text-sm leading-relaxed max-w-md mb-6" style={{ color: C.whiteSoft }}>
              Masukkan bahan dari kulkasmu. AI akan meracik 1 resep lezat lengkap dengan foto, bahan, dan langkah masak.
            </p>

            {/* CTA pair – Starbucks style: filled white + outlined white */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleGenerate}
                disabled={!ingredients.length || isGenerating}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderRadius: "50px",
                  background: "#ffffff",
                  color: C.accent,
                  border: "1px solid #ffffff",
                  letterSpacing: "-0.01em",
                }}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sedang meracik...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                    Generate Resep ({ingredients.length} bahan)
                  </>
                )}
              </button>

              <Link
                href="/bahan"
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold transition-all active:scale-95"
                style={{
                  borderRadius: "50px",
                  background: "transparent",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.6)",
                  letterSpacing: "-0.01em",
                }}
              >
                Kelola Bahan
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>

            {!ingredients.length && (
              <p className="mt-3 text-[12px]" style={{ color: C.whiteFaint }}>
                Belum ada bahan. Tambahkan bahan terlebih dahulu.
              </p>
            )}
          </div>

          {/* right – stats strip */}
          <div
            className="w-full lg:w-64 px-6 py-5 lg:py-8 flex lg:flex-col gap-4 lg:gap-5 border-t lg:border-t-0 lg:border-l"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            {[
              { label: "Resep dibuat", value: generatedRecipes.length > 0 ? String(generatedRecipes.length) : "0" },
              { label: "Bahan tersedia", value: String(ingredients.length) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "#ffffff", letterSpacing: "-0.01em" }}
                >
                  {value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: C.whiteFaint }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FILTER CARD — white card on cream canvas
          ══════════════════════════════════════════════════════════════ */}
      <div
        className="rounded-xl overflow-hidden mb-8"
        style={{ background: "#ffffff", boxShadow: C.shadow }}
      >
        {/* card header */}
        <div
          className="flex items-center gap-2.5 px-6 py-4"
          style={{ borderBottom: `1px solid ${C.light}` }}
        >
          <ChefHat className="h-4 w-4" style={{ color: C.accent }} strokeWidth={1.5} />
          <span className="font-semibold text-sm tracking-tight" style={{ color: C.text }}>
            Sesuaikan Resep
          </span>
          <span className="text-xs" style={{ color: C.textFaint }}>
            — opsional
          </span>
        </div>

        {/* card body */}
        <div className="p-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {/* Bahan Utama */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.textFaint }}>
                Bahan Utama
              </label>
              <select
                value={mainIngredient}
                onChange={e => setMainIngredient(e.target.value)}
                style={selectStyle}
              >
                <option value="">Pilih bahan...</option>
                {ingredients.map(i => (
                  <option key={i.id ?? i.name} value={i.name}>{i.name}</option>
                ))}
              </select>
              <p className="text-[11px]" style={{ color: C.textFaint }}>AI fokus ke bahan ini</p>
            </div>

            {/* Kesulitan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.textFaint }}>
                Kesulitan
              </label>
              <select
                value={filters.difficulty}
                onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value }))}
                style={selectStyle}
              >
                {diffOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>

            {/* Waktu */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.textFaint }}>
                Waktu Masak
              </label>
              <select
                value={filters.maxTime}
                onChange={e => setFilters(f => ({ ...f, maxTime: e.target.value }))}
                style={selectStyle}
              >
                {timeOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>

            {/* Diet toggles */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.textFaint }}>
                Preferensi
              </label>
              <div className="space-y-3 pt-1">
                {([
                  { key: "vegetarian", label: "Vegetarian" },
                  { key: "halal",      label: "Halal" },
                ] as { key: "vegetarian" | "halal"; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                      className="relative h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0"
                      style={{ background: filters[key] ? C.accent : C.ceramic }}
                    >
                      <div
                        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all"
                        style={{ left: filters[key] ? "calc(100% - 1.1rem)" : "0.125rem" }}
                      />
                    </div>
                    <span className="text-sm tracking-tight" style={{ color: C.text }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ERROR STATE
          ══════════════════════════════════════════════════════════════ */}
      {saveError && (
        <div
          className="mb-6 p-4 text-sm font-medium rounded-xl"
          style={{
            background: "rgba(200,32,20,0.06)",
            border: "1px solid rgba(200,32,20,0.18)",
            color: "#c82014",
          }}
        >
          {saveError}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          EMPTY STATE — white card, centred, editorial spacing
          ══════════════════════════════════════════════════════════════ */}
      {!generatedRecipes.length && !isGenerating && (
        <div
          className="py-20 text-center rounded-xl"
          style={{ background: "#ffffff", boxShadow: C.shadow }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: C.light }}
          >
            <ChefHat className="h-7 w-7" style={{ color: C.accent }} strokeWidth={1.5} />
          </div>
          <p className="font-bold text-lg mb-2 tracking-tight" style={{ color: C.green }}>
            {ingredients.length === 0 ? "Kulkas masih kosong" : "Siap generate!"}
          </p>
          <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: C.textSoft }}>
            {ingredients.length === 0
              ? "Tambahkan bahan ke daftar kulkas, lalu tekan Generate Resep."
              : "Tekan tombol Generate Resep di atas dan biarkan AI meracik 1 resep untukmu."}
          </p>
          {ingredients.length === 0 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link
                href="/bahan"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                style={{ borderRadius: "50px", background: C.accent, letterSpacing: "-0.01em" }}
              >
                Tambah Bahan
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
              <Link
                href="/bahan"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold transition-all active:scale-95"
                style={{
                  borderRadius: "50px",
                  border: `1px solid ${C.accent}`,
                  color: C.accent,
                  letterSpacing: "-0.01em",
                }}
              >
                Lihat Bahan
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          LOADING — skeleton cards
          ══════════════════════════════════════════════════════════════ */}
      {isGenerating && !generatedRecipes.length && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div
              className="h-5 w-1 rounded-full animate-pulse"
              style={{ background: C.accent }}
            />
            <span className="text-sm font-semibold tracking-tight" style={{ color: C.green }}>
              AI sedang meracik resep terbaik...
            </span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ background: "#fff", boxShadow: C.shadow }}>
                <div className="h-48 animate-pulse" style={{ background: C.ceramic }} />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 rounded-full animate-pulse" style={{ background: C.ceramic }} />
                  <div className="h-3 w-full rounded-full animate-pulse" style={{ background: C.cream }} />
                  <div className="h-3 w-1/2 rounded-full animate-pulse" style={{ background: C.cream }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          RESULTS — section header + 2-column (asymmetric) card grid
          ══════════════════════════════════════════════════════════════ */}
      {generatedRecipes.length > 0 && (
        <div className="space-y-5">

          {/* section label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full" style={{ background: C.accent }} />
              <h2 className="font-bold text-base tracking-tight" style={{ color: C.green }}>
                {generatedRecipes.length} Resep Ditemukan
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: C.textFaint }}>
              <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
              Foto dibuat AI
            </div>
          </div>

          {/* ASYMMETRIC GRID — first card spans 2 rows on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {generatedRecipes.map((recipe, idx) => {
              const imgState   = recipeImages[recipe.name];
              const hasImage   = imgState?.state === "done" && imgState.url;
              const isLoading  = imgState?.state === "loading";
              const imageUrl   = hasImage ? imgState.url : recipe.imageUrl || getRecipeImageUrl(recipe.name);
              const diffLabel  = recipe.difficulty === "easy" ? "Mudah" : recipe.difficulty === "medium" ? "Sedang" : "Sulit";
              const diffColor  = recipe.difficulty === "easy" ? C.accent : recipe.difficulty === "medium" ? "#b45309" : "#c82014";

              return (
                <div
                  key={idx}
                  className={`flex flex-col overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${idx === 0 ? "md:row-span-2" : ""}`}
                  style={{ background: "#ffffff", boxShadow: C.shadow }}
                >
                  {/* ── Image ── */}
                  <div
                    className={`relative overflow-hidden cursor-pointer group ${idx === 0 ? "h-64 md:h-72" : "h-44"}`}
                    style={{ background: C.ceramic }}
                    onClick={() => setActiveModal(recipe)}
                  >
                    {isLoading && <ImageSkeleton />}
                    {!isLoading && (
                      <img
                        src={imageUrl}
                        alt={recipe.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    )}

                    {/* hover overlay */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end pb-4 pl-4"
                      style={{ background: "linear-gradient(transparent, rgba(30,57,50,0.45))" }}
                    >
                      <span
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                        style={{ background: "rgba(30,57,50,0.65)", letterSpacing: "-0.01em" }}
                      >
                        Lihat Detail
                      </span>
                    </div>

                    {recipe.matchPercentage && <MatchBadge pct={recipe.matchPercentage} />}

                    {hasImage && (
                      <div
                        className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                        style={{ background: "rgba(30,57,50,0.55)", color: "rgba(255,255,255,0.90)" }}
                      >
                        <Sparkles className="h-2.5 w-2.5" strokeWidth={1.5} />
                        AI Photo
                      </div>
                    )}
                  </div>

                  {/* ── Body ── */}
                  <div className="flex flex-col flex-1 p-5 space-y-3">
                    <div>
                      <h3
                        className="font-bold text-base leading-snug mb-1 tracking-tight"
                        style={{ color: C.text }}
                      >
                        {recipe.name}
                      </h3>
                      <p
                        className="text-xs leading-relaxed line-clamp-2"
                        style={{ color: C.textSoft }}
                      >
                        {recipe.description}
                      </p>
                    </div>

                    {/* Meta strip */}
                    <div
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pb-3"
                      style={{ color: C.textFaint, borderBottom: `1px solid ${C.light}` }}
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {recipe.prepTime + recipe.cookTime} mnt
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {recipe.calories ?? "?"} kal
                      </span>
                      <span>{recipe.servings} porsi</span>
                      <span className="font-semibold" style={{ color: diffColor }}>
                        {diffLabel}
                      </span>
                    </div>

                    {/* Ingredient pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.ingredients?.slice(0, 4).map((ing, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                          style={{ background: C.light, color: C.accent }}
                        >
                          {ing.name}
                        </span>
                      ))}
                      {(recipe.ingredients?.length ?? 0) > 4 && (
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px]"
                          style={{ background: C.ceramic, color: C.textSoft }}
                        >
                          +{(recipe.ingredients?.length ?? 0) - 4}
                        </span>
                      )}
                    </div>

                    {/* Actions – filled + icon-only outlined */}
                    <div className="flex gap-2 pt-1 mt-auto">
                      <button
                        onClick={() => handleSave(recipe)}
                        disabled={savingId === (recipe.id ?? recipe.name)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                        style={{ borderRadius: "50px", background: C.accent, letterSpacing: "-0.01em" }}
                      >
                        <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {savingId === (recipe.id ?? recipe.name) ? "Menyimpan..." : "Simpan"}
                      </button>
                      <button
                        onClick={() => handleShare(recipe)}
                        className="flex items-center justify-center px-3.5 py-2.5 transition-all active:scale-95"
                        style={{
                          borderRadius: "50px",
                          border: `1px solid ${C.light}`,
                          color: C.accent,
                        }}
                        title="Bagikan"
                      >
                        <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setActiveModal(recipe)}
                        className="flex items-center justify-center px-3.5 py-2.5 transition-all active:scale-95"
                        style={{
                          borderRadius: "50px",
                          border: `1px solid ${C.light}`,
                          color: C.accent,
                        }}
                        title="Lihat detail"
                      >
                        <Utensils className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {activeModal && (
        <RecipeModal
          recipe={activeModal}
          imageUrl={
            recipeImages[activeModal.name]?.state === "done"
              ? recipeImages[activeModal.name].url
              : activeModal.imageUrl
          }
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
