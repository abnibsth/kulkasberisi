"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanLine, Camera, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { INGREDIENT_CATEGORIES, IngredientCategoryLabel } from "@/components/ingredients/category";

const UNITS = ["gram", "kg", "ml", "liter", "buah", "pcs", "bungkus", "kaleng", "botol"];

const BARCODE_DATABASE: Record<string, { name: string; category: string }> = {
  "8991234567890": { name: "Indomie Goreng", category: "karbohidrat" },
  "8992345678901": { name: "Susu Ultra Milk", category: "dairy" },
  "8993456789012": { name: "Kecap Bango", category: "bumbu" },
  "8994567890123": { name: "Minyak Goreng Bimoli", category: "bumbu" },
  "8995678901234": { name: "Gula Pasir Gulaku", category: "bumbu" },
  "8996789012345": { name: "Teh Botol Sosro", category: "minuman" },
  "8997890123456": { name: "Sarden ABC", category: "protein" },
  "8998901234567": { name: "Saus Sambal Indofood", category: "bumbu" },
};

export default function ScannerPage() {
  const router = useRouter();
  const { addIngredient } = useAppStore();
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<{
    name: string;
    category: string;
    barcode: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "lainnya",
    quantity: "1",
    unit: "pcs",
    expiryDate: "",
    barcode: "",
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (isScanning) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isScanning]);

  const stopScanLoop = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setScanError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCameraPermission(true);
        startScanLoop();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setHasCameraPermission(false);
      setScanError("Akses kamera ditolak atau perangkat tidak mendukung.");
    }
  };

  const stopCamera = () => {
    stopScanLoop();
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const lookupBarcode = async (barcode: string) => {
    const local = BARCODE_DATABASE[barcode];
    try {
      const res = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`, { method: "GET" });
      const payload = (await res.json().catch(() => null)) as
        | { item?: { name: string; category: string } }
        | { error?: string }
        | null;
      if (res.ok && payload && "item" in payload && payload.item?.name) {
        return { name: payload.item.name, category: payload.item.category || "lainnya" };
      }
    } catch {
    }
    if (local) return { name: local.name, category: local.category };
    return null;
  };

  const applyBarcode = async (barcode: string) => {
    const product = await lookupBarcode(barcode);
    if (product) {
      setScannedProduct({
        name: product.name,
        category: product.category,
        barcode,
      });
      setFormData((prev) => ({
        ...prev,
        name: product.name,
        category: product.category,
        barcode,
      }));
      return;
    }
    setScannedProduct(null);
    setFormData((prev) => ({ ...prev, barcode }));
  };

  const handleScanBarcode = () => {
    const barcode = manualBarcode.trim();
    if (!barcode) return;
    setScanError(null);
    applyBarcode(barcode);
  };

  const handleSimulateScan = () => {
    const barcodes = Object.keys(BARCODE_DATABASE);
    const randomBarcode = barcodes[Math.floor(Math.random() * barcodes.length)];
    setManualBarcode(randomBarcode);
    applyBarcode(randomBarcode);
  };

  const startScanLoop = () => {
    stopScanLoop();
    if (!videoRef.current) return;

    if (typeof window !== "undefined" && !("BarcodeDetector" in window)) {
      setScanError("Browser belum mendukung scan barcode otomatis. Gunakan input manual di bawah.");
      return;
    }

    // @ts-expect-error BarcodeDetector may not exist in TS lib
    const detector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
    });

    scanIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current) return;
      try {
        // BarcodeDetector accepts HTMLVideoElement in supported browsers
        const codes = await detector.detect(videoRef.current);
        const raw = codes?.[0]?.rawValue?.trim();
        if (raw) {
          setManualBarcode(raw);
          await applyBarcode(raw);
          setIsScanning(false);
        }
      } catch {
      }
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setSaveError(null);
    try {
      await addIngredient({
        name: formData.name,
        category: formData.category,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        expiryDate: formData.expiryDate || undefined,
        barcode: formData.barcode || undefined,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan ke Supabase");
      return;
    }

    setFormData({
      name: "",
      category: "lainnya",
      quantity: "1",
      unit: "pcs",
      expiryDate: "",
      barcode: "",
    });
    setScannedProduct(null);
    setManualBarcode("");
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold">Scan Barcode</div>
        <div className="text-sm text-muted-foreground">
          Scan barcode atau input manual untuk menambahkan bahan.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan dengan Kamera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-muted rounded-lg aspect-video flex items-center justify-center overflow-hidden">
            {isScanning ? (
              hasCameraPermission === false ? (
                <div className="text-center text-muted-foreground p-4">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Akses kamera ditolak</p>
                  <p className="text-sm">Gunakan input manual di bawah</p>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-primary/50 rounded-lg">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-primary rounded-lg" />
                  </div>
                </>
              )
            ) : (
              <div className="text-center text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Klik "Mulai Scan" untuk mengakses kamera</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setIsScanning(!isScanning)} variant={isScanning ? "destructive" : "default"} className="flex-1">
              {isScanning ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Stop Scan
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Mulai Scan
                </>
              )}
            </Button>
            <Button onClick={handleSimulateScan} variant="outline" className="flex-1">
              Simulasi Scan
            </Button>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            <p>Scan barcode untuk auto-isi nama & kategori bahan.</p>
            <p>Kalau scan otomatis tidak didukung, pakai input manual di bawah.</p>
          </div>

          {scanError && (
            <div className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 border border-amber-500/20">
              {scanError}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Input Manual Barcode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Masukkan kode barcode (12-13 digit)"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              maxLength={13}
            />
            <Button onClick={handleScanBarcode}>Cari</Button>
          </div>

          {scannedProduct && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
              <p className="font-medium text-green-800">✓ Produk ditemukan: {scannedProduct.name}</p>
              <p className="text-sm text-green-600">Kategori: {scannedProduct.category}</p>
            </div>
          )}

          {manualBarcode && !scannedProduct && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
              <p className="text-amber-800">⚠ Barcode tidak ditemukan di database</p>
              <p className="text-sm text-amber-600">Silakan input manual nama dan kategori produk</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nama Produk</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Indomie Goreng"
                  required
                />
              </div>
              <div>
                <Label>Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
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
              <div>
                <Label htmlFor="quantity">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Satuan</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
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
                <Label htmlFor="expiryDate">Tanggal Kadaluarsa</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>

            {formData.barcode && (
              <div className="text-sm text-muted-foreground">Barcode: {formData.barcode}</div>
            )}

            {saveError && <div className="text-sm text-destructive">{saveError}</div>}

            <Button type="submit" className="w-full">
              <ScanLine className="mr-2 h-4 w-4" />
              Simpan ke Kulkas
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
