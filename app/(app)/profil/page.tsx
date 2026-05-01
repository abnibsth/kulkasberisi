"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, User as UserIcon, Settings, MessageSquareQuote } from "lucide-react";

const DIETARY = ["halal", "vegetarian", "vegan"] as const;

type UserMeta = {
  name?: string;
  dietary?: string[];
  notifications?: boolean;
  emailAlerts?: boolean;
};

export default function ProfilPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [joinedAt, setJoinedAt] = useState<string>("");
  const [meta, setMeta] = useState<UserMeta>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewDisplayName, setReviewDisplayName] = useState<string>("");
  const [reviewRole, setReviewRole] = useState<string>("");
  const [reviewMessage, setReviewMessage] = useState<string>("");
  const [reviewPublic, setReviewPublic] = useState<boolean>(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        if (!cancelled) setError(getSupabaseBrowserConfigError());
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) return;

      const um = (user.user_metadata as UserMeta) || {};
      if (!cancelled) {
        setEmail(user.email ?? "");
        setJoinedAt(user.created_at ? new Date(user.created_at).toLocaleDateString("id-ID") : "");
        setMeta({
          name: um.name || "",
          dietary: Array.isArray(um.dietary) ? um.dietary : [],
          notifications: typeof um.notifications === "boolean" ? um.notifications : true,
          emailAlerts: typeof um.emailAlerts === "boolean" ? um.emailAlerts : false,
        });
        const safeName = (um.name || user.email || "User").toString();
        setReviewDisplayName(safeName.length > 40 ? safeName.slice(0, 40) : safeName);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const dietarySet = useMemo(() => new Set(meta.dietary ?? []), [meta.dietary]);

  const toggleDietary = (key: (typeof DIETARY)[number]) => {
    const current = new Set(meta.dietary ?? []);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    setMeta({ ...meta, dietary: Array.from(current) });
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) throw new Error(getSupabaseBrowserConfigError());
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: meta.name || undefined,
          dietary: meta.dietary ?? [],
          notifications: Boolean(meta.notifications),
          emailAlerts: Boolean(meta.emailAlerts),
        },
      });
      if (updateError) throw new Error(updateError.message);
      setSuccess("Profil berhasil disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    setError(null);
    setReviewSuccess(null);
    setSuccess(null);
    setIsSubmittingReview(true);
    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) throw new Error(getSupabaseBrowserConfigError());
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Unauthorized");

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: reviewDisplayName,
          role: reviewRole,
          rating: reviewRating,
          message: reviewMessage,
          isPublic: reviewPublic,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error || "Gagal mengirim ulasan");

      setReviewMessage("");
      setReviewRole("");
      setReviewRating(5);
      setReviewPublic(true);
      setReviewSuccess("Ulasan berhasil dikirim. Terima kasih!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim ulasan");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const initials = useMemo(() => {
    const base = (meta.name || email || "User").trim();
    const parts = base.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "U";
    const second = parts.length > 1 ? parts[1]?.[0] : "";
    return (first + second).toUpperCase();
  }, [email, meta.name]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-2xl font-bold">Profil</div>
        <div className="text-sm text-muted-foreground">Atur nama dan preferensi.</div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      {success && (
        <Card className="border-primary/30">
          <CardContent className="py-4 text-sm text-primary">{success}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              Info Akun
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-semibold">
              {initials}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Bergabung Sejak</Label>
              <Input value={joinedAt} readOnly />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nama</Label>
            <Input
              value={meta.name ?? ""}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
              placeholder="Nama Anda"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Preferensi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Dietary Preferences</div>
            <div className="flex flex-wrap gap-3">
              {DIETARY.map((d) => (
                <label key={d} className="inline-flex items-center gap-2 text-sm capitalize">
                  <input
                    type="checkbox"
                    checked={dietarySet.has(d)}
                    onChange={() => toggleDietary(d)}
                    className="h-4 w-4"
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(meta.notifications)}
                onChange={(e) => setMeta({ ...meta, notifications: e.target.checked })}
                className="h-4 w-4"
              />
              Notifikasi in-app
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(meta.emailAlerts)}
                onChange={(e) => setMeta({ ...meta, emailAlerts: e.target.checked })}
                className="h-4 w-4"
              />
              Email alerts
            </label>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5 text-primary" />
            Buat Ulasan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviewSuccess && (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {reviewSuccess}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama yang tampil</Label>
              <Input
                value={reviewDisplayName}
                onChange={(e) => setReviewDisplayName(e.target.value)}
                placeholder="Contoh: Ayu"
              />
            </div>
            <div className="space-y-2">
              <Label>Peran (opsional)</Label>
              <Input
                value={reviewRole}
                onChange={(e) => setReviewRole(e.target.value)}
                placeholder="Contoh: Ibu Rumah Tangga"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, idx) => {
                const v = idx + 1;
                const active = v <= reviewRating;
                return (
                  <button
                    key={v}
                    type="button"
                    className={`h-10 w-10 inline-flex items-center justify-center rounded-md border ${
                      active ? "bg-amber-500/10 border-amber-500/30" : "bg-background"
                    }`}
                    onClick={() => setReviewRating(v)}
                    aria-label={`Rating ${v}`}
                  >
                    <Star className={`h-5 w-5 ${active ? "text-amber-500 fill-current" : "text-muted-foreground"}`} />
                  </button>
                );
              })}
              <div className="text-sm text-muted-foreground">{reviewRating}/5</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ulasan</Label>
            <textarea
              value={reviewMessage}
              onChange={(e) => setReviewMessage(e.target.value)}
              placeholder="Ceritakan pengalaman kamu memakai Kulkas Berisi..."
              className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewPublic}
                  onChange={(e) => setReviewPublic(e.target.checked)}
                  className="h-4 w-4"
                />
                Tampilkan di landing page
              </label>
              <div className="text-xs text-muted-foreground">{reviewMessage.trim().length}/400</div>
            </div>
          </div>

          <Button
            onClick={handleSubmitReview}
            disabled={isSubmittingReview || !reviewMessage.trim()}
            className="w-full md:w-auto"
          >
            {isSubmittingReview ? "Mengirim..." : "Kirim Ulasan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
