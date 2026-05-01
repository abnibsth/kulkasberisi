import { NextResponse } from "next/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { enforceAdminRateLimit, requireAdmin, writeAdminAuditLog } from "@/lib/admin/server";

type RecipeRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: string;
  calories: number | null;
  instructions: string[];
  image_url: string | null;
  source: string | null;
  match_percentage: number | null;
  ingredients: unknown;
  created_at: string;
  status?: string | null;
  is_approved?: boolean | null;
  rejected_reason?: string | null;
};

function rowToRecipe(row: RecipeRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    servings: row.servings,
    difficulty: row.difficulty,
    calories: row.calories ?? undefined,
    instructions: row.instructions ?? [],
    imageUrl: row.image_url ?? undefined,
    source: row.source ?? undefined,
    matchPercentage: row.match_percentage ?? undefined,
    ingredients: row.ingredients ?? undefined,
    createdAt: row.created_at,
    status: row.status ?? "pending",
    isApproved: row.is_approved ?? false,
    rejectedReason: row.rejected_reason ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "pending").trim().toLowerCase();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50));

    const supabase = getSupabaseServerAdminClient();
    const select =
      "id,user_id,name,description,prep_time,cook_time,servings,difficulty,calories,instructions,image_url,source,match_percentage,ingredients,created_at,status,is_approved,rejected_reason";
    const query = supabase.from("recipes").select(select).order("created_at", { ascending: false }).limit(limit);

    const { data, error } =
      status === "approved"
        ? await query.eq("status", "approved")
        : status === "rejected"
          ? await query.eq("status", "rejected")
          : await query.eq("status", "pending");

    if (error) {
      const message = error.message || "";
      if (message.toLowerCase().includes("column") && message.toLowerCase().includes("status")) {
        return NextResponse.json({
          items: [],
          warning: "Kolom moderasi resep belum ada. Jalankan SQL admin setup terlebih dahulu.",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: "RECIPES_LIST_VIEWED",
      targetType: "RECIPE",
      details: { status, limit },
    }).catch(() => undefined);

    return NextResponse.json({ items: (data ?? []).map((r) => rowToRecipe(r as RecipeRow)) });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const body = (await request.json().catch(() => null)) as
      | { action?: "APPROVE_ALL_PENDING" | "APPROVE_SELECTED"; ids?: string[] }
      | null;
    const action = body?.action ?? null;
    const ids = Array.isArray(body?.ids) ? body?.ids.filter((x) => typeof x === "string" && x) : [];
    if (action !== "APPROVE_ALL_PENDING" && action !== "APPROVE_SELECTED") {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }
    if (action === "APPROVE_SELECTED" && ids.length === 0) {
      return NextResponse.json({ error: "ids wajib diisi" }, { status: 400 });
    }

    const supabase = getSupabaseServerAdminClient();
    const updatePayload = { status: "approved", is_approved: true, rejected_reason: null };

    const q =
      action === "APPROVE_ALL_PENDING"
        ? supabase.from("recipes").update(updatePayload).eq("status", "pending")
        : supabase.from("recipes").update(updatePayload).in("id", ids).eq("status", "pending");

    const { error } = await q;
    if (error) {
      const message = error.message || "";
      if (message.toLowerCase().includes("column") && message.toLowerCase().includes("status")) {
        return NextResponse.json(
          { error: "Kolom moderasi resep belum ada. Jalankan SQL admin setup terlebih dahulu." },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: action === "APPROVE_ALL_PENDING" ? "RECIPES_BULK_APPROVED" : "RECIPES_SELECTED_APPROVED",
      targetType: "RECIPE",
      details: action === "APPROVE_SELECTED" ? { ids: ids.slice(0, 200) } : undefined,
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}
