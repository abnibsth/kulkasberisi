import { NextResponse } from "next/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { enforceAdminRateLimit, requireAdmin, writeAdminAuditLog } from "@/lib/admin/server";

type ReviewRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string | null;
  rating: number;
  message: string;
  is_public: boolean;
  created_at: string;
  is_hidden?: boolean | null;
};

function rowToReview(row: ReviewRow) {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name ?? "User",
    role: row.role ?? undefined,
    rating: row.rating,
    message: row.message,
    isPublic: row.is_public,
    isHidden: row.is_hidden ?? false,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  try {
    enforceAdminRateLimit(request);
    await requireAdmin(request);

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const isPublic = url.searchParams.get("public");
    const rating = url.searchParams.get("rating");
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50));

    const supabase = getSupabaseServerAdminClient();
    const select = "id,user_id,display_name,role,rating,message,is_public,created_at,is_hidden";
    let query = supabase.from("reviews").select(select).order("created_at", { ascending: false }).limit(limit);
    if (isPublic === "true") query = query.eq("is_public", true);
    if (isPublic === "false") query = query.eq("is_public", false);
    if (rating) {
      const r = Number(rating);
      if (Number.isFinite(r)) query = query.eq("rating", r);
    }

    const { data, error } = await query;
    if (error) {
      const msg = error.message || "";
      if (msg.toLowerCase().includes("column") && msg.toLowerCase().includes("is_hidden")) {
        const { data: data2, error: error2 } = await supabase
          .from("reviews")
          .select("id,user_id,display_name,role,rating,message,is_public,created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
        const items = (data2 ?? []).map((r) => rowToReview({ ...(r as ReviewRow), is_hidden: false }));
        const filtered = q
          ? items.filter(
              (x) =>
                x.message.toLowerCase().includes(q) ||
                x.displayName.toLowerCase().includes(q) ||
                (x.role ?? "").toLowerCase().includes(q),
            )
          : items;
        return NextResponse.json({ items: filtered, warning: "Kolom is_hidden belum ada." });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let items = (data ?? []).map((r) => rowToReview(r as ReviewRow));
    if (q) {
      items = items.filter(
        (x) =>
          x.message.toLowerCase().includes(q) ||
          x.displayName.toLowerCase().includes(q) ||
          (x.role ?? "").toLowerCase().includes(q),
      );
    }
    return NextResponse.json({ items });
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
      | { id?: string; isPublic?: boolean; isHidden?: boolean }
      | null;
    const id = body?.id ?? "";
    if (!id) return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });

    const updatePayload: Record<string, unknown> = {};
    if (typeof body?.isPublic === "boolean") updatePayload.is_public = body.isPublic;
    if (typeof body?.isHidden === "boolean") updatePayload.is_hidden = body.isHidden;
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const supabase = getSupabaseServerAdminClient();
    const { error } = await supabase.from("reviews").update(updatePayload).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: "REVIEW_UPDATED",
      targetType: "REVIEW",
      targetId: id,
      details: updatePayload,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const body = (await request.json().catch(() => null)) as { id?: string; reason?: string } | null;
    const id = body?.id ?? "";
    const reason = (body?.reason ?? "").trim();
    if (!id) return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });

    const supabase = getSupabaseServerAdminClient();
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: "REVIEW_DELETED",
      targetType: "REVIEW",
      targetId: id,
      details: reason ? { reason } : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

