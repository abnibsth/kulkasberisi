"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INGREDIENT_CATEGORIES, IngredientCategoryLabel } from "@/components/ingredients/category";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNITS = ["gram", "kg", "ml", "liter", "buah", "pcs", "bungkus", "kaleng", "botol"] as const;

export default function TambahBahanPage() {
  const router = useRouter();
  const { addIngredient } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggestingExpiry, setIsSuggestingExpiry] = useState(false);
  const [expiryHint, setExpiryHint] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "lainnya",
    quantity: "1",
    unit: "pcs",
    storageLocation: "fridge",
    purchaseDate: "",
    expiryDate: "",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        if (!cancelled) setError(getSupabaseBrowserConfigError());
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled && !data.session) router.replace("/login");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const expiryIsValid = useMemo(() => {
    if (!form.expiryDate) return true;
    const exp = new Date(form.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return exp.getTime() > today.getTime();
  }, [form.expiryDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExpiryHint(null);

    if (!expiryIsValid) {
      setError("Jika diisi, tanggal kadaluarsa harus lebih besar dari hari ini.");
      return;
    }

    setIsSaving(true);
    try {
      await addIngredient({
        name: form.name,
        category: form.category,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        storageLocation: form.storageLocation as "fridge" | "pantry",
        purchaseDate: form.purchaseDate || undefined,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
      });
      router.push("/bahan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bahan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuggestExpiry = async () => {
    setError(null);
    setExpiryHint(null);
    if (!form.name.trim()) {
      setError("Isi nama bahan terlebih dahulu untuk prediksi kadaluarsa.");
      return;
    }
    setIsSuggestingExpiry(true);
    try {
      const res = await fetch("/api/expiry/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          purchaseDate: form.purchaseDate || undefined,
          notes: form.notes || undefined,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { expiryDate?: string; method?: string; rationale?: string; minDays?: number; maxDays?: number; error?: string }
        | null;
      if (!res.ok) throw new Error(payload?.error || "Gagal memprediksi kadaluarsa");
      if (!payload?.expiryDate) throw new Error("Response tidak valid");
      setForm((prev) => ({ ...prev, expiryDate: payload.expiryDate || prev.expiryDate }));
      const methodLabel = payload.method === "ai" ? "AI" : "Otomatis";
      const range = typeof payload.minDays === "number" && typeof payload.maxDays === "number" ? `(${payload.minDays}–${payload.maxDays} hari)` : "";
      setExpiryHint(`${methodLabel} ${range} • ${payload.rationale || ""}`.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memprediksi kadaluarsa");
    } finally {
      setIsSuggestingExpiry(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Form Tambah Bahan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Bayam"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INGREDIENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <IngredientCategoryLabel category={cat} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Satuan</Label>
                <Select value={form.unit} onValueChange={(value) => setForm({ ...form, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Tanggal Beli</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Lokasi Penyimpanan</Label>
                <Select
                  value={form.storageLocation}
                  onValueChange={(value) => setForm({ ...form, storageLocation: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fridge">Kulkas</SelectItem>
                    <SelectItem value="pantry">Luar Kulkas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Tanggal Kadaluarsa</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
                {!form.expiryDate && (
                  <div className="text-xs text-muted-foreground">
                    Kosongkan jika tidak ada label; sistem akan buat perkiraan berdasarkan lokasi penyimpanan.
                  </div>
                )}
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestExpiry}
                    disabled={isSuggestingExpiry}
                    className="w-full sm:w-auto"
                  >
                    {isSuggestingExpiry ? "Memprediksi..." : "Prediksi Kadaluarsa"}
                  </Button>
                  {expiryHint && (
                    <div className="rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      {expiryHint}
                    </div>
                  )}
                </div>
                {!expiryIsValid && form.expiryDate && (
                  <div className="text-xs text-destructive">Harus lebih besar dari hari ini.</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Opsional"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving} className="flex-1">
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Link href="/bahan" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Batal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
