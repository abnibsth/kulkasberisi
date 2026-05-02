"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { INGREDIENT_CATEGORIES, IngredientCategoryLabel } from "@/components/ingredients/category";

type FilterKey = "semua" | "hampir" | "expired" | (typeof INGREDIENT_CATEGORIES)[number];

function getDaysUntilExpiry(expiryDate?: string) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getEffectiveExpiryDate(ingredient: { expiryDate?: string; estimatedExpiryDate?: string }) {
  return ingredient.expiryDate || ingredient.estimatedExpiryDate;
}

function badgeForExpiry(days: number | null) {
  if (days === null) {
    return { label: "Tanpa tanggal", className: "bg-muted text-muted-foreground border-muted" };
  }
  if (days < 0) {
    return { label: "Expired", className: "bg-muted text-muted-foreground border-muted" };
  }
  if (days <= 2) {
    return { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/30" };
  }
  if (days <= 7) {
    return { label: "Warning", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" };
  }
  return { label: "Fresh", className: "bg-green-500/10 text-green-700 border-green-500/30" };
}

export default function BahanPage() {
  const router = useRouter();
  const { ingredients, loadIngredients, removeIngredient, updateIngredient } = useAppStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("semua");

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
        if (!cancelled) setLoadError(null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Gagal mengambil data bahan");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadIngredients, router]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return ingredients
      .filter((ing) => {
        if (!normalizedQuery) return true;
        return ing.name.toLowerCase().includes(normalizedQuery) || ing.category.toLowerCase().includes(normalizedQuery);
      })
      .filter((ing) => {
        const days = getDaysUntilExpiry(getEffectiveExpiryDate(ing));
        if (filter === "semua") return true;
        if (filter === "hampir") return days !== null && days >= 0 && days <= 7;
        if (filter === "expired") return days !== null && days < 0;
        return ing.category.toLowerCase() === filter;
      })
      .sort((a, b) => {
        const da = getDaysUntilExpiry(getEffectiveExpiryDate(a));
        const db = getDaysUntilExpiry(getEffectiveExpiryDate(b));
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
  }, [ingredients, query, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">Manajemen Bahan</div>
          <div className="text-sm text-muted-foreground">Total: {ingredients.length}</div>
        </div>
        <Link href="/bahan/tambah">
          <Button>Tambah</Button>
        </Link>
      </div>

      {loadError && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <Input
              placeholder="Cari bahan (nama/kategori)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="md:max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant={filter === "semua" ? "default" : "outline"} size="sm" onClick={() => setFilter("semua")}>
                Semua
              </Button>
              <Button variant={filter === "hampir" ? "default" : "outline"} size="sm" onClick={() => setFilter("hampir")}>
                Hampir Expired
              </Button>
              <Button variant={filter === "expired" ? "default" : "outline"} size="sm" onClick={() => setFilter("expired")}>
                Expired
              </Button>
              {INGREDIENT_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={filter === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(cat)}
                  className="capitalize gap-2"
                >
                  <IngredientCategoryLabel
                    category={cat}
                    className="gap-2"
                    iconClassName={filter === cat ? "text-primary-foreground" : "text-muted-foreground"}
                  />
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Tidak ada bahan yang cocok.</CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ingredient) => {
            const effectiveExpiry = getEffectiveExpiryDate(ingredient);
            const days = getDaysUntilExpiry(effectiveExpiry);
            const badge = badgeForExpiry(days);
            return (
              <Card key={ingredient.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{ingredient.name}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        <IngredientCategoryLabel category={ingredient.category} />
                      </div>
                    </div>
                    <div className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    {ingredient.quantity} {ingredient.unit}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ingredient.expiryDate
                      ? `Exp: ${ingredient.expiryDate}`
                      : ingredient.estimatedExpiryDate
                        ? `Perkiraan exp: ${ingredient.estimatedExpiryDate}`
                        : "Exp: -"}
                    {ingredient.storageLocation ? (
                      <span className="ml-2">
                        • {ingredient.storageLocation === "fridge" ? "Kulkas" : "Luar kulkas"}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Link className="flex-1" href={`/bahan/edit/${encodeURIComponent(ingredient.id || "")}`}>
                      <Button variant="outline" className="w-full" disabled={!ingredient.id}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={!ingredient.id}
                      onClick={async () => {
                        if (!ingredient.id) return;
                        try {
                          await updateIngredient(ingredient.id, { usedAt: new Date().toISOString() });
                        } catch (err) {
                          setLoadError(err instanceof Error ? err.message : "Gagal menandai dipakai");
                        }
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Dipakai
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive"
                    disabled={!ingredient.id}
                    onClick={async () => {
                      if (!ingredient.id) return;
                      try {
                        await removeIngredient(ingredient.id);
                      } catch (err) {
                        setLoadError(err instanceof Error ? err.message : "Gagal menghapus bahan");
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
