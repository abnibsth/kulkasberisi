"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Eye, EyeOff, ScanLine, Clock, ArrowRight } from "lucide-react";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) { if (!cancelled) { setIsSupabaseReady(false); setError(getSupabaseBrowserConfigError()); } return; }
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        const next = (searchParams?.get("next") ?? "").trim();
        router.replace(next.startsWith("/") ? next : "/dashboard");
      }
    })();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError("");
    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) { setIsSupabaseReady(false); setError(getSupabaseBrowserConfigError()); setIsLoading(false); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
      if (signInError) { setError(signInError.message); setIsLoading(false); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      let resolvedRole = "USER";
      if (session) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const maxAge = Math.max(60, Math.min(7 * 24 * 60 * 60, (session.expires_at ?? nowSeconds + 3600) - nowSeconds));
        resolvedRole = ((session.user.user_metadata as { role?: string } | null) ?? null)?.role ?? "USER";
        setCookie("kb_access_token", session.access_token, maxAge);
        setCookie("kb_role", resolvedRole, maxAge);
      }
      const next = (searchParams?.get("next") ?? "").trim();
      router.push(next.startsWith("/") ? next : resolvedRole === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans antialiased flex flex-col lg:flex-row">

      {/* ── LEFT PANEL (dark) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-gray-900 flex-col relative overflow-hidden p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage:"radial-gradient(circle,#fff 1.5px,transparent 1.5px)", backgroundSize:"28px 28px" }} />
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-green-500/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5 group w-fit">
          <Image src="/logo.png" alt="Kulkas Berisi" width={36} height={36} className="rounded-xl group-hover:scale-110 transition-transform duration-200" />
          <span className="font-bold text-white text-lg tracking-tight">Kulkas <span className="text-green-400">Berisi</span></span>
        </Link>

        <div className="relative mt-auto mb-auto pt-16">
          <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-4">Selamat datang kembali</p>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-5">
            Masak lebih<br />pintar hari ini.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
            Masukkan bahan yang tersisa, dan biarkan AI kami menyiapkan idenya.
          </p>
        </div>

        <div className="relative mt-auto space-y-3">
          {[
            { Icon: ScanLine, text: "Scan barcode — bahan langsung masuk" },
            { Icon: ChefHat, text: "3–5 resep AI dari bahan yang ada" },
            { Icon: Clock,   text: "Reminder H-3 sebelum kadaluarsa" },
          ].map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-green-400" />
              </div>
              <span className="text-sm text-gray-300">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL (light + glass form) ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #f0fdf4 0%, #f8fafc 50%, #ecfdf5 100%)" }}>

        {/* iOS-style glossy background with colored light blobs */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: "linear-gradient(135deg, #f0fffe 0%, #ffffff 35%, #fafff0 65%, #f5f0ff 100%)",
        }} />
        <div className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full" style={{
          background: "radial-gradient(circle, rgba(167,243,208,0.45) 0%, rgba(110,231,183,0.2) 40%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full" style={{
          background: "radial-gradient(circle, rgba(196,181,253,0.3) 0%, rgba(167,243,208,0.2) 50%, transparent 70%)",
          filter: "blur(50px)",
        }} />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full" style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(240,253,244,0.4) 50%, transparent 70%)",
          filter: "blur(30px)",
        }} />
        <div className="pointer-events-none absolute top-1/4 right-10 w-48 h-48 rounded-full" style={{
          background: "radial-gradient(circle, rgba(186,230,253,0.35) 0%, transparent 70%)",
          filter: "blur(30px)",
        }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "radial-gradient(circle, #064e3b 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }} />

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Kulkas Berisi" width={30} height={30} className="rounded-lg" />
            <span className="font-bold text-gray-900">Kulkas <span className="text-green-600">Berisi</span></span>
          </Link>
          <Link href="/register" className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
            Daftar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Centered form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
          <div className="w-full max-w-md">

            <Link href="/" className="hidden lg:inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 group">
              <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span> Kembali ke beranda
            </Link>

            {/* GLASS CARD */}
            <div className="relative overflow-hidden" style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 100%)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255,255,255,0.95)",
              borderTop: "1px solid rgba(255,255,255,1)",
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
            }}>
              {/* Gloss shine overlay — top half of card */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 rounded-t-[20px]" style={{
                height: "45%",
                background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 60%, transparent 100%)",
                zIndex: 0,
              }} />
              {/* Top shine line */}
              <div className="pointer-events-none absolute top-0 left-8 right-8 h-px rounded-full" style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,1) 30%, rgba(255,255,255,1) 70%, transparent)",
                zIndex: 1,
              }} />
              {/* Subtle diagonal glare */}
              <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full" style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)",
                zIndex: 0,
              }} />

              <div className="p-8 relative" style={{ zIndex: 2 }}>
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Masuk</h2>
                  <p className="text-gray-400 text-sm">
                    Belum punya akun?{" "}
                    <Link href="/register" className="text-green-600 hover:text-green-700 font-medium hover:underline">Daftar gratis</Link>
                  </p>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-red-700 text-sm backdrop-blur-sm">
                    <span className="shrink-0">⚠️</span><span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" required autoComplete="email" placeholder="nama@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(0,0,0,0.1)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
                      }}
                      onFocus={(e) => { e.target.style.border = "1px solid rgba(22,163,74,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"; }}
                      onBlur={(e) => { e.target.style.border = "1px solid rgba(0,0,0,0.1)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)"; }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">Password</label>
                      <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Lupa password?</Link>
                    </div>
                    <div className="relative">
                      <input required autoComplete="current-password" placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-12 px-4 pr-11 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.7)",
                          border: "1px solid rgba(0,0,0,0.1)",
                          backdropFilter: "blur(8px)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
                        }}
                        onFocus={(e) => { e.target.style.border = "1px solid rgba(22,163,74,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"; }}
                        onBlur={(e) => { e.target.style.border = "1px solid rgba(0,0,0,0.1)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)"; }}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Glossy dark button */}
                  <button type="submit" disabled={isLoading || !isSupabaseReady}
                    className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(180deg, #1f2937 0%, #111827 100%)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderTop: "1px solid rgba(255,255,255,0.18)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
                    }}>
                    {isLoading ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg> Memuat...</>
                    ) : "Masuk ke Dashboard"}
                  </button>
                </form>

                {/* Feature grid */}
                <div className="mt-6 pt-5 border-t border-black/5">
                  <p className="text-xs text-gray-400 text-center mb-3">Yang bisa Anda lakukan setelah masuk</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ Icon: ScanLine, l:"Scan Bahan" }, { Icon: ChefHat, l:"Generate Resep" }, { Icon: Clock, l:"Cek Kadaluarsa" }].map(({ Icon, l }) => (
                      <div key={l} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center"
                        style={{ background:"rgba(255,255,255,0.6)", border:"1px solid rgba(0,0,0,0.06)", backdropFilter:"blur(4px)" }}>
                        <Icon className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-gray-500">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-5 text-center text-xs text-gray-400">
                  Dengan masuk, Anda menyetujui{" "}
                  <Link href="/terms" className="underline hover:text-gray-700">Syarat</Link> dan{" "}
                  <Link href="/privacy" className="underline hover:text-gray-700">Privasi</Link> kami.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
