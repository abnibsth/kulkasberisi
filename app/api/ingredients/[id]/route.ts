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
      .select("*")
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
      storageLocation?: "fridge" | "pantry";
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
    if (body.storageLocation === "fridge" || body.storageLocation === "pantry")
      updatePayload.storage_location = body.storageLocation;
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

    const nextExpiryDate =
      typeof body.expiryDate === "string" ? body.expiryDate || null : undefined;
    const contextChanged =
      body.storageLocation !== undefined ||
      body.category !== undefined ||
      body.purchaseDate !== undefined;
    let shouldRecalcEstimate = nextExpiryDate === null;

    const supabase = getSupabaseServerAdminClient();
    const payloadToUpdate: Record<string, unknown> = { ...updatePayload };
    if (
      !shouldRecalcEstimate &&
      nextExpiryDate === undefined &&
      contextChanged
    ) {
      const { data: current, error: getError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();
      if (getError) {
        return NextResponse.json({ error: getError.message }, { status: 500 });
      }
      const currentExpiry =
        (current as any).expiry_date ?? (current as any).expiryDate ?? null;
      if (!currentExpiry) {
        shouldRecalcEstimate = true;
        if (payloadToUpdate.purchase_date === undefined) {
          payloadToUpdate.purchase_date =
            (current as any).purchase_date ??
            (current as any).purchaseDate ??
            null;
        }
        if (payloadToUpdate.category === undefined) {
          payloadToUpdate.category =
            (current as any).category ?? (current as any).category ?? "";
        }
        if (payloadToUpdate.storage_location === undefined) {
          payloadToUpdate.storage_location =
            (current as any).storage_location ??
            (current as any).storageLocation ??
            "fridge";
        }
      }
    }

    if (shouldRecalcEstimate) {
      const storageLocation =
        (payloadToUpdate.storage_location as "fridge" | "pantry" | undefined) ??
        "fridge";
      const category = (payloadToUpdate.category as string | undefined) ?? "";
      const purchaseDate =
        (payloadToUpdate.purchase_date as string | null | undefined) ?? null;
      const estimated = toISODate(
        addDays(
          purchaseDate ? new Date(purchaseDate) : new Date(),
          estimateDays(category, storageLocation),
        ),
      );
      payloadToUpdate.estimated_expiry_date = estimated;
    }

    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from("ingredients")
        .update(payloadToUpdate)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (!error) {
        const item = rowToIngredient(data as IngredientRow) as any;
        if (!item.storageLocation && payloadToUpdate.storage_location) {
          item.storageLocation = payloadToUpdate.storage_location;
        }
        if (
          !item.estimatedExpiryDate &&
          !item.expiryDate &&
          payloadToUpdate.estimated_expiry_date
        ) {
          item.estimatedExpiryDate = payloadToUpdate.estimated_expiry_date;
        }
        return NextResponse.json({
          item,
        });
      }

      const missing = extractMissingColumn(error.message);
      if (missing && missing in payloadToUpdate) {
        delete payloadToUpdate[missing];
        continue;
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Gagal mengupdate bahan" },
      { status: 500 },
    );
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
