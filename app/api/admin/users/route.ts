import { NextResponse } from "next/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { enforceAdminRateLimit, requireAdmin, writeAdminAuditLog } from "@/lib/admin/server";

export async function GET(request: Request) {
  try {
    enforceAdminRateLimit(request);
    await requireAdmin(request);

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const perPage = Math.min(200, Math.max(1, Number(url.searchParams.get("perPage") ?? "50") || 50));
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const role = (url.searchParams.get("role") ?? "").trim().toUpperCase();
    const banned = (url.searchParams.get("banned") ?? "").trim();

    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let users = (data.users ?? []).map((u) => {
      const meta = (u.user_metadata as { role?: string; banned?: boolean; name?: string } | null) ?? null;
      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        name: meta?.name ?? null,
        role: meta?.role ?? "USER",
        banned: Boolean(meta?.banned),
      };
    });

    if (q) {
      users = users.filter((u) => (u.email ?? "").toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q));
    }
    if (role === "ADMIN" || role === "USER") {
      users = users.filter((u) => u.role === role);
    }
    if (banned === "true") users = users.filter((u) => u.banned);
    if (banned === "false") users = users.filter((u) => !u.banned);

    return NextResponse.json({ items: users, page, perPage });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const body = (await request.json().catch(() => null)) as
      | { userId?: string; role?: "USER" | "ADMIN" }
      | null;
    const userId = body?.userId ?? "";
    const nextRole = body?.role ?? null;
    if (!userId || (nextRole !== "USER" && nextRole !== "ADMIN")) {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    const supabase = getSupabaseServerAdminClient();
    const { data: userData, error: getError } = await supabase.auth.admin.getUserById(userId);
    if (getError || !userData.user) {
      return NextResponse.json({ error: getError?.message || "User tidak ditemukan" }, { status: 404 });
    }

    const prevMeta = (userData.user.user_metadata as Record<string, unknown> | null) ?? {};
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...prevMeta, role: nextRole },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: "USER_ROLE_UPDATED",
      targetType: "USER",
      targetId: userId,
      details: { role: nextRole },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

