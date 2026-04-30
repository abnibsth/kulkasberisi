"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "sayur",
  "buah",
  "protein",
  "dairy",
  "bumbu",
  "karbohidrat",
  "minuman",
  "lainnya",
] as const;

const UNITS = ["gram", "kg", "ml", "liter", "buah", "pcs", "bungkus", "kaleng", "botol"] as const;

export default function TambahBahanPage() {
  const router = useRouter();
  const { addIngredient } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "lainnya",
    quantity: "1",
    unit: "pcs",
    purchaseDate: "",
    expiryDate: "",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!cancelled && !data.session) {
        router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const expiryIsValid = useMemo(() => {
    if (!form.expiryDate) return false;
    const exp = new Date(form.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return exp.getTime() > today.getTime();
  }, [form.expiryDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!expiryIsValid) {
      setError("Tanggal kadaluarsa harus lebih besar dari hari ini.");
      return;
    }

    setIsSaving(true);
    try {
      await addIngredient({
        name: form.name,
        category: form.category,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        purchaseDate: form.purchaseDate || undefined,
        expiryDate: form.expiryDate,
        notes: form.notes || undefined,
      });
      router.push("/bahan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bahan");
    } finally {
      setIsSaving(false);
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
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
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
                <Label htmlFor="expiryDate">Tanggal Kadaluarsa</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  required
                />
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
