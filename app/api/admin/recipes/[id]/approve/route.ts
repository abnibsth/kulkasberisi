import { NextResponse } from "next/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { enforceAdminRateLimit, requireAdmin, writeAdminAuditLog } from "@/lib/admin/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const body = (await request.json().catch(() => null)) as
      | { decision?: "approve" | "reject"; reason?: string }
      | null;
    const decision = body?.decision;
    const reason = (body?.reason ?? "").trim();
    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }
    if (decision === "reject" && !reason) {
      return NextResponse.json({ error: "Alasan reject wajib diisi" }, { status: 400 });
    }

    const supabase = getSupabaseServerAdminClient();
    const updatePayload: Record<string, unknown> =
      decision === "approve"
        ? { status: "approved", is_approved: true, rejected_reason: null }
        : { status: "rejected", is_approved: false, rejected_reason: reason.slice(0, 200) };

    const { data, error } = await supabase
      .from("recipes")
      .update(updatePayload)
      .eq("id", params.id)
      .select("id,status,is_approved,rejected_reason")
      .single();

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
      action: decision === "approve" ? "RECIPE_APPROVED" : "RECIPE_REJECTED",
      targetType: "RECIPE",
      targetId: params.id,
      details: decision === "reject" ? { reason } : undefined,
    });

    return NextResponse.json({ item: data });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}

