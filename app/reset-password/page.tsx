"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, ScanLine, ChefHat, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";

const FeatureRow = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(45,106,79,0.25)", border: "1px solid rgba(64,145,108,0.3)" }}>
      <Icon className="h-4 w-4" style={{ color: "#6ee7b7" }} strokeWidth={1.5} />
    </div>
    <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{text}</span>
  </div>
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const checkSession = async () => {
      try {
        const supabase = getSupabaseBrowserClientOrNull();
        if (!supabase) {
          if (!cancelled) {
            setIsSupabaseReady(false);
            setError(getSupabaseBrowserConfigError());
            setIsVerifying(false);
          }
          return;
        }

        // Cek sesi awal secara langsung
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) {
            setHasSession(true);
            setIsVerifying(false);
          }
          return;
        }

        // Jika tidak ada sesi awal, buat listener untuk event pemulihan password
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (!cancelled && session) {
            setHasSession(true);
            setIsVerifying(false);
            subscription.unsubscribe();
            clearTimeout(timeoutId);
          }
        });

        // Set batas waktu 3 detik jika sesi tidak terdeteksi
        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          if (!cancelled) {
            setHasSession(false);
            setError("Tautan reset password tidak valid atau sudah kadaluarsa. Silakan minta tautan baru.");
            setIsVerifying(false);
          }
        }, 3000);

      } catch (err) {
        if (!cancelled) {
          setError("Gagal memverifikasi sesi reset password.");
          setIsVerifying(false);
        }
      }
    };

    checkSession();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (password.length < 6) {
      setError("Password harus minimal 6 karakter.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        setError(getSupabaseBrowserConfigError());
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      // Keluar dari sesi recovery agar bersih saat masuk kembali
      await supabase.auth.signOut();

      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui password");
      setIsLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;

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
          <span className="font-bold text-sm" style={{ color: "#141210" }}>Kulkas <span style={{ color: "#2d6a4f" }}>Berisi</span></span>
        </Link>
        <Link href="/login" className="text-sm font-medium flex items-center gap-1" style={{ color: "#5a5550" }}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Kembali ke Masuk
        </Link>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-5 py-12 relative z-10">
        <div className="w-full max-w-[400px]">
          <Link href="/login" className="hidden lg:inline-flex items-center gap-2 text-sm mb-10 group" style={{ color: "#5a5550" }}>
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
            Kembali ke Masuk
          </Link>

          {/* Card outer shell */}
          <div className="bezel-outer">
            <div className="bezel-inner">
              <div className="p-7">
                {/* Header */}
                <div className="mb-7">
                  <div className="eyebrow-tag mb-4">
                    <span className="dot" />
                    Atur Ulang Kredensial
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight leading-tight mb-1.5" style={{ color: "#141210" }}>
                    Atur Ulang Password
                  </h1>
                  <p className="text-sm" style={{ color: "#5a5550" }}>
                    Silakan masukkan password baru Anda di bawah ini.
                  </p>
                </div>

                {isVerifying ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <svg className="animate-spin h-8 w-8" style={{ color: "#2d6a4f" }} viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    <span className="text-sm" style={{ color: "#5a5550" }}>Memverifikasi tautan pemulihan...</span>
                  </div>
                ) : error && !hasSession ? (
                  <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                      <svg className="h-8 w-8" style={{ color: "#b91c1c" }} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg" style={{ color: "#141210" }}>Sesi Tidak Valid</h3>
                      <p className="text-sm leading-relaxed" style={{ color: "#5a5550" }}>
                        {error}
                      </p>
                    </div>
                    <Link href="/forgot-password" className="w-full h-12 rounded-2xl text-sm font-semibold text-white mt-4 flex items-center justify-center gap-2.5 transition-all duration-200"
                      style={{ background: "linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(27,67,50,0.35), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                      Minta Tautan Baru
                    </Link>
                  </div>
                ) : success ? (
                  <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(45,106,79,0.1)", border: "1px solid rgba(45,106,79,0.2)" }}>
                      <CheckCircle className="h-8 w-8" style={{ color: "#2d6a4f" }} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg" style={{ color: "#141210" }}>Password Berhasil Diubah</h3>
                      <p className="text-sm leading-relaxed" style={{ color: "#5a5550" }}>
                        Password Anda telah berhasil diatur ulang. Silakan masuk menggunakan password baru Anda.
                      </p>
                    </div>
                    <Link href="/login" className="w-full h-12 rounded-2xl text-sm font-semibold text-white mt-4 flex items-center justify-center gap-2.5 transition-all duration-200"
                      style={{ background: "linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(27,67,50,0.35), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                      Masuk ke Akun Anda
                    </Link>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#b91c1c" }}>
                        <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Password */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium" style={{ color: "#3d3530" }}>Password Baru</label>
                      <div className="relative">
                        <input
                          required autoComplete="new-password" placeholder="Minimal 6 karakter"
                          type={showPassword ? "text" : "password"} value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full h-12 px-4 pr-12 text-sm rounded-2xl focus:outline-none transition-all duration-200"
                          style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(0,0,0,0.08)", color: "#141210", boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)" }}
                          onFocus={e => { e.target.style.border = "1.5px solid rgba(45,106,79,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                          onBlur={e => { e.target.style.border = "1px solid rgba(0,0,0,0.08)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity" style={{ color: "#a09890" }}>
                          {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                        </button>
                      </div>
                      
                      {password.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex gap-1 flex-1">
                            {[1, 2, 3].map(lvl => (
                              <div key={lvl} className="h-1 rounded-full flex-1 transition-colors duration-300"
                                style={{ background: strength >= lvl ? (strength === 1 ? "#ef4444" : strength === 2 ? "#eab308" : "#2d6a4f") : "rgba(0,0,0,0.06)" }}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-medium shrink-0 ml-1.5 select-none"
                            style={{ color: strength === 1 ? "#ef4444" : strength === 2 ? "#eab308" : "#2d6a4f" }}>
                            {strength === 1 ? "Lemah" : strength === 2 ? "Sedang" : "Sangat Kuat"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium" style={{ color: "#3d3530" }}>Konfirmasi Password Baru</label>
                      <div className="relative">
                        <input
                          required autoComplete="new-password" placeholder="Ulangi password baru"
                          type={showConfirm ? "text" : "password"} value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full h-12 px-4 pr-12 text-sm rounded-2xl focus:outline-none transition-all duration-200"
                          style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(0,0,0,0.08)", color: "#141210", boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)" }}
                          onFocus={e => { e.target.style.border = "1.5px solid rgba(45,106,79,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                          onBlur={e => { e.target.style.border = "1px solid rgba(0,0,0,0.08)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity" style={{ color: "#a09890" }}>
                          {showConfirm ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                        </button>
                      </div>
                      
                      {confirmPassword.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: password === confirmPassword ? "#2d6a4f" : "#ef4444" }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
                          {password === confirmPassword ? "Password cocok" : "Password belum cocok"}
                        </div>
                      )}
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={isLoading || !isSupabaseReady || !hasSession}
                      className="w-full h-12 rounded-2xl text-sm font-semibold text-white mt-4 flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                      style={{ background: "linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(27,67,50,0.35), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                      {isLoading ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Memproses...</>
                      ) : (
                        <><span>Simpan Password Baru</span>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                          <ArrowLeft className="h-3 w-3 rotate-180" strokeWidth={2} />
                        </span></>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const leftPanel = (
    <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col relative overflow-hidden p-12" style={{ background: "#141210" }}>
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
          Kulkas <span style={{ color: "#6ee7b7" }}>Berisi</span>
        </span>
      </Link>

      {/* Body */}
      <div className="relative mt-auto mb-auto pt-16">
        <div className="eyebrow-tag mb-5" style={{ background: "rgba(45,106,79,0.2)", borderColor: "rgba(64,145,108,0.3)", color: "#6ee7b7" }}>
          <span className="dot" style={{ background: "#6ee7b7" }} />
          Keamanan Akun
        </div>
        <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-5" style={{ color: "#ffffff" }}>
          Buat password<br />yang lebih kuat.
        </h2>
        <p className="text-base leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          Gunakan minimal 6 karakter dengan kombinasi huruf, angka, dan simbol untuk menjaga keamanan kulkas digital Anda.
        </p>
      </div>

      {/* Bottom */}
      <div className="relative mt-auto space-y-2.5">
        <FeatureRow icon={ScanLine} text="Keamanan data terenkripsi penuh" />
        <FeatureRow icon={ChefHat} text="Pemulihan akun cepat & aman" />
        <FeatureRow icon={Clock} text="Akses kembali dalam hitungan menit" />
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
