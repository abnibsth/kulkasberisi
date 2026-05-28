"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore, Recipe } from "@/lib/store";
import { Utensils, Clock, Flame, Share2, Bookmark, ChefHat, Sparkles, ImageIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getRecipeImageUrl } from "@/lib/utils";

// ── Styles ──────────────────────────────────────────────────────────────────
const card = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.07)",
  borderRadius: "1.25rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
} as React.CSSProperties;

const inputStyle = {
  height: "2.5rem",
  padding: "0 0.875rem",
  fontSize: "0.875rem",
  borderRadius: "0.875rem",
  background: "rgba(255,255,255,0.8)",
  border: "1px solid rgba(0,0,0,0.1)",
  color: "#141210",
  outline: "none",
  width: "100%",
  transition: "border 0.15s, box-shadow 0.15s",
} as React.CSSProperties;

// ── Image state per recipe ───────────────────────────────────────────────────
type ImageState = "idle" | "loading" | "done" | "error";
type RecipeImages = Record<string, { url: string; state: ImageState }>;

// ── Shimmer placeholder ──────────────────────────────────────────────────────
function ImageSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{ background: "linear-gradient(135deg, #f0ede8 0%, #e8e4de 50%, #f0ede8 100%)" }}>
      <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "rgba(45,106,79,0.2)", borderTopColor: "#2d6a4f" }} />
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#a09890" }}>
        <Sparkles className="h-3 w-3" strokeWidth={1.5} />
        AI sedang menggambar...
      </div>
    </div>
  );
}

