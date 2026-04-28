"use client";

import { useState } from "react";
import { useAppStore, Ingredient } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Utensils,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  ScanLine,
  ChefHat,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Sayur",
  "Daging",
  "Ayam",
  "Ikan",
  "Telur",
  "Susu",
  "Keju",
  "Bumbu",
  "Saus",
  "Buah",
  "Minuman",
  "Lainnya",
];

const UNITS = [
  "gram",
  "kg",
  "ml",
  "liter",
  "buah",
  "pcs",
  "bungkus",
  "kaleng",
  "botol",
];

export default function DashboardPage() {
  const router = useRouter();
  const { ingredients, addIngredient, removeIngredient, updateIngredient } =
    useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Ingredient, "id">>({
    name: "",
    category: "Lainnya",
    quantity: 1,
    unit: "pcs",
    expiryDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateIngredient(editingId, formData);
      setEditingId(null);
    } else {
      addIngredient(formData);
    }
    setFormData({
      name: "",
      category: "Lainnya",
      quantity: 1,
      unit: "pcs",
      expiryDate: "",
    });
    setIsAdding(false);
  };

  const startEdit = (ingredient: Ingredient) => {
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      expiryDate: ingredient.expiryDate || "",
    });
    setEditingId(ingredient.id || null);
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: "",
      category: "Lainnya",
      quantity: 1,
      unit: "pcs",
      expiryDate: "",
    });
    setIsAdding(false);
  };

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
        <span className="text-xs text-destructive font-medium">
          Kadaluarsa {Math.abs(days)} hari lalu
        </span>
      );
    } else if (days === 0) {
      return (
        <span className="text-xs text-destructive font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Kadaluarsa hari ini!
        </span>
      );
    } else if (days <= 3) {
      return (
        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          H-{days} kadaluarsa
        </span>
      );
    } else {
      return (
        <span className="text-xs text-muted-foreground">
          Kadaluarsa dalam {days} hari
        </span>
      );
    }
  };

  const almostExpiredCount = ingredients.filter(
    (ing) => {
      const days = getDaysUntilExpiry(ing.expiryDate);
      return days !== null && days >= 0 && days <= 3;
    }
  ).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Kulkas Berisi</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Beranda
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bahan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ingredients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hampir Kadaluarsa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {almostExpiredCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resep Tersimpan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {useAppStore.getState().savedRecipes.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Food Waste Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {ingredients.length * 0.2} kg
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Bahan di Kulkas</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/scanner")}>
              <ScanLine className="mr-2 h-4 w-4" />
              Scan Barcode
            </Button>
            <Button
              variant={isAdding ? "secondary" : "default"}
              onClick={() => {
                if (isAdding) {
                  cancelEdit();
                } else {
                  setIsAdding(true);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isAdding ? "Batal" : "Tambah Bahan"}
            </Button>
            {ingredients.length > 0 && (
              <Link href="/generator">
                <Button className="bg-primary hover:bg-primary/90">
                  <ChefHat className="mr-2 h-4 w-4" />
                  Generate Resep
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Add Ingredient Form */}
        {isAdding && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingId ? "Edit Bahan" : "Tambah Bahan Baru"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nama Bahan</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Contoh: Ayam, Bayam, Telur"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quantity">Jumlah</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Satuan</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) =>
                        setFormData({ ...formData, unit: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Tanggal Kadaluarsa (Opsional)</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingId ? "Update" : "Simpan"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Ingredients List */}
        {ingredients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Belum ada bahan di kulkas</p>
              <p className="text-sm">
                Tambahkan bahan secara manual atau scan barcode produk
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ingredients.map((ingredient) => (
              <Card
                key={ingredient.id}
                className={
                  getDaysUntilExpiry(ingredient.expiryDate) !== null &&
                  getDaysUntilExpiry(ingredient.expiryDate)! <= 3
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                    : ""
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{ingredient.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {ingredient.category}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(ingredient)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          ingredient.id && removeIngredient(ingredient.id!)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      {ingredient.quantity} {ingredient.unit}
                    </p>
                    {ingredient.expiryDate && (
                      <div>{expiryIndicator(ingredient.expiryDate)}</div>
                    )}
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
