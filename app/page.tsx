import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, ScanLine, ChefHat, Leaf, Clock, Users, Star } from "lucide-react";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import TestimonialCarousel from "@/components/TestimonialCarousel";

// Selalu fetch data terbaru dari Supabase, jangan cache halaman ini
export const dynamic = "force-dynamic";
export const revalidate = 0;


export type LandingReview = {
  id: string;
  displayName: string;
  role?: string;
  rating: number;
  message: string;
  createdAt?: string;
};

function TestimonialCard({ review }: { review: LandingReview }) {
  const initials = (review.displayName || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const rating = Math.max(1, Math.min(5, Math.round(review.rating || 5)));
  
  return (
    <Card className="flex-shrink-0 w-full md:w-[350px]">
      <CardHeader>
        <div className="flex items-center gap-1 text-yellow-500 mb-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star
              key={idx}
              className={`h-4 w-4 ${idx + 1 <= rating ? "fill-current" : ""}`}
            />
          ))}
        </div>
        <CardDescription className="text-sm line-clamp-4">"{review.message}"</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
            {initials || "U"}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{review.displayName}</div>
            {review.role && <div className="text-xs text-gray-600">{review.role}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function Home() {
  let reviews: LandingReview[] = [];
  try {
    const supabase = getSupabaseServerAdminClient();

    // Coba dengan filter is_hidden dulu, fallback ke is_public saja
    let { data, error } = await supabase
      .from("reviews")
      .select("id,display_name,role,rating,message,is_public,is_hidden,created_at")
      .eq("is_public", true)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fallback: kalau kolom is_hidden belum ada di DB
    if (error) {
      console.error("[Landing] Query dengan is_hidden gagal, coba fallback:", error.message);
      ({ data, error } = await supabase
        .from("reviews")
        .select("id,display_name,role,rating,message,is_public,created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(10));
      if (error) {
        console.error("[Landing] Fallback query juga gagal:", error.message);
      }
    }

    if (!error && data) {
      reviews = (data as Array<{
        id: string;
        display_name: string | null;
        role: string | null;
        rating: number;
        message: string;
        created_at: string;
      }>).map((r) => ({
        id: r.id,
        displayName: r.display_name ?? "User",
        role: r.role ?? undefined,
        rating: typeof r.rating === "number" ? r.rating : 5,
        message: r.message,
        createdAt: r.created_at,
      }));
    }
  } catch (err) {
    console.error("[Landing] Exception saat ambil reviews:", err);

  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Kulkas Berisi</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="#promo" className="hover:text-gray-900">Promo</Link>
            <Link href="#features" className="hover:text-gray-900">Fitur</Link>
            <Link href="#how-it-works" className="hover:text-gray-900">Cara Kerja</Link>
            <Link href="#testimonials" className="hover:text-gray-900">Testimoni</Link>
          </nav>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Masuk</Button>
            </Link>
            <Link href="/register">
              <Button>Daftar</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-2 text-sm text-gray-700 shadow-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  Baru: scan barcode + reminder kadaluarsa
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mt-6 mb-6">
                  Generator Resep dari Sisa Bahan
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                  Kurangi limbah makanan dengan menghasilkan resep kreatif berdasarkan bahan yang tersisa di kulkas. Hemat uang, jaga lingkungan!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/register">
                    <Button size="lg" className="text-lg px-8 py-6">
                      <ChefHat className="mr-2 h-5 w-5" />
                      Mulai Generate Resep
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                      Pelajari Lebih Lanjut
                    </Button>
                  </Link>
                </div>
                <div className="mt-10 grid grid-cols-3 gap-6 text-left max-w-xl mx-auto lg:mx-0">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">3–5</div>
                    <div className="text-sm text-gray-600">resep per sekali generate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">&lt; 30s</div>
                    <div className="text-sm text-gray-600">waktu dapat ide masak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">Gratis</div>
                    <div className="text-sm text-gray-600">mulai tanpa kartu</div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="relative overflow-hidden rounded-2xl border bg-white/70 shadow-sm">
                  <div className="relative h-[320px] sm:h-[380px] lg:h-[420px]">
                    <Image
                      src="https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1600&q=80"
                      alt="Bahan makanan segar"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-6 left-6 right-6 rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Ide cepat untuk bahan tersisa</div>
                      <div className="font-semibold text-gray-900">Telur • Sayur • Ayam</div>
                    </div>
                    <Link href="/register">
                      <Button size="sm">Coba Sekarang</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 bg-white border-b">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
                <div className="text-gray-600">Pengguna Aktif</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">50,000+</div>
                <div className="text-gray-600">Resep Dihasilkan</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">2,000 kg</div>
                <div className="text-gray-600">Food Waste Terkurangi</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">4.8/5</div>
                <div className="text-gray-600">Rating Pengguna</div>
              </div>
            </div>
          </div>
        </section>

        <section id="promo" className="py-16 bg-white border-b scroll-mt-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Promo & Inspirasi</h2>
                <p className="text-gray-600">Tambahkan slot banner iklan, promo, atau campaign supaya landing page lebih menarik.</p>
              </div>
              <Link href="/register">
                <Button variant="outline">Pasang CTA</Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="overflow-hidden">
                <div className="relative h-44 w-full bg-gradient-to-br from-green-100 to-blue-100">
                  <Image
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80"
                    alt="Sayur dan buah segar"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">Campaign: Zero Waste 7 Hari</CardTitle>
                  <CardDescription>
                    Tantang diri Anda untuk menghabiskan bahan sebelum kadaluarsa dengan reminder otomatis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/register">
                    <Button className="w-full">Ikuti Campaign</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <div className="relative h-44 w-full bg-gradient-to-br from-orange-100 to-rose-100">
                  <Image
                    src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1600&q=80"
                    alt="Hidangan makanan fresh"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">Rekomendasi Resep Harian</CardTitle>
                  <CardDescription>
                    Munculkan ide masak yang relevan dengan stok Anda: cepat, hemat, dan minim limbah.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="#features">
                    <Button variant="outline" className="w-full">Lihat Fitur</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <div className="relative h-44 w-full bg-gradient-to-br from-slate-100 to-indigo-100">
                  <Image
                    src="https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=1600&q=80"
                    alt="Produk dapur untuk promosi"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="h-full w-full flex items-center justify-center px-6 text-center">
                    <div>
                      <div className="text-sm text-white/90">Slot Iklan</div>
                      <div className="text-xl font-semibold text-white">Banner Sponsor / Partner</div>
                      <div className="text-sm text-white/85 mt-1">Ganti dengan gambar produk/brand Anda</div>
                    </div>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">Ruang untuk Promosi</CardTitle>
                  <CardDescription>
                    Tempatkan promo produk dapur, voucher belanja, atau kolaborasi komunitas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/contact">
                    <Button variant="secondary" className="w-full">Hubungi Kami</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-gray-50 scroll-mt-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-4">
              Fitur Utama
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              everything yang Anda butuhkan untuk mengurangi limbah makanan dan masak lebih efisien
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <Card>
                <CardHeader>
                  <Utensils className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-xl">Input Bahan Manual</CardTitle>
                  <CardDescription>
                    Masukkan bahan yang tersisa di kulkas dengan mudah. Lengkap dengan kategori, jumlah, dan tanggal kadaluarsa.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 2 */}
              <Card>
                <CardHeader>
                  <ScanLine className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-xl">Scan Barcode</CardTitle>
                  <CardDescription>
                    Scan barcode produk untuk auto-input bahan dan tanggal kadaluarsa. Support 1000+ produk Indonesia.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 3 */}
              <Card>
                <CardHeader>
                  <ChefHat className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-xl">AI Recipe Generator</CardTitle>
                  <CardDescription>
                    Dapatkan 3-5 resep kreatif dari AI berdasarkan bahan yang tersedia. Filter berdasarkan waktu dan kesulitan.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 4 */}
              <Card>
                <CardHeader>
                  <Leaf className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-xl">Zero Waste Tracker</CardTitle>
                  <CardDescription>
                    Lacak berapa banyak food waste yang berhasil Anda kurangi dan dampaknya untuk lingkungan.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 5 */}
              <Card>
                <CardHeader>
                  <Clock className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-xl">Expiry Reminder</CardTitle>
                  <CardDescription>
                    Dapatkan notifikasi H-3 sebelum bahan kadaluarsa. Tidak ada lagi bahan terbuang sia-sia.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 6 */}
              <Card>
                <CardHeader>
                  <Users className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-xl">Share & Komunitas</CardTitle>
                  <CardDescription>
                    Bagikan resep ke WhatsApp, Instagram, atau feed komunitas. Dapatkan inspirasi dari pengguna lain.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-white scroll-mt-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-4">
              Cara Kerja
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Mulai kurangi limbah makanan dalam 3 langkah mudah
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Input Bahan</h3>
                <p className="text-gray-600">
                  Masukkan atau scan bahan yang tersisa di kulkas Anda
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Generate Resep</h3>
                <p className="text-gray-600">
                  AI akan menghasilkan resep kreatif dari bahan tersedia
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Masak & Nikmati</h3>
                <p className="text-gray-600">
                  Ikuti langkah resep dan nikmati hidangan tanpa limbah
                </p>
              </div>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <ScanLine className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">Cepat Input</CardTitle>
                  <CardDescription>Scan barcode atau input manual sesuai kebutuhan.</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Clock className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">Anti Kadaluarsa</CardTitle>
                  <CardDescription>Reminder membantu Anda habiskan bahan tepat waktu.</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <ChefHat className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">Resep Relevan</CardTitle>
                  <CardDescription>Hasil resep menyesuaikan bahan, waktu, dan selera.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-20 bg-gray-50 scroll-mt-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-4">
              Testimoni Pengguna
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Mereka sudah terbantu mengurangi food waste dan lebih gampang cari ide masak.
            </p>

            {reviews.length > 0 ? (
              <TestimonialCarousel reviews={reviews} />
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  {
                    id: "fallback-1",
                    displayName: "Ayu",
                    role: "Ibu Rumah Tangga",
                    rating: 5,
                    message: "Biasanya bingung bahan sisa mau diapain. Sekarang tinggal input, langsung dapat ide masak.",
                  },
                  {
                    id: "fallback-2",
                    displayName: "Rizky",
                    role: "Karyawan",
                    rating: 5,
                    message: "Notifikasi bahan mau kadaluarsa bikin saya lebih disiplin. Food waste turun drastis.",
                  },
                  {
                    id: "fallback-3",
                    displayName: "Dimas",
                    role: "Mahasiswa",
                    rating: 5,
                    message: "Resepnya kreatif dan bisa disesuaikan waktu masak. Cocok buat yang sibuk.",
                  },
                ].map((r) => (
                  <TestimonialCard key={r.id} review={r} />
                ))}
              </div>
            )}

            <div className="mt-10 text-center">
              <Link href="/profil">
                <Button variant="outline">Tulis Ulasan</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Siap Mulai Kurangi Limbah Makanan?
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Bergabunglah dengan ribuan pengguna lain yang sudah mengurangi food waste dan hemat pengeluaran dapur
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                <ChefHat className="mr-2 h-5 w-5" />
                Daftar Gratis Sekarang
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Utensils className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-white">Kulkas Berisi</span>
              </div>
              <p className="text-sm">
                Generator resep berbasis AI untuk mengurangi limbah makanan di Indonesia.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Produk</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white">Fitur</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/generator" className="hover:text-white">Generator</Link></li>
                <li><Link href="/scanner" className="hover:text-white">Scanner</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">Tentang Kami</Link></li>
                <li><Link href="/contact" className="hover:text-white">Kontak</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privasi</Link></li>
                <li><Link href="/terms" className="hover:text-white">Syarat</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Kontak</h4>
              <ul className="space-y-2 text-sm">
                <li>hello@kulkasberisi.id</li>
                <li>Jakarta, Indonesia</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2026 Kulkas Berisi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
