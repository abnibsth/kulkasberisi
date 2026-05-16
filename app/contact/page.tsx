"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MapPin, Clock, Send, CheckCircle2, ChefHat } from "lucide-react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased flex flex-col">

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Kulkas Berisi" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-gray-900 text-lg tracking-tight">Kulkas <span className="text-green-600">Berisi</span></span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Kembali ke Beranda
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* HERO */}
        <section className="bg-gray-950 pt-20 pb-24 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="max-w-6xl mx-auto px-6 relative">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-4 animate-fade-in-up">Kontak</p>
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-5 animate-fade-in-up delay-100">
              Ada yang ingin<br />Anda tanyakan?
            </h1>
            <p className="text-gray-400 text-xl max-w-xl leading-relaxed animate-fade-in-up delay-200">
              Kami senang mendengar dari Anda — baik soal kemitraan, iklan, feedback produk, atau sekadar menyapa.
            </p>
          </div>
        </section>

        {/* CONTENT */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-5 gap-14">

            {/* Info Cards */}
            <div className="lg:col-span-2 space-y-5">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Informasi Kontak</h2>

              {[
                {
                  icon: Mail,
                  title: "Email",
                  val: "hello@kulkasberisi.id",
                  sub: "Respons dalam 1–2 hari kerja",
                  href: "mailto:hello@kulkasberisi.id",
                  color: "bg-green-50 text-green-600",
                },
                {
                  icon: MapPin,
                  title: "Lokasi",
                  val: "Jakarta, Indonesia",
                  sub: "Tim kami beroperasi dari Jakarta",
                  href: null,
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  icon: Clock,
                  title: "Jam Kerja",
                  val: "Senin – Jumat",
                  sub: "09:00 – 17:00 WIB",
                  href: null,
                  color: "bg-purple-50 text-purple-600",
                },
              ].map(({ icon: Icon, title, val, sub, href, color }) => (
                <div key={title} className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 group">
                  <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{title}</div>
                    {href ? (
                      <a href={href} className="font-semibold text-gray-900 hover:text-green-600 transition-colors">{val}</a>
                    ) : (
                      <div className="font-semibold text-gray-900">{val}</div>
                    )}
                    <div className="text-sm text-gray-400 mt-0.5">{sub}</div>
                  </div>
                </div>
              ))}

              {/* Partnership CTA */}
              <div className="rounded-2xl bg-gray-900 p-6 text-white mt-6">
                <ChefHat className="h-8 w-8 text-green-400 mb-3" />
                <h3 className="font-bold text-lg mb-2">Pasang Iklan atau Kolaborasi?</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  Jangkau ribuan pengguna aktif yang peduli dengan konsumsi pangan sehat. Hubungi kami untuk paket kemitraan.
                </p>
                <div className="text-sm font-medium text-green-400">hello@kulkasberisi.id →</div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="rounded-3xl border border-gray-100 shadow-xl p-8 md:p-10">
                {sent ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Pesan Terkirim!</h3>
                    <p className="text-gray-500 max-w-sm mb-6">Terima kasih sudah menghubungi kami. Kami akan membalas dalam 1–2 hari kerja.</p>
                    <Button variant="outline" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                      Kirim Pesan Lain
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Kirim Pesan</h2>
                    <p className="text-gray-400 text-sm mb-8">Isi form di bawah dan kami akan segera menghubungi Anda.</p>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama <span className="text-red-400">*</span></label>
                          <input
                            type="text" required value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Nama Anda"
                            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-400">*</span></label>
                          <input
                            type="email" required value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="email@anda.com"
                            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Subjek <span className="text-red-400">*</span></label>
                        <select
                          required value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white appearance-none"
                        >
                          <option value="">Pilih topik...</option>
                          <option value="partnership">Kemitraan & Iklan</option>
                          <option value="feedback">Feedback Produk</option>
                          <option value="bug">Laporkan Bug</option>
                          <option value="media">Liputan Media</option>
                          <option value="other">Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pesan <span className="text-red-400">*</span></label>
                        <textarea
                          required rows={5} value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          placeholder="Ceritakan apa yang ingin Anda sampaikan..."
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                        />
                      </div>
                      <Button
                        type="submit" disabled={loading}
                        className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-sm shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Mengirim...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Send className="h-4 w-4" /> Kirim Pesan
                          </span>
                        )}
                      </Button>
                      <p className="text-xs text-gray-400 text-center">
                        Dengan mengirim form ini, Anda menyetujui{" "}
                        <Link href="/privacy" className="underline hover:text-gray-700">Kebijakan Privasi</Link> kami.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>&copy; 2026 Kulkas Berisi. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privasi</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Syarat</Link>
            <Link href="/" className="hover:text-gray-900 transition-colors">Beranda</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
