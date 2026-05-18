"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Clock, Eye, EyeOff, Leaf, ScanLine, CheckCircle2, ArrowLeft } from "lucide-react";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";

const inputBase = "w-full h-12 px-4 text-sm rounded-2xl focus:outline-none transition-all duration-200";
const inputStyle = {
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(0,0,0,0.08)",
  color: "#141210",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
};
const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.border = "1.5px solid rgba(45,106,79,0.5)";
  e.target.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08), inset 0 1px 0 rgba(255,255,255,0.9)";
};
const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.border = "1px solid rgba(0,0,0,0.08)";
  e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)";
};

const FeatureRow = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(45,106,79,0.25)", border: "1px solid rgba(64,145,108,0.3)" }}>
      <Icon className="h-4 w-4" style={{ color: "#6ee7b7" }} strokeWidth={1.5} />
    </div>
    <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{text}</span>
  </div>
);

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
  const strengthColor = ["", "#ef4444", "#f59e0b", "#2d6a4f"][strength];

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

  return (
    <div className="min-h-[100dvh] font-display antialiased flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col relative overflow-hidden p-12" style={{ background: "#141210" }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(45,106,79,0.18) 0%, transparent 70%)", filter: "blur(50px)" }} />

        <Link href="/" className="relative flex items-center gap-2.5 group w-fit">
          <Image src="/logo.png" alt="Kulkas Berisi" width={34} height={34} className="rounded-xl group-hover:scale-105 transition-transform duration-200" />
          <span className="font-bold text-lg tracking-tight" style={{ color: "#ffffff" }}>
            Kulkas <span style={{ color: "#6ee7b7" }}>Berisi</span>
          </span>
        </Link>

        <div className="relative mt-auto mb-auto pt-16">
          <div className="eyebrow-tag mb-5" style={{ background: "rgba(45,106,79,0.2)", borderColor: "rgba(64,145,108,0.3)", color: "#6ee7b7" }}>
            <span className="dot" style={{ background: "#6ee7b7" }} />
            Bergabung sekarang
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-5" style={{ color: "#ffffff" }}>
            Mulai dari<br />bahan yang ada.
          </h2>
          <p className="text-base leading-relaxed max-w-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Daftar gratis — tidak perlu kartu kredit. Mulai kurangi food waste hari ini.
          </p>

          {/* Social proof */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["AB", "CR", "DW", "EF"].map((initials, i) => (
                <div key={i} className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `hsl(${140 + i * 20}, 30%, 25%)`, border: "2px solid #141210", color: "#6ee7b7" }}>
                  {initials[0]}
                </div>
              ))}
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span style={{ color: "#ffffff", fontWeight: 600 }}>10,000+</span> pengguna aktif
            </p>
          </div>
        </div>

        <div className="relative mt-auto space-y-2.5">
          <FeatureRow icon={ScanLine} text="Scan barcode produk — auto input bahan" />
          <FeatureRow icon={ChefHat} text="AI generate 3–5 resep dari bahan tersisa" />
          <FeatureRow icon={Clock} text="Reminder H-3 sebelum bahan kadaluarsa" />
          <FeatureRow icon={Leaf} text="Lacak berapa kg food waste yang dikurangi" />
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: "#FEFCF8" }}>
        <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(168,230,207,0.35) 0%, transparent 65%)", filter: "blur(48px)" }} />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(209,231,221,0.3) 0%, transparent 65%)", filter: "blur(60px)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.022]" style={{ backgroundImage: "radial-gradient(circle, #2d6a4f 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

        {/* Mobile bar */}
        <div className="lg:hidden flex items-center justify-between px-5 pt-5 pb-4 relative z-10" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Kulkas Berisi" width={28} height={28} className="rounded-xl" />
            <span className="font-bold text-sm" style={{ color: "#141210" }}>Kulkas <span style={{ color: "#2d6a4f" }}>Berisi</span></span>
          </Link>
          <Link href="/login" className="text-sm font-medium flex items-center gap-1" style={{ color: "#5a5550" }}>
            Masuk <ArrowLeft className="h-3.5 w-3.5 rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 py-10 relative z-10">
          <div className="w-full max-w-[400px]">
            <Link href="/" className="hidden lg:inline-flex items-center gap-2 text-sm mb-8 group" style={{ color: "#5a5550" }}>
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
              Kembali ke beranda
            </Link>

            {/* Double-bezel card */}
            <div className="bezel-outer">
              <div className="bezel-inner">
                <div className="p-7">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="eyebrow-tag mb-4"><span className="dot" />Daftar Gratis</div>
                    <h1 className="text-2xl font-bold tracking-tight leading-tight mb-1.5" style={{ color: "#141210" }}>Buat akun baru</h1>
                    <p className="text-sm" style={{ color: "#5a5550" }}>
                      Sudah punya akun?{" "}
                      <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2d6a4f" }}>Masuk di sini</Link>
                    </p>
                  </div>

                  {/* Alerts */}
                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#b91c1c" }}>
                      <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-2xl text-sm" style={{ background: "rgba(45,106,79,0.06)", border: "1px solid rgba(45,106,79,0.2)", color: "#1b4332" }}>
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} style={{ color: "#2d6a4f" }} />
                      <span>{success}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nama */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" style={{ color: "#3d3530" }}>
                        Nama <span className="font-normal" style={{ color: "#a09890" }}>(opsional)</span>
                      </label>
                      <input type="text" autoComplete="name" placeholder="Nama Anda"
                        value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                        className={inputBase} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" style={{ color: "#3d3530" }}>Email</label>
                      <input type="email" required autoComplete="email" placeholder="nama@email.com"
                        value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                        className={inputBase} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" style={{ color: "#3d3530" }}>Password</label>
                      <div className="relative">
                        <input required autoComplete="new-password" placeholder="Minimal 6 karakter"
                          type={showPassword ? "text" : "password"}
                          value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                          className={`${inputBase} pr-12`} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity" style={{ color: "#a09890" }}>
                          {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                        </button>
                      </div>
                      {formData.password.length > 0 && (
                        <div className="mt-1.5">
                          <div className="flex gap-1 mb-1">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ background: i <= strength ? strengthColor : "rgba(0,0,0,0.08)" }} />
                            ))}
                          </div>
                          <p className="text-xs" style={{ color: "#a09890" }}>Kekuatan: <span className="font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span></p>
                        </div>
                      )}
                    </div>

                    {/* Confirm */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" style={{ color: "#3d3530" }}>Konfirmasi Password</label>
                      <div className="relative">
                        <input required autoComplete="new-password" placeholder="Ulangi password"
                          type={showConfirm ? "text" : "password"}
                          value={formData.confirmPassword} onChange={e => setFormData(f => ({ ...f, confirmPassword: e.target.value }))}
                          className={`${inputBase} pr-12`} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity" style={{ color: "#a09890" }}>
                          {showConfirm ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                        </button>
                      </div>
                      {formData.confirmPassword.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: formData.password === formData.confirmPassword ? "#2d6a4f" : "#ef4444" }}>
                          <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                          {formData.password === formData.confirmPassword ? "Password cocok" : "Password belum cocok"}
                        </div>
                      )}
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={isLoading || !isSupabaseReady}
                      className="w-full h-12 rounded-2xl text-sm font-semibold text-white mt-1 flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                      style={{ background: "linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(27,67,50,0.35), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                      {isLoading ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Mendaftarkan...</>
                      ) : (
                        <><span>Buat Akun Gratis</span>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                          <ArrowLeft className="h-3 w-3 rotate-180" strokeWidth={2} />
                        </span></>
                      )}
                    </button>
                  </form>

                  {/* Feature hints */}
                  <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                    <div className="grid grid-cols-4 gap-2">
                      {[{ Icon: ScanLine, l: "Scan" }, { Icon: ChefHat, l: "Resep AI" }, { Icon: Clock, l: "Reminder" }, { Icon: Leaf, l: "Zero Waste" }].map(({ Icon, l }) => (
                        <div key={l} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center" style={{ background: "rgba(45,106,79,0.05)", border: "1px solid rgba(45,106,79,0.1)" }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: "#40916c" }} strokeWidth={1.5} />
                          <span className="text-[10px] font-medium leading-tight" style={{ color: "#5a5550" }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="mt-5 text-center text-xs" style={{ color: "#a09890" }}>
                    Dengan mendaftar Anda menyetujui{" "}
                    <Link href="/terms" className="underline hover:opacity-70">Syarat</Link> &{" "}
                    <Link href="/privacy" className="underline hover:opacity-70">Privasi</Link> kami.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
