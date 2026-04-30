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

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getSupabaseUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase
      .from("ingredients")
      .select(
        "id,user_id,name,category,quantity,unit,purchase_date,expiry_date,barcode,notes,used_at,created_at",
      )
      .eq("id", id)
      .eq("user_id", userId)
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getSupabaseUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      category?: string;
      quantity?: number;
      unit?: string;
      purchaseDate?: string;
      expiryDate?: string;
      barcode?: string;
      notes?: string;
      usedAt?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { error: "Payload tidak valid" },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof body.name === "string") updatePayload.name = body.name;
    if (typeof body.category === "string")
      updatePayload.category = body.category;
    if (typeof body.quantity === "number")
      updatePayload.quantity = body.quantity;
    if (typeof body.unit === "string") updatePayload.unit = body.unit;
    if (typeof body.purchaseDate === "string")
      updatePayload.purchase_date = body.purchaseDate || null;
    if (typeof body.expiryDate === "string")
      updatePayload.expiry_date = body.expiryDate || null;
    if (typeof body.barcode === "string")
      updatePayload.barcode = body.barcode || null;
    if (typeof body.notes === "string")
      updatePayload.notes = body.notes || null;
    if (typeof body.usedAt === "string")
      updatePayload.used_at = body.usedAt || null;

    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase
      .from("ingredients")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", userId)
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const userId = await getSupabaseUserIdFromRequest(_request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = getSupabaseServerAdminClient();
    const { error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
