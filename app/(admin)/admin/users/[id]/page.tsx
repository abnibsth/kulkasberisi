"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditLogTable, type AuditLogItem } from "@/components/admin/AuditLogTable";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";

type UserDetailPayload = {
  item: {
    id: string;
    email: string | null;
    createdAt: string;
    name: string | null;
    role: string;
    banned: boolean;
    stats: { ingredients: number; recipes: number; reviews: number };
    loginCount?: number | null;
  };
  recentRecipes?: Array<{ id: string; name: string; created_at: string; status?: string | null; source?: string | null }>;
  auditLogs?: AuditLogItem[];
  warning?: string;
};

async function getAccessToken() {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [data, setData] = useState<UserDetailPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/users/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as UserDetailPayload | { error?: string } | null;
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error || `Gagal load (${res.status})`);
      setData(json as UserDetailPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void load();
  }, [id]);

  if (loading) return <div className="text-sm text-muted-foreground">Memuat...</div>;
  if (error) return <div className="p-3 rounded-md border bg-destructive/10 text-destructive text-sm">{error}</div>;
  if (!data) return null;

  const u = data.item;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">User Detail</h1>
          <div className="text-sm text-muted-foreground">{u.email ?? u.id}</div>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users">Kembali</Link>
        </Button>
      </div>

      {data.warning ? (
        <div className="p-3 rounded-md border bg-amber-50 text-amber-800 text-sm">{data.warning}</div>
      ) : null}

      <div className="grid lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Info Akun</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Nama:</span> {u.name ?? "-"}
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span> {u.email ?? "-"}
            </div>
            <div>
              <span className="text-muted-foreground">Role:</span> {u.role}
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span> {u.banned ? "banned" : "active"}
            </div>
            <div>
              <span className="text-muted-foreground">Join:</span> {new Date(u.createdAt).toLocaleString("id-ID")}
            </div>
            {typeof u.loginCount === "number" ? (
              <div>
                <span className="text-muted-foreground">Login count:</span> {u.loginCount}
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Statistik</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Total bahan:</span> {u.stats.ingredients}
            </div>
            <div>
              <span className="text-muted-foreground">Total resep:</span> {u.stats.recipes}
            </div>
            <div>
              <span className="text-muted-foreground">Total reviews:</span> {u.stats.reviews}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat Resep</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Nama</th>
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-left font-medium">Source</th>
                <th className="py-2 text-left font-medium">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentRecipes ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-muted-foreground">
                    Belum ada resep.
                  </td>
                </tr>
              ) : (
                (data.recentRecipes ?? []).map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-muted-foreground">{(r.status ?? "unknown") as string}</td>
                    <td className="py-2 text-muted-foreground">{(r.source ?? "unknown") as string}</td>
                    <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AuditLogTable title="Audit Log (aksi admin ke user ini)" items={data.auditLogs ?? []} />
    </div>
  );
}