// ── Expandable recipe detail modal ──────────────────────────────────────────
function RecipeModal({ recipe, imageUrl, onClose }: { recipe: Recipe; imageUrl?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl"
        style={{ background: "#FEFCF8", boxShadow: "0 40px 80px rgba(0,0,0,0.25)" }}>
        {/* Hero image */}
        <div className="relative h-56 overflow-hidden rounded-t-3xl" style={{ background: "#f0ede8" }}>
          {imageUrl ? (
            <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
          ) : (
            <img src={getRecipeImageUrl(recipe.name)} alt={recipe.name} className="w-full h-full object-cover" />
          )}
          <button onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: "rgba(0,0,0,0.4)", color: "#ffffff" }}>
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
          {recipe.matchPercentage && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: recipe.matchPercentage >= 80 ? "rgba(45,106,79,0.9)" : recipe.matchPercentage >= 50 ? "rgba(180,83,9,0.9)" : "rgba(220,38,38,0.9)" }}>
              {recipe.matchPercentage}% match
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "#141210" }}>{recipe.name}</h2>
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "#5a5550" }}>{recipe.description}</p>
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: `${totalTime} menit`, icon: Clock },
              { label: `${recipe.calories ?? "?"} kal`, icon: Flame },
              { label: `${recipe.servings} porsi`, icon: Utensils },
              { label: recipe.difficulty === "easy" ? "Mudah" : recipe.difficulty === "medium" ? "Sedang" : "Sulit", icon: ChefHat },
            ].map(({ label, icon: Icon }) => (
              <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", color: "#3d3530" }}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />{label}
              </span>
            ))}
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="font-semibold text-sm mb-2" style={{ color: "#141210" }}>Bahan-bahan</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {recipe.ingredients?.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl"
                  style={{ background: "rgba(45,106,79,0.04)", border: "1px solid rgba(45,106,79,0.1)" }}>
                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#2d6a4f" }} />
                  <span style={{ color: "#3d3530" }}>{ing.quantity} {ing.unit} <span className="font-medium">{ing.name}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="font-semibold text-sm mb-2" style={{ color: "#141210" }}>Langkah Memasak</h3>
            <ol className="space-y-2.5">
              {recipe.instructions?.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: "rgba(45,106,79,0.1)", color: "#2d6a4f" }}>{i + 1}</span>
                  <span style={{ color: "#5a5550", lineHeight: "1.5" }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function GeneratorPage() {
  const router = useRouter();
  const { ingredients, loadIngredients, generatedRecipes, setGeneratedRecipes, isGenerating, setIsGenerating, saveRecipe } = useAppStore();

  const [filters, setFilters] = useState({ difficulty: "", maxTime: "", vegetarian: false, halal: true });
  const [mainIngredient, setMainIngredient] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
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

  // Generate an image for a single recipe
  const generateImage = async (recipeName: string, signal: AbortSignal) => {
    setRecipeImages(prev => ({ ...prev, [recipeName]: { url: "", state: "loading" } }));
    try {
      const res = await fetch("/api/recipes/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeName }),
        signal,
      });
      const json = await res.json() as { imageUrl?: string; error?: string };
      if (!res.ok || !json.imageUrl) throw new Error(json.error || "No image");
      setRecipeImages(prev => ({ ...prev, [recipeName]: { url: json.imageUrl!, state: "done" } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "The user aborted a request." && msg !== "AbortError") {
        setRecipeImages(prev => ({ ...prev, [recipeName]: { url: "", state: "error" } }));
      }
    }
  };

  const handleGenerate = async () => {
    if (ingredients.length === 0) return;

    // Cancel any in-progress image generations
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsGenerating(true);
    setRecipeImages({});
    setSaveError(null);

    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: ingredients.map(ing => ({ name: ing.name, quantity: ing.quantity, unit: ing.unit })),
          mainIngredient: mainIngredient || undefined,
          filters,
        }),
      });
      const data = await res.json();
      console.log("Data dari backend sukses diterima frontend:", data);
      if (!res.ok || data.error) throw new Error(data.error || "Gagal menghasilkan resep");
      const recipes: Recipe[] = data.recipes || [];
      setGeneratedRecipes(recipes);

      // ── Proses gambar per resep ─────────────────────────────
      // Jika server sudah menyertakan imageUrl (dari DALL-E via orchestration),
      // langsung tampilkan. Jika null/undefined, fallback ke /api/recipes/image.
      const signal = abortRef.current.signal;

      recipes.forEach(recipe => {
        if (recipe.imageUrl) {
          // Gambar sudah tersedia dari server — tampilkan langsung
          setRecipeImages(prev => ({ ...prev, [recipe.name]: { url: recipe.imageUrl!, state: "done" } }));
        } else {
          // Fallback: generate gambar secara terpisah
          void generateImage(recipe.name, signal);
        }
      });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Gagal generate");
      setGeneratedRecipes([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecipe = (recipe: Recipe) => {
    (async () => {
      setSaveError(null);
      const recipeId = recipe.id || crypto.randomUUID();
      setSavingRecipeId(recipeId);
      try {
        await saveRecipe({ ...recipe, id: recipeId });
        router.push("/resep?tab=favorites");
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Gagal menyimpan");
      } finally {
        setSavingRecipeId(null);
      }
    })();
  };

  const handleShare = async (recipe: Recipe) => {
    const text = `${recipe.name}\n\n${recipe.description}\n\nWaktu: ${recipe.prepTime + recipe.cookTime} menit | Porsi: ${recipe.servings}`;
    if (navigator.share) {
      try { await navigator.share({ title: recipe.name, text, url: window.location.href }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      alert("Resep disalin ke clipboard!");
    }
  };

  const difficultyOpts = [{ v: "", l: "Semua" }, { v: "easy", l: "Mudah" }, { v: "medium", l: "Sedang" }, { v: "hard", l: "Sulit" }];
  const timeOpts = [{ v: "", l: "Semua" }, { v: "15", l: "≤ 15 menit" }, { v: "30", l: "≤ 30 menit" }, { v: "45", l: "≤ 45 menit" }, { v: "60", l: "≤ 60 menit" }];

  const selectStyle = { ...inputStyle, appearance: "none" as const, cursor: "pointer" };

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#141210" }}>Generator Resep</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5550" }}>
          AI akan membuat 3–5 resep dari bahan kulkas kamu, lengkap dengan foto makanan.
        </p>
      </div>

      {/* ── Filter card ── */}
      <div style={card}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <ChefHat className="h-4 w-4" style={{ color: "#2d6a4f" }} strokeWidth={1.5} />
          <span className="font-semibold text-sm" style={{ color: "#141210" }}>Filter Resep</span>
          <span className="text-xs ml-1" style={{ color: "#a09890" }}>— sesuaikan preferensi</span>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Bahan utama */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a09890" }}>Bahan Utama</label>
              <div className="relative">
                <select value={mainIngredient} onChange={e => setMainIngredient(e.target.value)} style={selectStyle}>
                  <option value="">Pilih bahan...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id ?? ing.name} value={ing.name}>{ing.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs" style={{ color: "#a09890" }}>AI fokus bahan ini</p>
            </div>

            {/* Kesulitan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a09890" }}>Kesulitan</label>
              <select value={filters.difficulty} onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value }))} style={selectStyle}>
                {difficultyOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>

            {/* Max time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a09890" }}>Waktu Masak</label>
              <select value={filters.maxTime} onChange={e => setFilters(f => ({ ...f, maxTime: e.target.value }))} style={selectStyle}>
                {timeOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a09890" }}>Diet</label>
              <div className="space-y-2">
                {[
                  { key: "vegetarian" as const, label: "Vegetarian" },
                  { key: "halal" as const, label: "Halal" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <div onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                      className="relative h-5 w-9 rounded-full transition-all cursor-pointer shrink-0"
                      style={{ background: filters[key] ? "#2d6a4f" : "rgba(0,0,0,0.12)" }}>
                      <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all"
                        style={{ left: filters[key] ? "calc(100% - 1.1rem)" : "0.125rem" }} />
                    </div>
                    <span className="text-sm" style={{ color: "#3d3530" }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={ingredients.length === 0 || isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: "linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)", boxShadow: "0 4px 16px rgba(27,67,50,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {isGenerating ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Menghasilkan Resep...</>
            ) : (
              <><Sparkles className="h-4 w-4" strokeWidth={1.5} /> Generate Resep ({ingredients.length} bahan)</>
            )}
          </button>
          {ingredients.length === 0 && (
            <p className="text-xs" style={{ color: "#a09890" }}>
              Tambahkan bahan di halaman <Link href="/bahan" className="font-semibold underline" style={{ color: "#2d6a4f" }}>Bahan</Link> terlebih dahulu.
            </p>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {saveError && (
        <div className="p-4 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>{saveError}</div>
      )}

      {/* ── Empty state ── */}
      {generatedRecipes.length === 0 && !isGenerating && (
        <div className="py-16 text-center" style={card}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(45,106,79,0.06)", border: "1px solid rgba(45,106,79,0.12)" }}>
            <Utensils className="h-7 w-7" style={{ color: "#2d6a4f" }} strokeWidth={1.5} />
          </div>
          <p className="font-semibold mb-1" style={{ color: "#141210" }}>
            {ingredients.length === 0 ? "Belum ada bahan di kulkas" : "Siap untuk generate!"}
          </p>
          <p className="text-sm" style={{ color: "#a09890" }}>
            {ingredients.length === 0 ? "Tambahkan bahan dahulu, lalu tekan Generate Resep." : "Klik tombol Generate Resep di atas untuk mulai."}
          </p>
          {ingredients.length === 0 && (
            <Link href="/bahan"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-2xl text-sm font-semibold text-white"
              style={{ background: "#141210" }}>
              Ke Halaman Bahan
            </Link>
          )}
        </div>
      )}

      {/* ── Recipe cards grid ── */}
      {generatedRecipes.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm" style={{ color: "#141210" }}>{generatedRecipes.length} Resep Ditemukan</h2>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#a09890" }}>
              <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
              Foto dibuat oleh AI
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {generatedRecipes.map((recipe, index) => {
              const imgState = recipeImages[recipe.name];
              const hasImage = imgState?.state === "done" && imgState.url;
              const isImgLoading = imgState?.state === "loading";

              return (
                <div key={index} className="flex flex-col overflow-hidden" style={card}>
                  {/* Image area */}
                  <div className="relative h-48 overflow-hidden cursor-pointer group" style={{ borderRadius: "1.25rem 1.25rem 0 0", background: "#f0ede8" }}
                    onClick={() => setActiveModal(recipe)}>
                    {isImgLoading && <ImageSkeleton />}
                    {hasImage && (
                      <img src={imgState.url} alt={recipe.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                    {!isImgLoading && !hasImage && (
                      <img src={recipe.imageUrl || getRecipeImageUrl(recipe.name)} alt={recipe.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}

                    {/* Match badge */}
                    {recipe.matchPercentage && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold text-white backdrop-blur"
                        style={{ background: recipe.matchPercentage >= 80 ? "rgba(45,106,79,0.9)" : recipe.matchPercentage >= 50 ? "rgba(180,83,9,0.85)" : "rgba(220,38,38,0.85)" }}>
                        {recipe.matchPercentage}% match
                      </div>
                    )}

                    {/* AI image badge */}
                    {hasImage && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold backdrop-blur"
                        style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.9)" }}>
                        <Sparkles className="h-3 w-3" strokeWidth={1.5} /> AI Photo
                      </div>
                    )}

                    {/* Click to expand hint */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.2)" }}>
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-white backdrop-blur"
                        style={{ background: "rgba(0,0,0,0.5)" }}>Lihat Detail</span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-base leading-tight mb-1" style={{ color: "#141210" }}>{recipe.name}</h3>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#5a5550" }}>{recipe.description}</p>
                    </div>

                    {/* Meta strip */}
                    <div className="flex items-center gap-3 text-xs" style={{ color: "#a09890" }}>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" strokeWidth={1.5} />{recipe.prepTime + recipe.cookTime} mnt</span>
                      <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" strokeWidth={1.5} />{recipe.calories ?? "?"} kal</span>
                      <span>·</span>
                      <span>{recipe.servings} porsi</span>
                      <span>·</span>
                      <span className="font-medium" style={{ color: recipe.difficulty === "easy" ? "#2d6a4f" : recipe.difficulty === "hard" ? "#dc2626" : "#b45309" }}>
                        {recipe.difficulty === "easy" ? "Mudah" : recipe.difficulty === "medium" ? "Sedang" : "Sulit"}
                      </span>
                    </div>

                    {/* Ingredients preview */}
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.ingredients?.slice(0, 4).map((ing, i) => (
                        <span key={i} className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ background: "rgba(45,106,79,0.06)", border: "1px solid rgba(45,106,79,0.12)", color: "#2d6a4f" }}>
                          {ing.name}
                        </span>
                      ))}
                      {(recipe.ingredients?.length ?? 0) > 4 && (
                        <span className="px-2 py-1 rounded-lg text-xs" style={{ background: "rgba(0,0,0,0.04)", color: "#a09890" }}>
                          +{(recipe.ingredients?.length ?? 0) - 4}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1 mt-auto">
                      <button onClick={() => handleSaveRecipe(recipe)} disabled={savingRecipeId === (recipe.id ?? recipe.name)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                        style={{ background: "#141210", color: "#ffffff" }}>
                        <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {savingRecipeId === (recipe.id ?? recipe.name) ? "Menyimpan..." : "Simpan"}
                      </button>
                      <button onClick={() => handleShare(recipe)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98]"
                        style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#5a5550" }}>
                        <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => setActiveModal(recipe)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-[0.98]"
                        style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#5a5550" }}>
                        <Utensils className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Recipe detail modal ── */}
      {activeModal && (
        <RecipeModal
          recipe={activeModal}
          imageUrl={recipeImages[activeModal.name]?.state === "done" ? recipeImages[activeModal.name].url : activeModal.imageUrl}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
