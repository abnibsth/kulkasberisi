import { NextResponse } from "next/server";
import {
  getSupabaseServerAdminClient,
  getSupabaseUserIdFromRequest,
} from "@/lib/supabase/server";

type IngredientRow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchase_date: string | null;
  expiry_date: string | null;
  barcode: string | null;
  notes: string | null;
  used_at: string | null;
  created_at: string;
};

function rowToIngredient(row: IngredientRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    purchaseDate: row.purchase_date ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    barcode: row.barcode ?? undefined,
    notes: row.notes ?? undefined,
    usedAt: row.used_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  try {
    const userId = await getSupabaseUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeUsed = url.searchParams.get("includeUsed") === "1";

    const supabase = getSupabaseServerAdminClient();
    let query = supabase
      .from("ingredients")
      .select(
        "id,user_id,name,category,quantity,unit,purchase_date,expiry_date,barcode,notes,used_at,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!includeUsed) {
      query = query.is("used_at", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data ?? []).map((row) =>
      rowToIngredient(row as IngredientRow),
    );
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
      id?: string;
      name?: string;
      category?: string;
      quantity?: number;
      unit?: string;
      purchaseDate?: string;
      expiryDate?: string;
      barcode?: string;
      notes?: string;
    } | null;

    if (
      !body?.name ||
      !body?.category ||
      typeof body.quantity !== "number" ||
      !body.unit
    ) {
      return NextResponse.json(
        { error: "Payload tidak valid" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerAdminClient();
    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      name: body.name,
      category: body.category,
      quantity: body.quantity,
      unit: body.unit,
      purchase_date: body.purchaseDate ? body.purchaseDate : null,
      expiry_date: body.expiryDate ? body.expiryDate : null,
      barcode: body.barcode ?? null,
      notes: body.notes ?? null,
    };
    if (body.id) insertPayload.id = body.id;

    const { data, error } = await supabase
      .from("ingredients")
      .insert(insertPayload)
      .select(
        "id,user_id,name,category,quantity,unit,purchase_date,expiry_date,barcode,notes,used_at,created_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: rowToIngredient(data as IngredientRow) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
