"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Clock, Eye, EyeOff, Leaf, ScanLine, CheckCircle2, ArrowRight } from "lucide-react";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  const strength = formData.password.length === 0 ? 0 : formData.password.length < 6 ? 1 : formData.password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Lemah", "Cukup", "Kuat"][strength];
  const strengthColorBg = ["", "bg-red-400", "bg-yellow-400", "bg-green-500"][strength];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) { if (!cancelled) { setIsSupabaseReady(false); setError(getSupabaseBrowserConfigError()); } return; }
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) router.replace("/dashboard");
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError(""); setSuccess("");
    if (formData.password !== formData.confirmPassword) { setError("Password tidak cocok"); setIsLoading(false); return; }
    if (formData.password.length < 6) { setError("Password minimal 6 karakter"); setIsLoading(false); return; }
    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) { setIsSupabaseReady(false); setError(getSupabaseBrowserConfigError()); setIsLoading(false); return; }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email, password: formData.password,
        options: { data: { name: formData.name || undefined } },
      });
      if (signUpError) { setError(signUpError.message); setIsLoading(false); return; }
      if (data.session) { router.push("/dashboard"); return; }
      setSuccess("Registrasi berhasil! Cek email Anda untuk verifikasi.");
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
      setIsLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.1)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(22,163,74,0.5)";
    e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.08), inset 0 1px 0 rgba(255,255,255,0.8)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(0,0,0,0.1)";
    e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)";
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
          <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-4">Bergabung sekarang</p>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-5">
            Mulai dari<br />bahan yang ada.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
            Daftar gratis — tidak perlu kartu kredit. Mulai kurangi food waste hari ini.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["🧑","👩","🧔","👧"].map((e, i) => (
                <div key={i} className="h-8 w-8 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-sm">{e}</div>
              ))}
            </div>
            <p className="text-sm text-gray-400"><span className="text-white font-semibold">10,000+</span> pengguna aktif</p>
          </div>
        </div>

        <div className="relative mt-auto space-y-3">
          {[
            { Icon: ScanLine, text: "Scan barcode produk — auto input bahan" },
            { Icon: ChefHat,  text: "AI generate 3–5 resep dari bahan tersisa" },
            { Icon: Clock,    text: "Reminder H-3 sebelum bahan kadaluarsa" },
            { Icon: Leaf,     text: "Lacak berapa kg food waste yang dikurangi" },
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
        {/* Large glowing orbs — like light through glass */}
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
        {/* Fine mesh shimmer */}
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
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
            Masuk <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10 relative z-10">
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
                height: "40%",
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
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Buat akun</h2>
                  <p className="text-gray-400 text-sm">
                    Sudah punya akun?{" "}
                    <Link href="/login" className="text-green-600 hover:text-green-700 font-medium hover:underline">Masuk di sini</Link>
                  </p>
                </div>

                {error && (
                  <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-red-700 text-sm">
                    <span className="shrink-0">⚠️</span><span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-green-50/80 border border-green-200 rounded-xl text-green-700 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /><span>{success}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nama */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nama <span className="text-gray-400 font-normal">(opsional)</span>
                    </label>
                    <input type="text" autoComplete="name" placeholder="Nama Anda"
                      value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" required autoComplete="email" placeholder="nama@email.com"
                      value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                      style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input required autoComplete="new-password" placeholder="Minimal 6 karakter"
                        type={showPassword ? "text" : "password"}
                        value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-11 px-4 pr-11 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                        style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formData.password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColorBg : "bg-gray-200"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">Kekuatan: <span className="font-medium text-gray-600">{strengthLabel}</span></p>
                      </div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Konfirmasi Password</label>
                    <div className="relative">
                      <input required autoComplete="new-password" placeholder="Ulangi password"
                        type={showConfirm ? "text" : "password"}
                        value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full h-11 px-4 pr-11 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                        style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      <button type="button" onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formData.confirmPassword.length > 0 && (
                      <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${formData.password === formData.confirmPassword ? "text-green-600" : "text-red-500"}`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {formData.password === formData.confirmPassword ? "Password cocok" : "Password belum cocok"}
                      </div>
                    )}
                  </div>

                  {/* Glossy dark button */}
                  <button type="submit" disabled={isLoading || !isSupabaseReady}
                    className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
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
                      </svg> Mendaftarkan...</>
                    ) : "Buat Akun Gratis"}
                  </button>
                </form>

                {/* Feature row */}
                <div className="mt-5 pt-5 border-t border-black/5">
                  <div className="grid grid-cols-4 gap-2">
                    {[{ Icon: ScanLine, l:"Scan" }, { Icon: ChefHat, l:"Resep" }, { Icon: Clock, l:"Reminder" }, { Icon: Leaf, l:"Zero Waste" }].map(({ Icon, l }) => (
                      <div key={l} className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-center"
                        style={{ background:"rgba(255,255,255,0.6)", border:"1px solid rgba(0,0,0,0.06)", backdropFilter:"blur(4px)" }}>
                        <Icon className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-[10px] text-gray-500 leading-tight">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-5 text-center text-xs text-gray-400">
                  Dengan mendaftar, Anda menyetujui{" "}
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
