"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Eye, EyeOff, ScanLine, Utensils } from "lucide-react";
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
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        if (!cancelled) {
          setIsSupabaseReady(false);
          setError(getSupabaseBrowserConfigError());
        }
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        const next = (searchParams?.get("next") ?? "").trim();
        const safeNext = next.startsWith("/") ? next : "/dashboard";
        router.replace(safeNext);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        setIsSupabaseReady(false);
        setError(getSupabaseBrowserConfigError());
        setIsLoading(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      let resolvedRole = "USER";
      if (session) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const maxAge = Math.max(
          60,
          Math.min(7 * 24 * 60 * 60, (session.expires_at ?? nowSeconds + 3600) - nowSeconds),
        );
        resolvedRole = ((session.user.user_metadata as { role?: string } | null) ?? null)?.role ?? "USER";
        setCookie("kb_access_token", session.access_token, maxAge);
        setCookie("kb_role", resolvedRole, maxAge);
      }

      const next = (searchParams?.get("next") ?? "").trim();
      // Kalau ada next param, pakai itu. Kalau tidak ada dan admin → /admin, user biasa → /dashboard
      const safeNext = next.startsWith("/") ? next : resolvedRole === "ADMIN" ? "/admin" : "/dashboard";
      router.push(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.06)_1px,transparent_0)] [background-size:18px_18px] opacity-30" />

      <Card className="relative w-full max-w-3xl overflow-hidden shadow-lg">
        <div className="grid md:grid-cols-2">
          <div className="p-8 bg-gradient-to-br from-primary/10 to-blue-100/60">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-gray-900">Kulkas Berisi</span>
            </Link>

            <h1 className="mt-10 text-3xl font-bold text-gray-900 leading-tight">
              Masuk untuk lanjut ke dashboard
            </h1>
            <p className="mt-3 text-gray-600">
              Ide resep dari bahan tersisa, reminder kadaluarsa, dan input cepat via barcode.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="flex items-start gap-3 rounded-xl border bg-white/70 p-4">
                <ScanLine className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">Scan & input cepat</div>
                  <div className="text-sm text-gray-600">Bahan masuk rapi tanpa ribet.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border bg-white/70 p-4">
                <ChefHat className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">Resep sesuai stok</div>
                  <div className="text-sm text-gray-600">Masak jadi lebih hemat dan variatif.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Selamat datang kembali</div>
                <div className="text-2xl font-bold text-gray-900">Masuk</div>
              </div>
              <Link href="/register" className="text-sm text-primary hover:underline">
                Buat akun
              </Link>
            </div>

            <div className="mt-2 text-sm text-gray-600">Masuk untuk melanjutkan ke dashboard.</div>

            <div className="mt-6 space-y-3">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !isSupabaseReady}>
                  {isLoading ? "Memuat..." : "Masuk"}
                </Button>
              </form>

              <div className="text-center text-xs text-gray-600">
                Dengan masuk, Anda setuju dengan kebijakan yang berlaku.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
