import { NextResponse } from "next/server";
import { getSupabaseServerAdminClient, getSupabaseUserIdFromRequest } from "@/lib/supabase/server";

type ReviewRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string | null;
  rating: number;
  message: string;
  is_public: boolean;
  created_at: string;
};

function rowToPublicReview(row: ReviewRow) {
  return {
    id: row.id,
    displayName: row.display_name ?? "User",
    role: row.role ?? undefined,
    rating: row.rating,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.min(12, Math.max(1, Number(limitRaw ?? "6") || 6));

    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("id,user_id,display_name,role,rating,message,is_public,created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data ?? []).map((r) => rowToPublicReview(r as ReviewRow));
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSupabaseUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      displayName?: string;
      role?: string;
      rating?: number;
      message?: string;
      isPublic?: boolean;
    } | null;

    const displayName = body?.displayName?.trim() ?? "";
    const role = body?.role?.trim() ?? "";
    const rating = typeof body?.rating === "number" ? body.rating : NaN;
    const message = body?.message?.trim() ?? "";
    const isPublic = typeof body?.isPublic === "boolean" ? body.isPublic : true;

    if (!message) {
      return NextResponse.json({ error: "Ulasan wajib diisi" }, { status: 400 });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating harus 1 sampai 5" }, { status: 400 });
    }

    const safeDisplayName = displayName ? displayName.slice(0, 40) : null;
    const safeRole = role ? role.slice(0, 40) : null;
    const safeMessage = message.slice(0, 400);

    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: userId,
        display_name: safeDisplayName,
        role: safeRole,
        rating,
        message: safeMessage,
        is_public: isPublic,
      })
      .select("id,user_id,display_name,role,rating,message,is_public,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: rowToPublicReview(data as ReviewRow) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

