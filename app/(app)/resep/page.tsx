"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppStore, Recipe } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Clock, Users, AlertTriangle } from "lucide-react";
import { getRecipeImageUrl } from "@/lib/utils";

function getDaysUntilExpiry(expiryDate?: string) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isRecipeUrgent(recipe: Recipe, urgentIngredients: string[]) {
  if (!recipe.ingredients || recipe.ingredients.length === 0) return false;
  const set = new Set(urgentIngredients.map((s) => s.toLowerCase()));
  return recipe.ingredients.some((i) => set.has(i.name.toLowerCase()));
}

export default function ResepPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    ingredients,
    loadIngredients,
    loadSavedRecipes,
    savedRecipes,
    saveRecipe,
    removeSavedRecipe,
  } = useAppStore();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<"" | "easy" | "medium" | "hard">(
    "",
  );
  const [tab, setTab] = useState<"all" | "favorites">(
    searchParams.get("tab") === "favorites" ? "favorites" : "all",
  );
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      try {
        await loadIngredients();
        await loadSavedRecipes();
      } catch {
        if (!cancelled) {
          // ignore
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadIngredients, loadSavedRecipes, router]);

  useEffect(() => {
    const nextTab =
      searchParams.get("tab") === "favorites" ? "favorites" : "all";
    setTab(nextTab);
  }, [searchParams]);

  const urgentIngredientNames = useMemo(() => {
    return ingredients
      .filter((ing) => {
        const days = getDaysUntilExpiry(ing.expiryDate);
        return days !== null && days >= 0 && days <= 2;
      })
      .map((ing) => ing.name);
  }, [ingredients]);

  const recipeList = useMemo(() => {
    const base =
      tab === "favorites"
        ? savedRecipes.filter((r) => r.isFavorite === true)
        : savedRecipes;
    const normalized = query.trim().toLowerCase();
    return base
      .filter((r) => {
        if (!normalized) return true;
        return (
          r.name.toLowerCase().includes(normalized) ||
          r.description.toLowerCase().includes(normalized)
        );
      })
      .filter((r) => {
        if (!difficulty) return true;
        return r.difficulty === difficulty;
      });
  }, [tab, savedRecipes, query, difficulty]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">Resep</div>
          <div className="text-sm text-muted-foreground">
            Cari resep, simpan favorit, dan prioritaskan bahan urgent.
          </div>
        </div>
        <Link href="/generator">
          <Button variant="secondary">Generate</Button>
        </Link>
      </div>

      {actionError && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">
            {actionError}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <Input
              placeholder="Cari resep..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="md:max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant={tab === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("all")}
              >
                Semua
              </Button>
              <Button
                variant={tab === "favorites" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("favorites")}
              >
                Favorit Saya
              </Button>
              <Button
                variant={difficulty === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty("")}
              >
                Semua Level
              </Button>
              <Button
                variant={difficulty === "easy" ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty("easy")}
              >
                Mudah
              </Button>
              <Button
                variant={difficulty === "medium" ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty("medium")}
              >
                Sedang
              </Button>
              <Button
                variant={difficulty === "hard" ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty("hard")}
              >
                Sulit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {recipeList.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-3">
            <div>Belum ada resep.</div>
            <Link href="/generator">
              <Button>Generate Resep</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipeList.map((recipe) => {
            const urgent = isRecipeUrgent(recipe, urgentIngredientNames);
            const fav = recipe.isFavorite === true;
            return (
              <Card key={recipe.id} className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-200">
                <div className="relative h-44 w-full overflow-hidden bg-muted">
                  <Image
                    src={getRecipeImageUrl(recipe.name)}
                    alt={recipe.name}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {urgent && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-red-600/90 backdrop-blur px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                      <AlertTriangle className="h-3 w-3" />
                      URGENT
                    </span>
                  )}
                  {typeof recipe.matchPercentage === "number" && (
                    <span className="absolute top-3 right-3 rounded-full bg-black/75 backdrop-blur px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                      Match {recipe.matchPercentage}%
                    </span>
                  )}
                </div>
                <CardHeader className="pb-2 pt-4 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">
                        <Link
                          href={`/resep/${encodeURIComponent(recipe.id || "")}`}
                          className="hover:underline"
                        >
                          {recipe.name}
                        </Link>
                      </CardTitle>
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {recipe.description}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={fav ? "text-red-500 hover:text-red-600 shrink-0" : "text-muted-foreground shrink-0"}
                      onClick={async () => {
                        setActionError(null);
                        if (!recipe.id) return;
                        try {
                          if (fav) {
                            await removeSavedRecipe(recipe.id);
                            if (tab === "favorites") {
                              setTab("all");
                              router.replace("/resep");
                            }
                          } else {
                            await saveRecipe(recipe);
                          }
                        } catch (e) {
                          setActionError(
                            e instanceof Error
                              ? e.message
                              : "Gagal memperbarui favorit",
                          );
                        }
                      }}
                    >
                      <Heart className="h-5 w-5" fill={fav ? "currentColor" : "none"} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2 border-t border-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {recipe.prepTime + recipe.cookTime}m
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {recipe.servings} porsi
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium">
                      {recipe.difficulty === "easy" ? "Mudah" : recipe.difficulty === "medium" ? "Sedang" : "Sulit"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
