import Link from "next/link";
import Image from "next/image";
import { ScanLine, Star, Sparkles, Zap, CheckCircle2, PackagePlus, Bell, BarChart3, Share2, SlidersHorizontal } from "lucide-react";
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
    <div className="min-h-[100dvh] font-display antialiased flex flex-col" style={{background:"#FEFCF8"}}>

      {/* ── NAVBAR floating pill ── */}
      <header className="sticky top-0 z-50 px-4 pt-4 pb-2">
        <div className="nav-pill max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <Image src="/logo.png" alt="Kulkas Berisi" width={28} height={28} className="rounded-xl group-hover:scale-110 transition-transform duration-200" />
            <span className="font-bold text-base tracking-tight" style={{color:"#1E3932"}}>Kulkas <span style={{color:"#006241"}}>Berisi</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm" style={{color:"#5a5550"}}>
            {[["#promo","Promo"],["#fitur","Fitur"],["#cara-kerja","Cara Kerja"],["#ulasan","Ulasan"]].map(([h,l])=>(
              <Link key={l} href={h} className="hover:opacity-100 transition-opacity relative group" style={{opacity:0.7}}>
                {l}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300" style={{background:"#2d6a4f"}} />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block text-sm font-medium px-4 py-2 rounded-full hover:bg-black/5 transition-colors" style={{color:"#5a5550"}}>Masuk</Link>
            <Link href="/register" className="hidden md:block text-sm font-semibold px-4 py-2 text-white transition-all active:scale-95" style={{borderRadius:"50px",background:"#00754A",letterSpacing:"-0.01em"}}>Mulai Gratis</Link>
            <MobileMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── HERO ── */}
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-20 md:pb-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left */}
            <div className="animate-blur-in-up flex flex-col gap-5 lg:gap-7">
              <span className="eyebrow-tag w-fit">
                <span className="dot" />
                AI-Powered · Zero Waste
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight" style={{color:"#1E3932"}}>
                Dari sisa bahan<br /> jadi makan malam.
              </h1>
              <p className="text-base md:text-lg leading-relaxed max-w-md" style={{color:"#5a5550"}}>
                Kulkas Berisi membantu Anda mengubah bahan yang tersisa menjadi resep nyata — sebelum semuanya kadaluarsa dan terbuang.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link href="/register" className="btn-primary">
                  <span>Coba Sekarang Gratis</span>
                  <span className="btn-icon">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </span>
                </Link>
                <Link href="#fitur" className="btn-ghost-link">
                  Lihat fitur
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4.5l2.5 2.5L8 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              </div>
              <p className="text-xs" style={{color:"#a09890"}}>Tidak perlu kartu kredit. Gratis untuk mulai.</p>
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
              <div className="animate-float-card absolute -bottom-4 left-3 right-3 md:left-5 md:right-5 rounded-2xl p-3 md:p-4" style={{background:"rgba(255,255,255,0.9)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.95)",boxShadow:"0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1)"}}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="h-1.5 w-1.5 rounded-full animate-pulse-green" style={{background:"#2d6a4f"}} />
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{color:"#2d6a4f"}}>AI Aktif</span>
                    </div>
                    <div className="font-semibold text-xs md:text-sm" style={{color:"#1E3932"}}>Telur · Ayam · Wortel</div>
                  </div>
                  <Link href="/register">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{background:"#2d6a4f"}}>Generate</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section style={{borderTop:"1px solid rgba(0,0,0,0.06)",borderBottom:"1px solid rgba(0,0,0,0.06)",background:"rgba(0,0,0,0.018)"}} className="py-10 md:py-12">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <RevealSection className="flex flex-wrap justify-around items-center gap-8">
              {[["10.4K","Pengguna Aktif"],["51K+","Resep Dihasilkan"],["1.9 ton","Food Waste Dikurangi"],["4.8","Rating Pengguna"]].map(([v,l],i,arr)=>(
                <div key={l} className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="font-mono-nums text-2xl md:text-3xl font-bold tracking-tight mb-0.5" style={{color:"#1E3932"}}>{v}</div>
                    <div className="text-xs font-medium" style={{color:"#a09890"}}>{l}</div>
                  </div>
                  {i < arr.length-1 && <div className="hidden md:block stat-divider" />}
                </div>
              ))}
            </RevealSection>
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
              <Link href="/register" className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border transition-colors" style={{borderColor:"rgba(0,0,0,0.1)",color:"#5a5550"}}>
                Lihat semua
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 10.5L10.5 2.5M10.5 2.5H5M10.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
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
                    <Link href={href} className="inline-flex items-center gap-1.5 w-full justify-center text-xs font-semibold px-3 py-2 rounded-xl border transition-all hover:border-black/20" style={{borderColor:"rgba(0,0,0,0.08)",color:"#5a5550"}}>
                      {cta}
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 9L9 2M9 2H4.5M9 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </Link>
                  </div>
                </div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="fitur" className="py-24 md:py-32 scroll-mt-20" style={{background:"#ffffff"}}>
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <RevealSection className="mb-14 md:mb-20">
              <span className="eyebrow-tag mb-5"><span className="dot" />Fitur</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-4 mb-3" style={{color:"#1E3932"}}>Semua yang Anda<br className="hidden md:block" /> butuhkan.</h2>
              <p className="text-base md:text-lg max-w-md" style={{color:"#5a5550"}}>Dari scan barcode sampai resep AI — satu aplikasi yang rapi dan intuitif.</p>
            </RevealSection>
            {/* Bento: top row 2-col, bottom row 4-col */}
            <div className="space-y-4">
              <StaggerReveal className="grid md:grid-cols-2 gap-4">
                {[
                  { Icon: Sparkles, color:"#2d6a4f", bg:"rgba(45,106,79,0.08)", title:"AI Recipe Generator", desc:"Pilih bahan, tekan generate — 3–5 resep dalam detik. AI mempertimbangkan ketersediaan bahan, kesulitan, dan selera Anda.", large:true },
                  { Icon: PackagePlus, color:"#1d4ed8", bg:"rgba(29,78,216,0.07)", title:"Input Bahan Cepat", desc:"Ketik atau scan barcode. Auto-isi nama, jumlah, dan tanggal kadaluarsa dari 1000+ produk supermarket.", large:true },
                ].map(({ Icon, color, bg, title, desc }) => (
                  <div key={title} className="bezel-outer">
                    <div className="bezel-inner p-6 md:p-8">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5" style={{background:bg}}>
                        <Icon className="h-5 w-5" style={{color}} strokeWidth={1.5} />
                      </div>
                      <h3 className="font-bold text-lg mb-2" style={{color:"#1E3932"}}>{title}</h3>
                      <p className="text-sm leading-relaxed" style={{color:"#5a5550"}}>{desc}</p>
                    </div>
                  </div>
                ))}
              </StaggerReveal>
              <StaggerReveal className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { Icon: Bell, color:"#b45309", bg:"rgba(180,83,9,0.07)", title:"Expiry Reminder", desc:"Notifikasi H-3 kadaluarsa." },
                  { Icon: BarChart3, color:"#2d6a4f", bg:"rgba(45,106,79,0.08)", title:"Zero Waste Tracker", desc:"Pantau kg food waste berkurang." },
                  { Icon: Share2, color:"#0369a1", bg:"rgba(3,105,161,0.07)", title:"Share Resep", desc:"Satu tap ke WhatsApp atau Instagram." },
                  { Icon: SlidersHorizontal, color:"#9333ea", bg:"rgba(147,51,234,0.07)", title:"Filter Cerdas", desc:"Vegetarian, halal, durasi memasak." },
                ].map(({ Icon, color, bg, title, desc }) => (
                  <div key={title} className="spotlight-card p-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{background:bg}}>
                      <Icon className="h-4 w-4" style={{color}} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1.5" style={{color:"#1E3932"}}>{title}</h3>
                    <p className="text-xs leading-relaxed" style={{color:"#a09890"}}>{desc}</p>
                  </div>
                ))}
              </StaggerReveal>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="cara-kerja" className="py-24 md:py-32 scroll-mt-20" style={{background:"#1E3932"}}>
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <RevealSection className="mb-16 md:mb-20">
              <span className="eyebrow-tag mb-5" style={{background:"rgba(45,106,79,0.2)",borderColor:"rgba(64,145,108,0.3)",color:"#6ee7b7"}}><span className="dot" style={{background:"#6ee7b7"}} />Cara Kerja</span>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight mt-4 mb-3" style={{color:"#ffffff"}}>Tiga langkah.<br className="hidden md:block" /> Tidak lebih.</h2>
              <p className="text-base md:text-lg max-w-md" style={{color:"rgba(255,255,255,0.4)"}}>Dibuat sesederhana mungkin karena tujuannya adalah memasak — bukan belajar aplikasi baru.</p>
            </RevealSection>
            <StaggerReveal className="grid md:grid-cols-3 gap-6">
              {[
                { n:"01", Icon: ScanLine, title:"Buka kulkas, input bahan", desc:"Scan barcode atau ketik langsung bahan apa yang ada. Butuh kurang dari satu menit.", accent:"#6ee7b7" },
                { n:"02", Icon: Zap, title:"Pilih dan generate resep", desc:"Pilih bahan mana yang mau dipakai hari ini. AI langsung buatkan opsi resep yang relevan.", accent:"#93c5fd" },
                { n:"03", Icon: CheckCircle2, title:"Masak dan tandai selesai", desc:"Ikuti langkah resep, tandai bahan terpakai, stok kulkas Anda otomatis terupdate.", accent:"#c4b5fd" },
              ].map(({ n, Icon, title, desc, accent }) => (
                <div key={n} className="bezel-outer-dark">
                  <div className="bezel-inner-dark p-6 md:p-8">
                    <div className="text-5xl font-bold font-mono-nums mb-6" style={{color:accent,opacity:0.2}}>{n}</div>
                    <Icon className="h-5 w-5 mb-4" style={{color:accent}} strokeWidth={1.5} />
                    <h3 className="font-bold text-base mb-2" style={{color:"#ffffff"}}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{color:"rgba(255,255,255,0.4)"}}>{desc}</p>
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
              <Link href="/profil" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-colors hover:border-black/20" style={{borderColor:"rgba(0,0,0,0.1)",color:"#5a5550"}}>
                Tulis Ulasan Anda
              </Link>
            </RevealSection>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 md:px-6">
          <RevealSection>
            <div className="rounded-[2rem] px-8 py-16 md:px-20 md:py-20 text-center relative overflow-hidden" style={{background:"#1E3932"}}>
              <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"26px 26px"}} />
              <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full" style={{background:"radial-gradient(circle,rgba(45,106,79,0.25) 0%,transparent 70%)",filter:"blur(40px)"}} />
              <div className="relative">
                <span className="eyebrow-tag mb-6" style={{background:"rgba(45,106,79,0.2)",borderColor:"rgba(64,145,108,0.3)",color:"#6ee7b7"}}><span className="dot" style={{background:"#6ee7b7"}} />Mulai Sekarang</span>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight mt-4 mb-4 max-w-2xl mx-auto" style={{color:"#ffffff"}}>
                  Kulkas penuh bukan<br className="hidden md:block" /> berarti makan enak.
                </h2>
                <p className="text-base md:text-lg mb-10 max-w-md mx-auto" style={{color:"rgba(255,255,255,0.4)"}}>Yang membuat perbedaan adalah tahu mau dimasak apa. Itu yang kami bantu.</p>
                <Link href="/register" className="btn-primary inline-flex" style={{background:"#ffffff",color:"#1E3932",borderColor:"rgba(255,255,255,0.3)",boxShadow:"0 4px 20px rgba(30,57,50,0.3), inset 0 1px 0 rgba(255,255,255,1)"}}>
                  <span>Daftar Gratis Sekarang</span>
                  <span className="btn-icon" style={{background:"rgba(30,57,50,0.10)"}}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="#1E3932" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </span>
                </Link>
              </div>
            </div>
          </RevealSection>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{background:"#1E3932",borderTop:"1px solid rgba(255,255,255,0.08)"}} className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 pb-8 mb-8" style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div>
              <Link href="/" className="flex items-center gap-2 mb-3">
                <Image src="/logo.png" alt="Kulkas Berisi" width={28} height={28} className="rounded-xl" />
                <span className="font-bold" style={{color:"#ffffff"}}>Kulkas <span style={{color:"#d4e9e2"}}>Berisi</span></span>
              </Link>
              <p className="text-sm max-w-xs" style={{color:"rgba(255,255,255,0.3)"}}>Generator resep AI dari bahan kulkas yang tersisa. Kurangi food waste, masak lebih cerdas.</p>
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-xs uppercase tracking-widest mb-1" style={{color:"rgba(255,255,255,0.3)"}}>Produk</span>
                {[["#fitur","Fitur"],["#cara-kerja","Cara Kerja"],["#ulasan","Ulasan"]].map(([h,l])=>(
                  <Link key={l} href={h} className="hover:opacity-80 transition-opacity" style={{color:"rgba(255,255,255,0.5)"}}>{l}</Link>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-xs uppercase tracking-widest mb-1" style={{color:"rgba(255,255,255,0.3)"}}>Akun</span>
                {[["/login","Masuk"],["/register","Daftar Gratis"]].map(([h,l])=>(
                  <Link key={l} href={h} className="hover:opacity-80 transition-opacity" style={{color:"rgba(255,255,255,0.5)"}}>{l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{color:"rgba(255,255,255,0.25)"}}>
            <span>&copy; {new Date().getFullYear()} Kulkas Berisi. Dibuat dengan semangat anti food waste.</span>
            <div className="flex gap-5">
              <Link href="/terms" className="hover:opacity-60 transition-opacity">Syarat &amp; Ketentuan</Link>
              <Link href="/privacy" className="hover:opacity-60 transition-opacity">Privasi</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
