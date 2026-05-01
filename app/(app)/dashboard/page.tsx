"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore, Recipe } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bell, ChefHat, Plus, ScanLine, ArrowRight, Sparkles, BarChart3 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getIngredientCategoryMeta } from "@/components/ingredients/category";

type UserSummary = { name?: string; email?: string } | null;

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
        if (!data.session) {
          router.replace("/login");
          return;
        }

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
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Gagal mengambil data dari Supabase",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadIngredients, router]);

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const expiryIndicator = (expiryDate?: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return null;

    if (days < 0) {
      return (
        <span className="text-xs text-muted-foreground font-medium">
          Expired {Math.abs(days)} hari lalu
        </span>
      );
    } else if (days === 0) {
      return (
        <span className="text-xs text-destructive font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired hari ini
        </span>
      );
    } else if (days <= 2) {
      return (
        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Urgent (H-{days})
        </span>
      );
    } else if (days <= 7) {
      return <span className="text-xs text-amber-600 font-medium">Warning (H-{days})</span>;
    } else {
      return (
        <span className="text-xs text-muted-foreground">
          Fresh ({days} hari lagi)
        </span>
      );
    }
  };

  const warningCount = ingredients.filter((ing) => {
    const days = getDaysUntilExpiry(ing.expiryDate);
    return days !== null && days >= 3 && days <= 7;
  }).length;

  const urgentCount = ingredients.filter((ing) => {
    const days = getDaysUntilExpiry(ing.expiryDate);
    return days !== null && days >= 0 && days <= 2;
  }).length;

  const expiredCount = ingredients.filter((ing) => {
    const days = getDaysUntilExpiry(ing.expiryDate);
    return days !== null && days < 0;
  }).length;

  const almostExpiredCount = warningCount + urgentCount;
  const attentionCount = almostExpiredCount + expiredCount;

  const savedThisMonthKg = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const countThisMonth = ingredients.filter((ing) => {
      if (!ing.createdAt) return true;
      const createdAt = new Date(ing.createdAt);
      return createdAt.getMonth() === month && createdAt.getFullYear() === year;
    }).length;
    const kg = countThisMonth * 0.2;
    return Math.round(kg * 10) / 10;
  }, [ingredients]);

  const estimatedSavings = useMemo(() => {
    const pricePerKg = 25000;
    const money = Math.round(savedThisMonthKg * pricePerKg);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(money);
  }, [savedThisMonthKg]);

  const todayText = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const greetingName = user?.name || user?.email || "User";

  const urgentIngredients = ingredients
    .map((ing) => ({
      ing,
      days: getDaysUntilExpiry(ing.expiryDate),
    }))
    .filter((x) => x.days !== null && x.days <= 2)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
    .slice(0, 8)
    .map((x) => x.ing);

  const nearExpiryIngredients = ingredients
    .map((ing) => ({
      ing,
      days: getDaysUntilExpiry(ing.expiryDate),
    }))
    .filter((x) => x.days !== null && x.days <= 7)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
    .map((x) => x.ing);

  const fridgeContents = useMemo(() => {
    return [...ingredients]
      .sort((a, b) => {
        const da = getDaysUntilExpiry(a.expiryDate);
        const db = getDaysUntilExpiry(b.expiryDate);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      })
      .slice(0, 6);
  }, [ingredients]);

  const generateRecommendations = async () => {
    if (urgentIngredients.length === 0) return;
    setIsLoadingRecommendations(true);
    setRecommendationError(null);
    try {
      const response = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: urgentIngredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
          filters: {
            maxTime: "30",
            difficulty: "",
            vegetarian: false,
            halal: true,
          },
        }),
      });

      const data = (await response.json()) as { recipes?: Recipe[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Gagal generate rekomendasi resep");
      }
      setRecommendedRecipes(
        (data.recipes ?? []).map((r) => ({
          ...r,
          id: r.id || crypto.randomUUID(),
          source: r.source || "ai",
        })),
      );
    } catch (err) {
      setRecommendationError(err instanceof Error ? err.message : "Gagal generate rekomendasi");
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const pageIntro = useMemo(() => {
    if (expiredCount > 0) return `${expiredCount} bahan sudah expired.`;
    if (urgentCount > 0) return `${urgentCount} bahan urgent (0–2 hari).`;
    if (warningCount > 0) return `${warningCount} bahan warning (3–7 hari).`;
    return "Tidak ada bahan yang perlu perhatian.";
  }, [expiredCount, urgentCount, warningCount]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Halo, {greetingName}</h1>
          <div className="text-sm text-muted-foreground">{todayText}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {attentionCount > 0 ? (
              <>
                Hari ini ada{" "}
                <span className="font-semibold text-foreground">{attentionCount} bahan</span>{" "}
                yang perlu segera dimasak.
              </>
            ) : (
              pageIntro
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/bahan/tambah">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Bahan
            </Button>
          </Link>
          <Link href="/generator">
            <Button variant="secondary">
              <ChefHat className="mr-2 h-4 w-4" />
              Generate Resep
            </Button>
          </Link>
        </div>
      </div>

      {loadError && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      )}

      {(expiredCount > 0 || urgentCount > 0 || warningCount > 0) && (
        <Card
          className={`${
            expiredCount > 0
              ? "border-destructive/50"
              : urgentCount > 0
                ? "border-amber-500/60"
                : "border-amber-500/30"
          }`}
        >
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${expiredCount > 0 ? "text-destructive" : "text-amber-600"}`}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className={`font-semibold ${expiredCount > 0 ? "text-destructive" : "text-foreground"}`}>
                  {expiredCount > 0
                    ? `${expiredCount} bahan sudah expired`
                    : urgentCount > 0
                      ? `${urgentCount} bahan urgent (0–2 hari)`
                      : `${warningCount} bahan warning (3–7 hari)`}
                </div>
                <div className="text-sm text-muted-foreground">
                  Prioritaskan bahan yang mendekati kadaluarsa untuk mengurangi food waste.
                </div>
              </div>
              <Link href="/bahan">
                <Button variant="outline" size="sm">
                  Lihat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bahan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ingredients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Butuh Perhatian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{attentionCount}</div>
            <div className="text-xs text-muted-foreground">
              hampir/sudah expired
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Makanan Selamat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{savedThisMonthKg} kg</div>
            <div className="text-xs text-muted-foreground">bulan ini</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uang Dihemat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estimatedSavings}</div>
            <div className="text-xs text-muted-foreground">perkiraan</div>
          </CardContent>
        </Card>
      </div>

      <Card className={attentionCount > 0 ? "border-destructive/30 bg-destructive/5" : undefined}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-destructive" />
              Harus Dimasak Sekarang!
            </CardTitle>
            <Link href="/bahan">
              <Button variant="ghost" size="sm" className="gap-1">
                Semua <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            {attentionCount > 0 ? `${attentionCount} bahan perlu perhatian` : "Tidak ada bahan urgent hari ini."}
          </div>
        </CardHeader>
        <CardContent>
          {nearExpiryIngredients.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada bahan yang mendekati kadaluarsa.</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {nearExpiryIngredients.slice(0, 10).map((ingredient) => {
                const meta = getIngredientCategoryMeta(ingredient.category);
                const Icon = meta.Icon;
                const days = getDaysUntilExpiry(ingredient.expiryDate);
                const badgeText =
                  days === null
                    ? "-"
                    : days < 0
                      ? `Kadaluarsa ${Math.abs(days)} hari lalu`
                      : days === 0
                        ? "Kadaluarsa hari ini!"
                        : `${days} hari lagi`;
                const borderClass =
                  days !== null && days < 0
                    ? "border-destructive/40 bg-destructive/10"
                    : days !== null && days <= 2
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-muted bg-background";
                return (
                  <div
                    key={ingredient.id}
                    className={`min-w-[160px] rounded-xl border p-3 ${borderClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-8 w-8 rounded-lg bg-background/70 border flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="h-2 w-2 rounded-full bg-destructive/70" />
                    </div>
                    <div className="mt-2 font-semibold truncate">{ingredient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ingredient.quantity} {ingredient.unit}
                    </div>
                    <div className="mt-2 text-xs font-medium text-destructive">{badgeText}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Isi Kulkas Kamu</CardTitle>
              <Link href="/bahan">
                <Button variant="ghost" size="sm" className="gap-1">
                  Lihat Semua <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {fridgeContents.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada bahan. Tambahkan dari tombol di kanan.</div>
            ) : (
              fridgeContents.map((ingredient) => {
                const days = getDaysUntilExpiry(ingredient.expiryDate);
                const pillClass =
                  days !== null && days < 0
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : days !== null && days <= 2
                      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                      : "bg-muted text-muted-foreground border-border";
                const pillText =
                  days === null
                    ? "Tanpa exp"
                    : days < 0
                      ? `Kadaluarsa ${Math.abs(days)} hari lalu`
                      : days === 0
                        ? "Kadaluarsa hari ini!"
                        : `${days} hari lagi`;
                return (
                  <div
                    key={ingredient.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                      days !== null && days < 0
                        ? "border-destructive/30 bg-destructive/5"
                        : days !== null && days <= 2
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{ingredient.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit} • {getIngredientCategoryMeta(ingredient.category).label}
                      </div>
                    </div>
                    <div className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${pillClass}`}>
                      {pillText}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/bahan/tambah" className="block">
                <Button className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Bahan Baru
                </Button>
              </Link>
              <Link href="/resep" className="block">
                <Button variant="secondary" className="w-full justify-start gap-2">
                  <ChefHat className="h-4 w-4" />
                  Cari Resep
                </Button>
              </Link>
              <Link href="/analitik" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Lihat Statistik
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push("/scanner")}>
                <ScanLine className="h-4 w-4" />
                Scan Barcode
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resep Rekomendasi (Urgent)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {urgentIngredients.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Belum ada bahan urgent. Rekomendasi muncul saat ada bahan 0–2 hari menuju kadaluarsa.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Berdasarkan: {urgentIngredients.map((i) => i.name).join(" • ")}
                </div>
              )}

              {recommendationError && <div className="text-sm text-destructive">{recommendationError}</div>}

              <Button
                onClick={generateRecommendations}
                disabled={urgentIngredients.length === 0 || isLoadingRecommendations}
                className="w-full"
              >
                {isLoadingRecommendations ? "Membuat rekomendasi..." : "Generate Rekomendasi"}
              </Button>

              {recommendedRecipes.length > 0 && (
                <div className="space-y-3">
                  {recommendedRecipes.slice(0, 3).map((recipe) => (
                    <div key={recipe.id} className="rounded-lg border p-3">
                      <div className="font-semibold">{recipe.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {recipe.prepTime + recipe.cookTime} menit • {recipe.servings} porsi • {recipe.difficulty}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{recipe.description}</div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => router.push("/generator")}>
                    Lihat Semua Resep
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
