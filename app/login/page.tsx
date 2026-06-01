"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, ScanLine, ChefHat, Clock, Shield, ArrowLeft } from "lucide-react";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

const FeatureRow = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(212,233,226,0.15)" }}>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,233,226,0.15)", border: "1px solid rgba(212,233,226,0.22)" }}>
      <Icon className="h-4 w-4" style={{ color: "#d4e9e2" }} strokeWidth={1.5} />
    </div>
    <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{text}</span>
  </div>
);

const InputField = ({
  label, type = "text", placeholder, value, onChange, autoComplete,
  required = true, rightEl,
}: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; required?: boolean; rightEl?: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium" style={{ color: "#3d3530" }}>{label}</label>
    <div className="relative">
      <input
        type={type} required={required} autoComplete={autoComplete}
        placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-12 px-4 text-sm rounded-2xl focus:outline-none transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.72)", border: "1px solid rgba(0,0,0,0.08)",
          color: "#1E3932", boxShadow: "0 1px 3px rgba(30,57,50,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
          paddingRight: rightEl ? "44px" : undefined,
        }}
        onFocus={e => { e.target.style.border = "1.5px solid rgba(0,117,74,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,117,74,0.10), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
        onBlur={e => { e.target.style.border = "1px solid rgba(0,98,65,0.12)"; e.target.style.boxShadow = "0 1px 3px rgba(30,57,50,0.05), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
      />
      {rightEl && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
  </div>
);

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

  const nextParam = (searchParams?.get("next") ?? "").trim();
  const isAdminLogin = nextParam.startsWith("/admin");

  /* ─── SHARED FORM ─── */
  const formPanel = (
    <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: "#FEFCF8" }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(168,230,207,0.35) 0%, transparent 65%)", filter: "blur(48px)" }} />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(209,231,221,0.3) 0%, transparent 65%)", filter: "blur(60px)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.022]" style={{ backgroundImage: "radial-gradient(circle, #2d6a4f 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

      {/* Mobile bar */}
      <div className="lg:hidden flex items-center justify-between px-5 pt-5 pb-4 relative z-10" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Kulkas Berisi" width={28} height={28} className="rounded-xl" />
          <span className="font-bold text-sm" style={{ color: "#1E3932" }}>Kulkas <span style={{ color: "#006241" }}>Berisi</span></span>
        </Link>
        <Link href="/register" className="text-sm font-medium flex items-center gap-1" style={{ color: "#5a5550" }}>
          Daftar <ArrowLeft className="h-3.5 w-3.5 rotate-180" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-5 py-12 relative z-10">
        <div className="w-full max-w-[400px]">
          <Link href="/" className="hidden lg:inline-flex items-center gap-2 text-sm mb-10 group" style={{ color: "#5a5550" }}>
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
            Kembali ke beranda
          </Link>

          {/* Card outer shell */}
          <div className="bezel-outer">
            <div className="bezel-inner">
              <div className="p-7">
                {/* Header */}
                <div className="mb-7">
                  <div className="eyebrow-tag mb-4">
                    <span className="dot" />
                    {isAdminLogin ? "Admin Portal" : "Selamat datang kembali"}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight leading-tight mb-1.5" style={{ color: "#1E3932" }}>
                    {isAdminLogin ? "Masuk sebagai Admin" : "Masuk ke akun Anda"}
                  </h1>
                  {!isAdminLogin && (
                    <p className="text-sm" style={{ color: "#5a5550" }}>
                      Belum punya akun?{" "}
                      <Link href="/register" className="font-semibold hover:underline" style={{ color: "#006241" }}>Daftar gratis</Link>
                    </p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#b91c1c" }}>
                    <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <InputField
                    label="Email" type="email" placeholder={isAdminLogin ? "admin@kulkasberisi.id" : "nama@email.com"}
                    value={formData.email} onChange={v => setFormData(f => ({ ...f, email: v }))}
                    autoComplete="email"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium" style={{ color: "#3d3530" }}>Password</label>
                      <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: "#5a5550" }}>Lupa password?</Link>
                    </div>
                    <div className="relative">
                      <input
                        required autoComplete="current-password" placeholder="••••••••"
                        type={showPassword ? "text" : "password"} value={formData.password}
                        onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                        className="w-full h-12 px-4 pr-12 text-sm rounded-2xl focus:outline-none transition-all duration-200"
                        style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(0,98,65,0.12)", color: "#1E3932", boxShadow: "0 1px 3px rgba(30,57,50,0.05), inset 0 1px 0 rgba(255,255,255,0.9)" }}
                        onFocus={e => { e.target.style.border = "1.5px solid rgba(0,117,74,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,117,74,0.10), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                        onBlur={e => { e.target.style.border = "1px solid rgba(0,98,65,0.12)"; e.target.style.boxShadow = "0 1px 3px rgba(30,57,50,0.05), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity" style={{ color: "#a09890" }}>
                        {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={isLoading || !isSupabaseReady}
                    className="w-full h-12 rounded-2xl text-sm font-semibold text-white mt-2 flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                    style={{ background: "linear-gradient(180deg, #00754A 0%, #1E3932 100%)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(0,117,74,0.30), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                    {isLoading ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Memuat...</>
                    ) : (
                      <><span>{isAdminLogin ? "Masuk ke Dashboard Admin" : "Masuk ke Dashboard"}</span>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <ArrowLeft className="h-3 w-3 rotate-180" strokeWidth={2} />
                      </span></>
                    )}
                  </button>
                </form>

                {/* Feature hints — user only */}
                {!isAdminLogin && (
                  <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                    <p className="text-xs text-center mb-3" style={{ color: "#a09890" }}>Yang tersedia setelah masuk</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ Icon: ScanLine, l: "Scan Bahan" }, { Icon: ChefHat, l: "Resep AI" }, { Icon: Clock, l: "Kadaluarsa" }].map(({ Icon, l }) => (
                        <div key={l} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center" style={{ background: "rgba(45,106,79,0.05)", border: "1px solid rgba(45,106,79,0.1)" }}>
                          <Icon className="h-4 w-4" style={{ color: "#00754A" }} strokeWidth={1.5} />
                          <span className="text-xs font-medium" style={{ color: "#5a5550" }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-5 text-center text-xs" style={{ color: "#a09890" }}>
                  Dengan masuk Anda menyetujui{" "}
                  <Link href="/terms" className="underline hover:opacity-70">Syarat</Link> &{" "}
                  <Link href="/privacy" className="underline hover:opacity-70">Privasi</Link> kami.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── LEFT PANEL (shared dark) ─── */
  const leftPanel = (
    <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col relative overflow-hidden p-12" style={{ background: "#1E3932" }}>
      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
      {/* Green orb top */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
      {/* Green orb bottom */}
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(45,106,79,0.18) 0%, transparent 70%)", filter: "blur(50px)" }} />

      {/* Logo */}
      <Link href="/" className="relative flex items-center gap-2.5 group w-fit">
        <Image src="/logo.png" alt="Kulkas Berisi" width={34} height={34} className="rounded-xl group-hover:scale-105 transition-transform duration-200" />
        <span className="font-bold text-lg tracking-tight" style={{ color: "#ffffff" }}>
          Kulkas <span style={{ color: "#d4e9e2" }}>Berisi</span>
        </span>
      </Link>

      {/* Body */}
      <div className="relative mt-auto mb-auto pt-16">
        <div className="eyebrow-tag mb-5" style={{ background: "rgba(212,233,226,0.15)", borderColor: "rgba(212,233,226,0.22)", color: "#d4e9e2" }}>
          <span className="dot" style={{ background: "#d4e9e2" }} />
          {isAdminLogin ? "Management System" : "Selamat datang kembali"}
        </div>
        <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-5" style={{ color: "#ffffff" }}>
          {isAdminLogin ? <>Admin<br />Dashboard.</> : <>Masak lebih<br />pintar hari ini.</>}
        </h2>
        <p className="text-base leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          {isAdminLogin
            ? "Kelola pengguna, pantau ulasan, dan analitik platform dari satu tempat."
            : "Masukkan bahan yang tersisa, dan biarkan AI kami menyiapkan idenya."}
        </p>
      </div>

      {/* Bottom */}
      <div className="relative mt-auto space-y-2.5">
        {isAdminLogin ? (
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Pengguna", value: "10K+" }, { label: "Resep AI", value: "50K+" }, { label: "Rating", value: "4.8" }].map(({ label, value }) => (
              <div key={label} className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-lg font-bold font-mono-nums" style={{ color: "#d4e9e2" }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <FeatureRow icon={ScanLine} text="Scan barcode — bahan langsung masuk" />
            <FeatureRow icon={ChefHat} text="3–5 resep AI dari bahan yang ada" />
            <FeatureRow icon={Clock} text="Reminder H-3 sebelum kadaluarsa" />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] font-display antialiased flex flex-col lg:flex-row">
      {leftPanel}
      {formPanel}
    </div>
  );
}
