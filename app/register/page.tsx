"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChefHat, Clock, Eye, EyeOff, Leaf, ScanLine, Utensils } from "lucide-react";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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
      if (!cancelled && data.session) router.replace("/dashboard");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Password tidak cocok");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        setIsSupabaseReady(false);
        setError(getSupabaseBrowserConfigError());
        setIsLoading(false);
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name || undefined,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        return;
      }

      setSuccess(
        "Registrasi berhasil. Silakan cek email untuk verifikasi, lalu login.",
      );
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
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
              Buat akun dan mulai dari bahan yang ada
            </h1>
            <p className="mt-3 text-gray-600">
              Kelola stok, dapatkan ide resep, dan jadikan dapur lebih hemat serta minim limbah.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="flex items-start gap-3 rounded-xl border bg-white/70 p-4">
                <ScanLine className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">Input cepat</div>
                  <div className="text-sm text-gray-600">Manual atau scan barcode.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border bg-white/70 p-4">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">Reminder</div>
                  <div className="text-sm text-gray-600">Bahan dipakai sebelum kadaluarsa.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border bg-white/70 p-4">
                <ChefHat className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900">Resep</div>
                  <div className="text-sm text-gray-600">Ide masak yang relevan dan variatif.</div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-2 text-sm text-gray-600">
              <Leaf className="h-4 w-4 text-primary" />
              <span>Kurangi food waste, mulai dari kulkas kamu.</span>
            </div>
          </div>

          <div className="p-8 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Mulai sekarang</div>
                <div className="text-2xl font-bold text-gray-900">Daftar</div>
              </div>
              <Link href="/login" className="text-sm text-primary hover:underline">
                Sudah punya akun?
              </Link>
            </div>

            <div className="mt-2 text-sm text-gray-600">Buat akun untuk mulai mengurangi limbah makanan.</div>

            <div className="mt-6 space-y-3">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-primary/10 text-primary text-sm rounded-md">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nama Anda"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoComplete="name"
                  />
                </div>
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
                      autoComplete="new-password"
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
                  <div className="text-xs text-gray-600">Minimal 6 karakter.</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !isSupabaseReady}>
                  {isLoading ? "Memuat..." : "Daftar"}
                </Button>
              </form>

              <div className="text-center text-xs text-gray-600">
                Dengan mendaftar, Anda setuju dengan kebijakan yang berlaku.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
