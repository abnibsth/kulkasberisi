"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Clock, Users, Flame } from "lucide-react";

type TabKey = "bahan" | "langkah" | "nutrisi";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export default function DetailResepPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { ingredients, loadIngredients, loadSavedRecipes, generatedRecipes, savedRecipes, saveRecipe, removeSavedRecipe } = useAppStore();
  const [tab, setTab] = useState<TabKey>("bahan");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        if (!cancelled) router.replace("/login");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled && !data.session) {
        router.replace("/login");
        return;
      }
      try {
        await loadIngredients();
        await loadSavedRecipes();
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadIngredients, loadSavedRecipes, router]);

  const recipe = useMemo(() => {
    const fromGen = generatedRecipes.find((r) => r.id === params.id);
    if (fromGen) return fromGen;
    return savedRecipes.find((r) => r.id === params.id) || null;
  }, [generatedRecipes, savedRecipes, params.id]);

  const isFavorite = useMemo(() => {
    if (!recipe?.id) return false;
    return savedRecipes.some((r) => r.id === recipe.id);
  }, [recipe?.id, savedRecipes]);

  const availableSet = useMemo(() => {
    return new Set(ingredients.map((i) => normalizeName(i.name)));
  }, [ingredients]);

  const perStepMinutes = useMemo(() => {
    if (!recipe?.instructions || recipe.instructions.length === 0) return null;
    const total = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    return Math.max(1, Math.round(total / recipe.instructions.length));
  }, [recipe?.prepTime, recipe?.cookTime, recipe?.instructions]);

  if (!recipe) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground space-y-3">
          <div>Resep tidak ditemukan.</div>
          <Link href="/resep">
            <Button variant="outline">Kembali</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const imageUrl =
    recipe.imageUrl ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80";

  return (
    <div className="space-y-6">
      {actionError && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{actionError}</CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between gap-3">
        <Link href="/resep">
          <Button variant="outline">Kembali</Button>
        </Link>
        <Button
          variant="ghost"
          className={isFavorite ? "text-red-500" : "text-muted-foreground"}
          onClick={async () => {
            setActionError(null);
            if (!recipe.id) return;
            try {
              if (isFavorite) await removeSavedRecipe(recipe.id);
              else await saveRecipe(recipe);
            } catch (e) {
              setActionError(e instanceof Error ? e.message : "Gagal memperbarui favorit");
            }
          }}
        >
          <Heart className="mr-2 h-5 w-5" />
          {isFavorite ? "Favorit" : "Simpan"}
        </Button>
      </div>

      <div className="relative h-56 md:h-80 w-full -mx-6 overflow-hidden">
        <Image src={imageUrl} alt={recipe.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="px-6 pb-6">
            <div className="text-white">
              <div className="text-2xl md:text-3xl font-bold">{recipe.name}</div>
              <div className="text-white/85 mt-1">{recipe.description}</div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Waktu</div>
                <div className="font-medium">{recipe.prepTime + recipe.cookTime} menit</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Porsi</div>
                <div className="font-medium">{recipe.servings}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Kalori</div>
                <div className="font-medium">{recipe.calories ?? "-"} kcal</div>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Kesulitan</div>
              <div className="font-medium capitalize">{recipe.difficulty}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "bahan" ? "default" : "outline"} onClick={() => setTab("bahan")}>
          Bahan-bahan
        </Button>
        <Button variant={tab === "langkah" ? "default" : "outline"} onClick={() => setTab("langkah")}>
          Langkah Memasak
        </Button>
        <Button variant={tab === "nutrisi" ? "default" : "outline"} onClick={() => setTab("nutrisi")}>
          Info Nutrisi
        </Button>
      </div>

      {tab === "bahan" && (
        <Card>
          <CardHeader>
            <CardTitle>Bahan-bahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recipe.ingredients ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Tidak ada detail bahan.</div>
            ) : (
              (recipe.ingredients ?? []).map((ing, idx) => {
                const available = availableSet.has(normalizeName(ing.name));
                return (
                  <div
                    key={`${ing.name}-${idx}`}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                      available ? "border-green-500/30 bg-green-500/10" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{ing.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ing.quantity} {ing.unit}
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${available ? "text-green-700" : "text-muted-foreground"}`}>
                      {available ? "Tersedia" : "Tidak ada"}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {tab === "langkah" && (
        <Card>
          <CardHeader>
            <CardTitle>Langkah Memasak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recipe.instructions.length === 0 ? (
              <div className="text-sm text-muted-foreground">Tidak ada langkah memasak.</div>
            ) : (
              recipe.instructions.map((step, idx) => (
                <div key={idx} className="rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">Langkah {idx + 1}</div>
                    {perStepMinutes && <div className="text-xs text-muted-foreground">± {perStepMinutes} menit</div>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{step}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === "nutrisi" && (
        <Card>
          <CardHeader>
            <CardTitle>Info Nutrisi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border px-3 py-2">
                <div className="text-xs text-muted-foreground">Kalori</div>
                <div className="font-semibold">{recipe.calories ?? "-"} kcal</div>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <div className="text-xs text-muted-foreground">Protein</div>
                <div className="font-semibold">-</div>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <div className="text-xs text-muted-foreground">Karbo</div>
                <div className="font-semibold">-</div>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <div className="text-xs text-muted-foreground">Lemak</div>
                <div className="font-semibold">-</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
