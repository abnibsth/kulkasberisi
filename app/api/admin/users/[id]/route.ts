import { NextResponse } from "next/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { enforceAdminRateLimit, requireAdmin, writeAdminAuditLog } from "@/lib/admin/server";

async function getUserStats(userId: string) {
  const supabase = getSupabaseServerAdminClient();

  const [ingredientsRes, recipesRes, reviewsRes] = await Promise.all([
    supabase.from("ingredients").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return {
    ingredients: ingredientsRes.count ?? 0,
    recipes: recipesRes.count ?? 0,
    reviews: reviewsRes.count ?? 0,
  };
}

async function getUserAuditLogs(userId: string) {
  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,admin_id,action,target_type,target_id,details,created_at")
    .eq("target_type", "USER")
    .eq("target_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("relation") || msg.includes("does not exist") || msg.includes("audit_logs")) {
      return { items: [], warning: "" }; // Silent, jangan tampilkan warning untuk audit_logs
    }
    return { items: [], warning: error.message };
  }

  return {
    items: (data ?? []).map((x) => ({
      id: x.id as string,
      adminId: x.admin_id as string,
      action: x.action as string,
      targetType: x.target_type as string,
      targetId: (x.target_id as string | null) ?? null,
      details: (x.details as unknown) ?? null,
      createdAt: x.created_at as string,
    })),
    warning: "",
  };
}

async function getRecentRecipes(userId: string) {
  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id,name,created_at,source")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return { items: [], warning: error.message };
  return { items: data ?? [], warning: "" };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    enforceAdminRateLimit(request);
    await requireAdmin(request);

    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(params.id);
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "User tidak ditemukan" }, { status: 404 });
    }

    const meta = (data.user.user_metadata as { role?: string; banned?: boolean; name?: string } | null) ?? null;
    const stats = await getUserStats(data.user.id);
    const [audit, recipes] = await Promise.all([getUserAuditLogs(data.user.id), getRecentRecipes(data.user.id)]);

    return NextResponse.json({
      item: {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.created_at,
        name: meta?.name ?? null,
        role: meta?.role ?? "USER",
        banned: Boolean(meta?.banned),
        stats,
      },
      recentRecipes: recipes.items,
      auditLogs: audit.items,
      warning: recipes.warning || undefined,
    });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const body = (await request.json().catch(() => null)) as
      | { action?: "RESET_PASSWORD" | "IMPERSONATE"; redirectTo?: string }
      | null;
    const action = body?.action ?? null;
    if (action !== "RESET_PASSWORD" && action !== "IMPERSONATE") {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    const supabase = getSupabaseServerAdminClient();
    const { data: userData, error: getError } = await supabase.auth.admin.getUserById(params.id);
    if (getError || !userData.user) {
      return NextResponse.json({ error: getError?.message || "User tidak ditemukan" }, { status: 404 });
    }

    const email = userData.user.email ?? "";
    if (!email) return NextResponse.json({ error: "User tidak punya email" }, { status: 400 });

    const redirectTo = (body?.redirectTo ?? "").trim() || undefined;
    const type = action === "RESET_PASSWORD" ? "recovery" : "magiclink";
    const { data, error } = await supabase.auth.admin.generateLink({
      type,
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Gagal generate link" }, { status: 500 });
    }

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: action === "RESET_PASSWORD" ? "USER_PASSWORD_RESET_LINK_CREATED" : "USER_IMPERSONATE_LINK_CREATED",
      targetType: "USER",
      targetId: params.id,
      details: { type },
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      actionLink: (data as unknown as { action_link?: string | null }).action_link ?? null,
      message:
        action === "RESET_PASSWORD"
          ? "Recovery link dibuat. Link ini biasanya juga dapat dipakai untuk kirim reset via email."
          : "Magic link dibuat. Buka link untuk login sebagai user (debugging).",
    });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const supabase = getSupabaseServerAdminClient();
    const { data: userData, error: getError } = await supabase.auth.admin.getUserById(params.id);
    if (getError || !userData.user) {
      return NextResponse.json({ error: getError?.message || "User tidak ditemukan" }, { status: 404 });
    }

    const prevMeta = (userData.user.user_metadata as Record<string, unknown> | null) ?? {};
    const { error } = await supabase.auth.admin.updateUserById(params.id, {
      user_metadata: { ...prevMeta, banned: true },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: "USER_BANNED",
      targetType: "USER",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const body = (await request.json().catch(() => null)) as { banned?: boolean } | null;
    if (typeof body?.banned !== "boolean") {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    const supabase = getSupabaseServerAdminClient();
    const { data: userData, error: getError } = await supabase.auth.admin.getUserById(params.id);
    if (getError || !userData.user) {
      return NextResponse.json({ error: getError?.message || "User tidak ditemukan" }, { status: 404 });
    }

    const prevMeta = (userData.user.user_metadata as Record<string, unknown> | null) ?? {};
    const { error } = await supabase.auth.admin.updateUserById(params.id, {
      user_metadata: { ...prevMeta, banned: body.banned },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: body.banned ? "USER_BANNED" : "USER_UNBANNED",
      targetType: "USER",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}
