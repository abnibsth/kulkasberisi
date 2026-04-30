"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
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
    setIsSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: meta.name || undefined,
          dietary: meta.dietary ?? [],
          notifications: Boolean(meta.notifications),
          emailAlerts: Boolean(meta.emailAlerts),
        },
      });
      if (updateError) throw new Error(updateError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil");
    } finally {
      setIsSaving(false);
    }
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Info Akun</CardTitle>
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
          <CardTitle>Preferensi</CardTitle>
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
    </div>
  );
}
