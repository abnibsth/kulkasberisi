import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScanLine, ChefHat, Star, ArrowRight, Sparkles, Zap, CheckCircle2, PackagePlus, Bell, BarChart3, Share2, SlidersHorizontal } from "lucide-react";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import { RevealSection, StaggerReveal } from "@/components/landing/RevealSection";
import MobileMenu from "@/components/landing/MobileMenu";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type LandingReview = {
  id: string; displayName: string; role?: string; rating: number; message: string; createdAt?: string;
};

function TestimonialCard({ review }: { review: LandingReview }) {
  const initials = (review.displayName || "U").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  const rating = Math.max(1, Math.min(5, Math.round(review.rating || 5)));
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
        ))}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">"{review.message}"</p>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {initials || "U"}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{review.displayName}</div>
          {review.role && <div className="text-xs text-gray-400">{review.role}</div>}
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  let reviews: LandingReview[] = [];
  try {
    const supabase = getSupabaseServerAdminClient();
    const { data } = await supabase.from("reviews")
      .select("id,display_name,role,rating,message,is_public,is_hidden,created_at")
      .eq("is_public", true).eq("is_hidden", false)
      .order("created_at", { ascending: false }).limit(10);
    if (data) reviews = (data as any[]).map((r) => ({
      id: r.id, displayName: r.display_name ?? "User", role: r.role ?? undefined,
      rating: typeof r.rating === "number" ? r.rating : 5, message: r.message, createdAt: r.created_at,
    }));
  } catch {}

  return (
    <div className="min-h-screen bg-white font-sans antialiased flex flex-col">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <Image src="/logo.png" alt="Kulkas Berisi" width={30} height={30} className="rounded-xl group-hover:scale-110 transition-transform duration-200" />
            <span className="font-bold text-gray-900 text-base md:text-lg tracking-tight">Kulkas <span className="text-green-600">Berisi</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-500">
            {[["#promo","Promo"],["#fitur","Fitur"],["#cara-kerja","Cara Kerja"],["#ulasan","Ulasan"]].map(([h,l])=>(
              <Link key={l} href={h} className="hover:text-gray-900 transition-colors relative group">
                {l}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login" className="hidden sm:block"><Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">Masuk</Button></Link>
            <Link href="/register" className="hidden md:block"><Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm">Mulai Gratis</Button></Link>
            {/* Mobile hamburger */}
            <MobileMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── HERO ── */}
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-16 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left */}
            <div className="text-center lg:text-left">
              <div className="animate-fade-in-up inline-flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3.5 py-1.5 mb-6 md:mb-8">
                <Sparkles className="h-3 w-3 text-green-500" />
                AI-powered · Scan barcode · Zero waste
              </div>
              <h1 className="animate-fade-in-up delay-100 text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-5">
                Dari sisa bahan<br />
                <span className="text-green-600">jadi makan malam.</span>
              </h1>
              <p className="animate-fade-in-up delay-200 text-lg md:text-xl text-gray-500 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                Kulkas Berisi membantu Anda mengubah bahan yang tersisa menjadi resep nyata — sebelum semuanya kadaluarsa dan terbuang.
              </p>
              <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mb-8">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white h-12 px-8 font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                    <ChefHat className="mr-2 h-5 w-5" /> Coba Sekarang Gratis
                  </Button>
                </Link>
                <Link href="#fitur" className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors group py-2">
                  Lihat fitur <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <p className="animate-fade-in-up delay-400 text-xs text-gray-400 text-center lg:text-left">Tidak perlu kartu kredit. Gratis untuk mulai.</p>
            </div>

            {/* Right – hero image (visible on all screens, but smaller on mobile) */}
            <div className="animate-fade-in-right delay-200 relative mt-4 lg:mt-0">
              <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl ring-1 ring-black/5">
                <div className="relative h-56 sm:h-72 md:h-[360px] lg:h-[480px]">
                  <Image
                    src="https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=90"
                    alt="Bahan makanan segar di kulkas" fill priority sizes="(max-width:1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
              </div>
              {/* Floating card */}
              <div className="animate-float-card absolute -bottom-4 left-3 right-3 md:left-5 md:right-5 bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-xl border border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">AI Aktif</span>
                    </div>
                    <div className="font-semibold text-gray-900 text-xs md:text-sm">🥚 Telur · 🐔 Ayam · 🥕 Wortel</div>
                  </div>
                  <Link href="/register">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0 text-xs h-8">Generate →</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="border-y border-gray-100 bg-gray-50 py-10 md:py-14">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <StaggerReveal className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {[["10,000+","Pengguna Aktif"],["50,000+","Resep Dihasilkan"],["2,000 kg","Food Waste Dikurangi"],["4.8/5","Rating Pengguna"]].map(([v,l])=>(
                <div key={l} className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 px-4 md:px-6 py-5 md:py-7 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-1">{v}</div>
                  <div className="text-gray-400 text-xs md:text-sm">{l}</div>
                </div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        {/* ── PROMO ── */}
        <section id="promo" className="py-14 md:py-20 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <RevealSection className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-12">
              <div>
                <p className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-1.5">Highlights</p>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Promo & Inspirasi</h2>
                <p className="text-gray-400 mt-1.5 text-sm md:text-base">Kampanye aktif dan peluang kolaborasi.</p>
              </div>
              <Link href="/register" className="shrink-0">
                <Button variant="outline" size="sm" className="border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 w-full sm:w-auto">
                  Lihat semua <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </RevealSection>
            <StaggerReveal className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[
                { img:"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80", tag:"Aktif", title:"Zero Waste 7 Hari", desc:"Habiskan semua bahan sebelum kadaluarsa dalam 7 hari. Pantau progres di dashboard.", cta:"Ikuti Campaign", href:"/register" },
                { img:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80", tag:"Mingguan", title:"Resep Pilihan Minggu Ini", desc:"Kurasi resep komunitas berdasarkan bahan musiman yang paling banyak tersedia.", cta:"Lihat Resep", href:"#fitur" },
                { img:"https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=800&q=80", tag:"Partner", title:"Pasang Iklan di Sini", desc:"Jangkau ribuan pengguna aktif yang peduli dengan konsumsi pangan berkualitas.", cta:"Hubungi Kami", href:"/contact" },
              ].map(({ img, tag, title, desc, cta, href }) => (
                <div key={title} className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white">
                  <div className="relative h-44 md:h-48 overflow-hidden">
                    <Image src={img} alt={title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                    <span className="absolute top-3 left-3 text-xs font-semibold bg-white/90 backdrop-blur-sm text-gray-700 rounded-md px-2.5 py-1 border border-white/60">{tag}</span>
                  </div>
                  <div className="p-4 md:p-5">
                    <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
                    <p className="text-sm text-gray-400 mb-4 leading-relaxed">{desc}</p>
                    <Link href={href}>
                      <Button variant="outline" size="sm" className="w-full text-xs border-gray-200 hover:border-gray-900 hover:text-gray-900 group/btn">
                        {cta} <ArrowRight className="ml-1.5 h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="fitur" className="py-14 md:py-20 bg-gray-50 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <RevealSection className="text-center mb-10 md:mb-14">
              <p className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-2">Fitur</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-2">Semua yang Anda butuhkan.</h2>
              <p className="text-gray-400 md:text-lg max-w-xl mx-auto">Dari scan barcode sampai resep AI — dalam satu aplikasi yang rapi.</p>
            </RevealSection>
            <StaggerReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { Icon: PackagePlus,      color: "text-blue-600",   bg: "bg-blue-50",   title:"Input Bahan",         desc:"Ketik atau scan barcode. Auto-isi nama, jumlah, dan tanggal kadaluarsa dari 1000+ produk." },
                { Icon: Sparkles,         color: "text-violet-600", bg: "bg-violet-50", title:"AI Recipe Generator",  desc:"Pilih bahan, tekan generate — 3–5 resep dalam detik, disesuaikan selera Anda." },
                { Icon: Bell,             color: "text-orange-600", bg: "bg-orange-50", title:"Expiry Reminder",      desc:"Notifikasi H-3 sebelum bahan habis masa pakai. Tidak ada bahan terbuang sia-sia." },
                { Icon: BarChart3,        color: "text-green-600",  bg: "bg-green-50",  title:"Zero Waste Tracker",  desc:"Lihat berapa kg food waste yang berhasil Anda kurangi sejak bergabung." },
                { Icon: Share2,           color: "text-sky-600",    bg: "bg-sky-50",    title:"Share Resep",         desc:"Satu tap untuk share ke WhatsApp, Instagram Story, atau salin link resep." },
                { Icon: SlidersHorizontal,color: "text-rose-600",   bg: "bg-rose-50",   title:"Filter Cerdas",       desc:"Filter waktu masak, kesulitan, diet vegetarian, atau halal sesuai kebutuhan." },
              ].map(({ Icon, color, bg, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${bg} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="cara-kerja" className="py-14 md:py-20 bg-gray-900 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <RevealSection className="mb-10 md:mb-16">
              <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-2">Cara Kerja</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Tiga langkah. Tidak lebih.</h2>
              <p className="text-gray-400 md:text-lg max-w-xl">Dibuat sesederhana mungkin karena tujuannya adalah memasak — bukan belajar aplikasi baru.</p>
            </RevealSection>
            <StaggerReveal className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
              {[
                { n:"01", Icon: ScanLine, title:"Buka kulkas, input bahan", desc:"Scan barcode atau ketik langsung bahan apa yang ada. Butuh kurang dari satu menit.", color:"text-green-400" },
                { n:"02", Icon: Zap, title:"Pilih dan generate resep", desc:"Pilih bahan mana yang mau dipakai hari ini. AI langsung buatkan opsi resep yang relevan.", color:"text-blue-400" },
                { n:"03", Icon: CheckCircle2, title:"Masak dan tandai selesai", desc:"Ikuti langkah resep, tandai bahan terpakai, stok kulkas Anda otomatis terupdate.", color:"text-purple-400" },
              ].map(({ n, Icon, title, desc, color }) => (
                <div key={n} className="flex gap-5 md:block">
                  <div className={`text-4xl md:text-5xl font-bold ${color} opacity-25 leading-none shrink-0 md:mb-4`}>{n}</div>
                  <div>
                    <Icon className={`h-5 w-5 md:h-6 md:w-6 ${color} mb-2 md:mb-3`} />
                    <h3 className="text-base md:text-lg font-semibold text-white mb-1.5">{title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="ulasan" className="py-14 md:py-20 bg-gray-50 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <RevealSection className="text-center mb-10 md:mb-14">
              <p className="text-green-600 text-xs font-semibold uppercase tracking-widest mb-2">Ulasan</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-2">Kata pengguna.</h2>
              <p className="text-gray-400 md:text-lg max-w-xl mx-auto">Ulasan asli dari pengguna yang sudah pakai lebih dari dua minggu.</p>
            </RevealSection>
            {reviews.length > 0 ? (
              <TestimonialCarousel reviews={reviews} />
            ) : (
              <StaggerReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { id:"f1", displayName:"Ayu Rahma", role:"Ibu Rumah Tangga, Surabaya", rating:5, message:"Saya tidak sadar sudah buang berapa banyak uang sebelumnya. Sekarang bahan di kulkas hampir selalu habis dipakai." },
                  { id:"f2", displayName:"Rizky Pratama", role:"Karyawan, Jakarta", rating:5, message:"Fitur notifikasi kadaluarsanya yang paling membantu. Saya jarang lagi nemuin bahan yang sudah basi." },
                  { id:"f3", displayName:"Dimas Hendra", role:"Mahasiswa, Bandung", rating:5, message:"Resepnya masuk akal dan enak. Sudah coba 4 resep dalam seminggu dan semuanya berhasil." },
                ].map((r) => <TestimonialCard key={r.id} review={r} />)}
              </StaggerReveal>
            )}
            <RevealSection delay={300} className="mt-8 md:mt-10 text-center">
              <Link href="/profil">
                <Button variant="outline" className="border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900">Tulis Ulasan Anda</Button>
              </Link>
            </RevealSection>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-14 md:py-24 max-w-6xl mx-auto px-4 md:px-6">
          <RevealSection>
            <div className="rounded-2xl md:rounded-3xl bg-gray-900 px-6 py-12 md:px-20 md:py-16 text-center relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage:"radial-gradient(circle,#fff 1.5px,transparent 1.5px)", backgroundSize:"28px 28px" }} />
              <div className="relative">
                <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-4">Mulai Sekarang</p>
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4 max-w-2xl mx-auto leading-tight">
                  Kulkas penuh bukan berarti makan enak.
                </h2>
                <p className="text-gray-400 md:text-lg mb-8 max-w-xl mx-auto">Yang membuat perbedaan adalah tahu mau dimasak apa. Itu yang kami bantu.</p>
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 font-bold shadow-xl hover:scale-[1.02] transition-all duration-200">
                    <ChefHat className="mr-2 h-5 w-5" /> Daftar Gratis Sekarang
                  </Button>
                </Link>
              </div>
            </div>
          </RevealSection>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white py-10 md:py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-8 md:mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo.png" alt="Kulkas Berisi" width={28} height={28} className="rounded-lg" />
                <span className="font-bold text-gray-900">Kulkas <span className="text-green-600">Berisi</span></span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">Generator resep berbasis AI untuk mengurangi limbah makanan di Indonesia.</p>
            </div>
            {[
              { title:"Produk", links:[["/dashboard","Dashboard"],["/generator","Generator"],["/scanner","Scanner"],["#fitur","Fitur"]] },
              { title:"Perusahaan", links:[["/about","Tentang Kami"],["/contact","Kontak"],["/privacy","Privasi"],["/terms","Syarat"]] },
              { title:"Kontak", links:[["mailto:hello@kulkasberisi.id","Email Kami"],["#","Jakarta, Indonesia"]] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
                <ul className="space-y-2 text-sm">
                  {links.map(([h, l]) => (
                    <li key={l}><Link href={h} className="text-gray-400 hover:text-gray-900 transition-colors">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
            <span>&copy; 2026 Kulkas Berisi. All rights reserved.</span>
            <span>Made with ❤️ in Kelompok 5</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
