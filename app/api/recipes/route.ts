import { NextResponse } from "next/server";
import {
  getSupabaseServerAdminClient,
  getSupabaseUserIdFromRequest,
} from "@/lib/supabase/server";

type RecipeRow = Record<string, unknown>;

function extractMissingColumn(message: string) {
  const m1 = message.match(/Could not find the '([^']+)' column/i);
  if (m1?.[1]) return m1[1];
  const m2 = message.match(/column \"([^\"]+)\"/i);
  if (m2?.[1]) return m2[1];
  return null;
}

function normalizeInstructions(value: unknown): string[] {
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === "string")) return value as string[];
    return value
      .map((x) => {
        if (typeof x === "string") return x;
        if (
          x &&
          typeof x === "object" &&
          "text" in x &&
          typeof (x as any).text === "string"
        )
          return (x as any).text;
        return null;
      })
      .filter((x): x is string => Boolean(x));
  }
  if (typeof value === "string") return [value];
  return [];
}

function rowToRecipe(row: RecipeRow) {
  const name =
    (row.name as string | undefined) ?? (row.title as string | undefined) ?? "";
  const prepTime =
    (row.prep_time as number | undefined) ??
    (row.prep_time_minutes as number | undefined) ??
    (row.prepTime as number | undefined) ??
    0;
  const cookTime =
    (row.cook_time as number | undefined) ??
    (row.cook_time_minutes as number | undefined) ??
    (row.cookTime as number | undefined) ??
    0;
  const isFavorite =
    typeof (row as any).is_favorite === "boolean"
      ? ((row as any).is_favorite as boolean)
      : typeof (row as any).isFavorite === "boolean"
        ? ((row as any).isFavorite as boolean)
        : true;
  return {
    id: row.id as string | undefined,
    name,
    description: (row.description as string | undefined) ?? "",
    prepTime,
    cookTime,
    servings: (row.servings as number | undefined) ?? 0,
    difficulty: (row.difficulty as string | undefined) ?? "easy",
    calories: (row.calories as number | undefined) ?? undefined,
    instructions: normalizeInstructions(
      (row.instructions as unknown) ?? (row.steps as unknown),
    ),
    ingredients: (row.ingredients as any) ?? undefined,
    imageUrl:
      (row.image_url as string | undefined) ??
      (row.imageUrl as string | undefined) ??
      undefined,
    source: (row.source as string | undefined) ?? undefined,
    matchPercentage:
      (row.match_percentage as number | undefined) ??
      (row.matchPercentage as number | undefined) ??
      undefined,
    isFavorite,
    createdAt:
      (row.created_at as string | undefined) ??
      (row.createdAt as string | undefined) ??
      undefined,
  };
}

export async function GET(request: Request) {
  try {
    const userId = await getSupabaseUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data ?? []).map((row) => rowToRecipe(row as RecipeRow));
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
      description?: string;
      prepTime?: number;
      cookTime?: number;
      servings?: number;
      difficulty?: string;
      calories?: number;
      instructions?: unknown;
      ingredients?: unknown;
      imageUrl?: string;
      source?: string;
      matchPercentage?: number;
    } | null;

    if (!body?.name) {
      return NextResponse.json(
        { error: "Payload tidak valid" },
        { status: 400 },
      );
    }

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      name: body.name,
      title: body.name,
      description: body.description ?? "",
      prep_time: typeof body.prepTime === "number" ? body.prepTime : null,
      cook_time: typeof body.cookTime === "number" ? body.cookTime : null,
      servings: typeof body.servings === "number" ? body.servings : null,
      difficulty: typeof body.difficulty === "string" ? body.difficulty : null,
      calories: typeof body.calories === "number" ? body.calories : null,
      instructions: body.instructions ?? body["steps"],
      steps: body.instructions ?? body["steps"],
      ingredients: body.ingredients ?? null,
      image_url: typeof body.imageUrl === "string" ? body.imageUrl : null,
      source: typeof body.source === "string" ? body.source : null,
      match_percentage:
        typeof body.matchPercentage === "number" ? body.matchPercentage : null,
      // Favorit default true (akan di-ignore kalau kolom belum ada)
      is_favorite: true,
    };
    if (body.id) insertPayload.id = body.id;

    const supabase = getSupabaseServerAdminClient();
    const payloadToInsert: Record<string, unknown> = { ...insertPayload };
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from("recipes")
        .insert(payloadToInsert)
        .select("*")
        .single();

      if (!error) {
        const item = rowToRecipe(data as RecipeRow) as any;
        // Kalau kolom is_favorite belum ada, set default favorit=true (compat UI)
        if (typeof item.isFavorite !== "boolean") item.isFavorite = true;
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
      { error: "Gagal menyimpan resep" },
      { status: 500 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
