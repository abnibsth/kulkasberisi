"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserTable, type AdminUserRow } from "@/components/admin/UserTable";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";

async function getAccessToken() {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"ALL" | "USER" | "ADMIN">("ALL");
  const [status, setStatus] = useState<"ALL" | "active" | "banned">("ALL");
  const [sort, setSort] = useState<"join_desc" | "join_asc">("join_desc");

  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const filteredSorted = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sort === "join_asc" ? ta - tb : tb - ta;
    });
    return list;
  }, [items, sort]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (role !== "ALL") sp.set("role", role);
      if (status === "active") sp.set("banned", "false");
      if (status === "banned") sp.set("banned", "true");
      sp.set("perPage", "200");

      const res = await fetch(`/api/admin/users?${sp.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { items?: AdminUserRow[]; error?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal load (${res.status})`);
      setItems(json?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [q, role, status]);

  async function withBusy(userId: string, fn: () => Promise<void>) {
    setUpdatingIds((prev) => [...prev, userId]);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aksi gagal");
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== userId));
    }
  }

  async function changeRole(userId: string, nextRole: "USER" | "ADMIN") {
    await withBusy(userId, async () => {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ userId, role: nextRole }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal update role (${res.status})`);
    });
  }

  async function toggleBan(userId: string, banned: boolean) {
    await withBusy(userId, async () => {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ banned }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal update ban (${res.status})`);
    });
  }

  async function resetPassword(userId: string) {
    await withBusy(userId, async () => {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ action: "RESET_PASSWORD" }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal reset password (${res.status})`);
      setError(json?.message || "Reset password link dibuat. Cek email user atau gunakan link recovery.");
    });
  }

  async function impersonate(userId: string) {
    await withBusy(userId, async () => {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : null),
        } as HeadersInit,
        body: JSON.stringify({ action: "IMPERSONATE" }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; actionLink?: string } | null;
      if (!res.ok) throw new Error(json?.error || `Gagal impersonate (${res.status})`);
      if (json?.actionLink) {
        window.open(json.actionLink, "_blank", "noopener,noreferrer");
      } else {
        setError("Impersonate link tidak tersedia.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="text-sm text-muted-foreground">Manajemen user, role, dan status ban.</div>
      </div>

      <div className="grid md:grid-cols-4 gap-2">
        <Input placeholder="Search nama/email..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
          <SelectTrigger>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            <SelectItem value="USER">USER</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="active">active</SelectItem>
            <SelectItem value="banned">banned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="join_desc">Join date ↓</SelectItem>
            <SelectItem value="join_asc">Join date ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? <div className="p-3 rounded-md border bg-destructive/10 text-destructive text-sm">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat...</div>
      ) : (
        <UserTable
          items={filteredSorted}
          updatingIds={updatingIds}
          onChangeRole={changeRole}
          onToggleBan={toggleBan}
          onResetPassword={resetPassword}
          onImpersonate={impersonate}
        />
      )}
    </div>
  );
}

