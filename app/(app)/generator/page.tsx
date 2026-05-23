"use client";

import { useEffect, useState } from "react";
import { useAppStore, Recipe } from "@/lib/store";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Utensils, Clock, Flame, Share2, Bookmark } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getRecipeImageUrl } from "@/lib/utils";

export default function GeneratorPage() {
  const router = useRouter();
  const {
    ingredients,
    loadIngredients,
    generatedRecipes,
    setGeneratedRecipes,
    isGenerating,
    setIsGenerating,
    saveRecipe,
  } = useAppStore();
  const [filters, setFilters] = useState({
    difficulty: "",
    maxTime: "",
    vegetarian: false,
    halal: true,
  });
  const [mainIngredient, setMainIngredient] = useState<string>("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!cancelled && !data.session) {
        router.replace("/login");
        return;
      }
      try {
        await loadIngredients();
      } catch {
        if (!cancelled) {
          // ignore
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadIngredients, router]);

  const handleGenerate = async () => {
    if (ingredients.length === 0) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
          mainIngredient: mainIngredient || undefined,
          filters,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Gagal menghasilkan resep dari AI");
      }
      setGeneratedRecipes(data.recipes || []);
      setSaveError(null); // Clear previous errors
    } catch (error: any) {
      console.error("Generation failed:", error);
      setSaveError(error.message); // Use saveError to display the generation error for now
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
        setSaveError(e instanceof Error ? e.message : "Gagal menyimpan resep");
      } finally {
        setSavingRecipeId(null);
      }
    })();
  };

  const handleShare = async (recipe: Recipe) => {
    const shareData = {
      title: recipe.name,
      text: `${recipe.name}\n\n${recipe.description}\n\nWaktu: ${recipe.prepTime + recipe.cookTime} menit | Porsi: ${recipe.servings}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      navigator.clipboard.writeText(shareData.text);
      alert("Resep disalin ke clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold">Generator Resep</div>
        <div className="text-sm text-muted-foreground">
          Generate 3–5 resep dari bahan yang ada di kulkas kamu.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Resep</CardTitle>
          <CardDescription>Sesuaikan preferensi untuk hasil yang lebih relevan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="mainIngredient">Bahan Utama</Label>
              <Select value={mainIngredient} onValueChange={(value) => setMainIngredient(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bahan..." />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id ?? ing.name} value={ing.name}>
                      {ing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground mt-1">
                AI akan fokus mengolah bahan ini.
              </div>
            </div>
            <div>
              <Label htmlFor="difficulty">Tingkat Kesulitan</Label>
              <Select value={filters.difficulty} onValueChange={(value) => setFilters({ ...filters, difficulty: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Mudah</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="hard">Sulit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maxTime">Waktu Maksimum (menit)</Label>
              <Select value={filters.maxTime} onValueChange={(value) => setFilters({ ...filters, maxTime: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 menit</SelectItem>
                  <SelectItem value="30">30 menit</SelectItem>
                  <SelectItem value="45">45 menit</SelectItem>
                  <SelectItem value="60">60 menit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vegetarian"
                checked={filters.vegetarian}
                onChange={(e) => setFilters({ ...filters, vegetarian: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="vegetarian">Vegetarian</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="halal"
                checked={filters.halal}
                onChange={(e) => setFilters({ ...filters, halal: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="halal">Halal</Label>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleGenerate} disabled={ingredients.length === 0 || isGenerating} className="w-full md:w-auto">
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Menghasilkan Resep...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Generate Resep ({ingredients.length} bahan tersedia)
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {saveError && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{saveError}</CardContent>
        </Card>
      )}

      {generatedRecipes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {ingredients.length === 0
                ? "Tambahkan bahan di halaman Bahan terlebih dahulu"
                : "Klik Generate Resep untuk melihat hasil"}
            </p>
            {ingredients.length === 0 && (
              <Link href="/bahan">
                <Button className="mt-4">Ke Bahan</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {generatedRecipes.map((recipe, index) => (
            <Card key={index} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                <Image
                  src={getRecipeImageUrl(recipe.name)}
                  alt={recipe.name}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {recipe.matchPercentage && (
                  <div
                    className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur shadow-sm ${
                      recipe.matchPercentage >= 80
                        ? "bg-green-600/90 text-white"
                        : recipe.matchPercentage >= 50
                          ? "bg-amber-500/90 text-white"
                          : "bg-red-600/90 text-white"
                    }`}
                  >
                    {recipe.matchPercentage}% match
                  </div>
                )}
              </div>
              <CardHeader className="pt-4 pb-2">
                <div>
                  <CardTitle className="text-xl">{recipe.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">{recipe.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recipe.prepTime + recipe.cookTime} menit
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-4 w-4" />
                    {recipe.calories || "?"} kal
                  </span>
                  <span>• {recipe.servings} porsi</span>
                  <span>
                    •{" "}
                    {recipe.difficulty === "easy"
                      ? "Mudah"
                      : recipe.difficulty === "medium"
                        ? "Sedang"
                        : "Sulit"}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">Bahan:</h4>
                    <ul className="text-sm space-y-1">
                      {recipe.ingredients?.map((ing, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {ing.quantity} {ing.unit} {ing.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Langkah:</h4>
                    <ol className="text-sm space-y-2">
                      {recipe.instructions?.map((step, i) => (
                        <li key={i} className="text-muted-foreground">
                          {i + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveRecipe(recipe)}
                    disabled={savingRecipeId === recipe.id}
                  >
                    <Bookmark className="mr-2 h-4 w-4" />
                    {savingRecipeId === recipe.id ? "Menyimpan..." : "Simpan"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare(recipe)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Bagikan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
