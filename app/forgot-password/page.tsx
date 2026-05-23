"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle, ScanLine, ChefHat, Clock } from "lucide-react";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";

const FeatureRow = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(45,106,79,0.25)", border: "1px solid rgba(64,145,108,0.3)" }}>
      <Icon className="h-4 w-4" style={{ color: "#6ee7b7" }} strokeWidth={1.5} />
    </div>
    <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{text}</span>
  </div>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        setIsSupabaseReady(false);
        setError(getSupabaseBrowserConfigError());
        setIsLoading(false);
        return;
      }

      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses permintaan");
      setIsLoading(false);
    }
  };

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
                    Pemulihan Akun
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight leading-tight mb-1.5" style={{ color: "#141210" }}>
                    Lupa Password?
                  </h1>
                  <p className="text-sm" style={{ color: "#5a5550" }}>
                    Masukkan alamat email Anda untuk mendapatkan tautan pemulihan password.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#b91c1c" }}>
                    <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Success */}
                {success ? (
                  <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(45,106,79,0.1)", border: "1px solid rgba(45,106,79,0.2)" }}>
                      <CheckCircle className="h-8 w-8" style={{ color: "#2d6a4f" }} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg" style={{ color: "#141210" }}>Email Dikirim</h3>
                      <p className="text-sm leading-relaxed" style={{ color: "#5a5550" }}>
                        Kami telah mengirimkan instruksi pemulihan password ke email <span className="font-semibold" style={{ color: "#141210" }}>{email}</span>. Silakan periksa folder masuk atau spam Anda.
                      </p>
                    </div>
                    <Link href="/login" className="w-full h-12 rounded-2xl text-sm font-semibold text-white mt-4 flex items-center justify-center gap-2.5 transition-all duration-200"
                      style={{ background: "linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(27,67,50,0.35), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                      Kembali ke Masuk
                    </Link>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium" style={{ color: "#3d3530" }}>Email</label>
                      <div className="relative">
                        <input
                          type="email" required autoComplete="email"
                          placeholder="nama@email.com" value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full h-12 px-4 text-sm rounded-2xl focus:outline-none transition-all duration-200"
                          style={{
                            background: "rgba(255,255,255,0.72)", border: "1px solid rgba(0,0,0,0.08)",
                            color: "#141210", boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
                          }}
                          onFocus={e => { e.target.style.border = "1.5px solid rgba(45,106,79,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                          onBlur={e => { e.target.style.border = "1px solid rgba(0,0,0,0.08)"; e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={isLoading || !isSupabaseReady}
                      className="w-full h-12 rounded-2xl text-sm font-semibold text-white mt-2 flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                      style={{ background: "linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 4px 20px rgba(27,67,50,0.35), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                      {isLoading ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Mengirim...</>
                      ) : (
                        <><span>Kirim Tautan Pemulihan</span>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                          <ArrowLeft className="h-3 w-3 rotate-180" strokeWidth={2} />
                        </span></>
                      )}
                    </button>
                  </form>
                )}

                <p className="mt-6 text-center text-xs" style={{ color: "#a09890" }}>
                  Ingat password Anda?{" "}
                  <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2d6a4f" }}>Masuk sekarang</Link>
                </p>
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
          Amankan kembali<br />akses Anda.
        </h2>
        <p className="text-base leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          Kami akan membantu Anda memulihkan password agar Anda bisa kembali memasak dengan cerdas.
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
