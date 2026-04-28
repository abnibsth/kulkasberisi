"use client";

import { useState } from "react";
import { useAppStore, Recipe } from "@/lib/store";
import { Button } from "@/components/ui/button";
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
import { Utensils, Clock, Flame, ChevronLeft, Share2, Bookmark } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GeneratorPage() {
  const router = useRouter();
  const { ingredients, generatedRecipes, setGeneratedRecipes, isGenerating, setIsGenerating, saveRecipe } =
    useAppStore();
  const [filters, setFilters] = useState({
    difficulty: "",
    maxTime: "",
    vegetarian: false,
    halal: true,
  });

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
          filters,
        }),
      });

      const data = await response.json();
      setGeneratedRecipes(data.recipes || []);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecipe = (recipe: Recipe) => {
    saveRecipe(recipe);
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
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.text);
      alert("Resep disalin ke clipboard!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Utensils className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Generator Resep</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Resep</CardTitle>
            <CardDescription>
              Sesuaikan preferensi untuk hasil yang lebih relevan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="difficulty">Tingkat Kesulitan</Label>
                <Select
                  value={filters.difficulty}
                  onValueChange={(value) =>
                    setFilters({ ...filters, difficulty: value })
                  }
                >
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
                <Select
                  value={filters.maxTime}
                  onValueChange={(value) =>
                    setFilters({ ...filters, maxTime: value })
                  }
                >
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
                  onChange={(e) =>
                    setFilters({ ...filters, vegetarian: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="vegetarian">Vegetarian</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halal"
                  checked={filters.halal}
                  onChange={(e) =>
                    setFilters({ ...filters, halal: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="halal">Halal</Label>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={handleGenerate}
                disabled={ingredients.length === 0 || isGenerating}
                className="w-full md:w-auto"
              >
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

        {/* Results */}
        {generatedRecipes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">
                {ingredients.length === 0
                  ? "Tambahkan bahan di dashboard terlebih dahulu"
                  : "Klik Generate Resep untuk melihat hasil"}
              </p>
              {ingredients.length === 0 && (
                <Link href="/dashboard">
                  <Button className="mt-4">Ke Dashboard</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {generatedRecipes.map((recipe, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{recipe.name}</CardTitle>
                      <CardDescription>{recipe.description}</CardDescription>
                    </div>
                    {recipe.matchPercentage && (
                      <div
                        className={`text-sm font-semibold px-2 py-1 rounded ${
                          recipe.matchPercentage >= 80
                            ? "bg-green-100 text-green-800"
                            : recipe.matchPercentage >= 50
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {recipe.matchPercentage}% match
                      </div>
                    )}
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
                    <span>• {recipe.difficulty === "easy" ? "Mudah" : recipe.difficulty === "medium" ? "Sedang" : "Sulit"}</span>
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
                    >
                      <Bookmark className="mr-2 h-4 w-4" />
                      Simpan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(recipe)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Bagikan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
