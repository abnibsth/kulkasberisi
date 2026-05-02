import { NextResponse } from "next/server";
import {
  getSupabaseServerAdminClient,
  getSupabaseUserIdFromRequest,
} from "@/lib/supabase/server";

type IngredientRow = Record<string, unknown>;

function extractMissingColumn(message: string) {
  const m1 = message.match(/Could not find the '([^']+)' column/i);
  if (m1?.[1]) return m1[1];
  const m2 = message.match(/column \"([^\"]+)\"/i);
  if (m2?.[1]) return m2[1];
  return null;
}

function toISODate(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function normalizeCategory(value: string) {
  return value.trim().toLowerCase();
}

function estimateDays(category: string, storageLocation: "fridge" | "pantry") {
  const c = normalizeCategory(category || "lainnya");
  const fridge: Record<string, number> = {
    sayur: 5,
    buah: 7,
    protein: 2,
    dairy: 5,
    bumbu: 14,
    karbohidrat: 7,
    minuman: 14,
    lainnya: 5,
  };
  const pantry: Record<string, number> = {
    sayur: 2,
    buah: 3,
    protein: 1,
    dairy: 2,
    bumbu: 7,
    karbohidrat: 14,
    minuman: 30,
    lainnya: 3,
  };
  const table = storageLocation === "fridge" ? fridge : pantry;
  return table[c] ?? table.lainnya;
}

function rowToIngredient(row: IngredientRow) {
  const purchaseDate =
    (row.purchase_date as string | null | undefined) ??
    (row.purchaseDate as string | undefined) ??
    null;
  const expiryDate =
    (row.expiry_date as string | null | undefined) ??
    (row.expiryDate as string | undefined) ??
    null;
  const estimatedExpiryDate =
    (row.estimated_expiry_date as string | null | undefined) ??
    (row.estimatedExpiryDate as string | undefined) ??
    null;
  const storageLocation =
    (row.storage_location as string | null | undefined) ??
    (row.storageLocation as string | undefined) ??
    null;
  return {
    id: row.id as string | undefined,
    name: row.name as string,
    category: row.category as string,
    quantity: row.quantity as number,
    unit: row.unit as string,
    storageLocation:
      storageLocation === "fridge" || storageLocation === "pantry"
        ? storageLocation
        : undefined,
    purchaseDate: purchaseDate ?? undefined,
    expiryDate: expiryDate ?? undefined,
    estimatedExpiryDate: estimatedExpiryDate ?? undefined,
    barcode: (row.barcode as string | null | undefined) ?? undefined,
    notes: (row.notes as string | null | undefined) ?? undefined,
    usedAt: (row.used_at as string | null | undefined) ?? undefined,
    createdAt: (row.created_at as string | undefined) ?? undefined,
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
      .select("*")
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
      storageLocation?: "fridge" | "pantry";
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
    const storageLocation =
      body.storageLocation === "pantry" ? "pantry" : "fridge";
    const purchaseDate = body.purchaseDate ? body.purchaseDate : null;
    const expiryDate = body.expiryDate ? body.expiryDate : null;
    const estimatedExpiryDate = !expiryDate
      ? toISODate(
          addDays(
            purchaseDate ? new Date(purchaseDate) : new Date(),
            estimateDays(body.category, storageLocation),
          ),
        )
      : null;
    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      name: body.name,
      category: body.category,
      quantity: body.quantity,
      unit: body.unit,
      storage_location: storageLocation,
      purchase_date: purchaseDate,
      expiry_date: expiryDate,
      estimated_expiry_date: estimatedExpiryDate,
      barcode: body.barcode ?? null,
      notes: body.notes ?? null,
    };
    if (body.id) insertPayload.id = body.id;

    const payloadToInsert: Record<string, unknown> = { ...insertPayload };
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from("ingredients")
        .insert(payloadToInsert)
        .select("*")
        .single();

      if (!error) {
        const item = rowToIngredient(data as IngredientRow) as any;
        if (!item.storageLocation) item.storageLocation = storageLocation;
        if (
          !item.estimatedExpiryDate &&
          !item.expiryDate &&
          estimatedExpiryDate
        ) {
          item.estimatedExpiryDate = estimatedExpiryDate;
        }
        return NextResponse.json({ item });
      }

      const missing = extractMissingColumn(error.message);
      if (missing && missing in payloadToInsert) {
        delete payloadToInsert[missing];
        continue;
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Gagal menyimpan bahan" },
      { status: 500 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
