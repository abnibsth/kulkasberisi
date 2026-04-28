import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, ScanLine, ChefHat, Leaf, Clock, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Kulkas Berisi</span>
          </div>
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
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
              Generator Resep dari Sisa Bahan
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Kurangi limbah makanan dengan menghasilkan resep kreatif berdasarkan bahan yang tersisa di kulkas. Hemat uang, jaga lingkungan!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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

        {/* Features Section */}
        <section id="features" className="py-20 bg-gray-50">
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
        <section className="py-20 bg-white">
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
