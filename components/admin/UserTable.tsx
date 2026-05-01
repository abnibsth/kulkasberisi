"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  role: "USER" | "ADMIN" | string;
  banned: boolean;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID");
}

export function UserTable(props: {
  items: AdminUserRow[];
  updatingIds?: string[];
  onChangeRole: (userId: string, role: "USER" | "ADMIN") => void;
  onToggleBan: (userId: string, banned: boolean) => void;
  onResetPassword: (userId: string) => void;
  onImpersonate: (userId: string) => void;
}) {
  const updating = new Set(props.updatingIds ?? []);

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 px-3 text-left font-medium">User</th>
            <th className="py-2 px-3 text-left font-medium">Role</th>
            <th className="py-2 px-3 text-left font-medium">Status</th>
            <th className="py-2 px-3 text-left font-medium">Join</th>
            <th className="py-2 px-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.items.length === 0 ? (
            <tr>
              <td className="py-3 px-3 text-muted-foreground" colSpan={5}>
                Tidak ada user.
              </td>
            </tr>
          ) : (
            props.items.map((u) => {
              const busy = updating.has(u.id);
              return (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="py-2 px-3">
                    <div className="font-medium">{u.name ?? u.email ?? u.id}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{u.id}</div>
                  </td>
                  <td className="py-2 px-3">
                    <Select
                      value={u.role === "ADMIN" ? "ADMIN" : "USER"}
                      onValueChange={(v) => props.onChangeRole(u.id, v as "USER" | "ADMIN")}
                      disabled={busy}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">USER</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        u.banned ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {u.banned ? "banned" : "active"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{formatWhen(u.createdAt)}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/${u.id}`}>Detail</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => props.onToggleBan(u.id, !u.banned)}
                        disabled={busy}
                      >
                        {u.banned ? "Unban" : "Ban"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => props.onResetPassword(u.id)} disabled={busy}>
                        Reset PW
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => props.onImpersonate(u.id)} disabled={busy}>
                        Impersonate
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

