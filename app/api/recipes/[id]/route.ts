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

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getSupabaseUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: rowToRecipe(data as RecipeRow) });
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

    const body = (await request.json().catch(() => null)) as {
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
      isFavorite?: boolean;
    } | null;

    if (!body) {
      return NextResponse.json(
        { error: "Payload tidak valid" },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      updatePayload.name = body.name;
      updatePayload.title = body.name;
    }
    if (typeof body.description === "string")
      updatePayload.description = body.description;
    if (typeof body.prepTime === "number")
      updatePayload.prep_time = body.prepTime;
    if (typeof body.cookTime === "number")
      updatePayload.cook_time = body.cookTime;
    if (typeof body.servings === "number")
      updatePayload.servings = body.servings;
    if (typeof body.difficulty === "string")
      updatePayload.difficulty = body.difficulty;
    if (typeof body.calories === "number")
      updatePayload.calories = body.calories;
    if (body.instructions !== undefined) {
      updatePayload.instructions = body.instructions;
      updatePayload.steps = body.instructions;
    }
    if (body.ingredients !== undefined)
      updatePayload.ingredients = body.ingredients;
    if (typeof body.imageUrl === "string")
      updatePayload.image_url = body.imageUrl;
    if (typeof body.source === "string") updatePayload.source = body.source;
    if (typeof body.matchPercentage === "number")
      updatePayload.match_percentage = body.matchPercentage;
    if (typeof body.isFavorite === "boolean")
      updatePayload.is_favorite = body.isFavorite;

    const supabase = getSupabaseServerAdminClient();
    const payloadToUpdate: Record<string, unknown> = { ...updatePayload };
    const requestedFavorite =
      typeof body.isFavorite === "boolean" ? body.isFavorite : undefined;

    if (Object.keys(payloadToUpdate).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field yang bisa diupdate" },
        { status: 400 },
      );
    }
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from("recipes")
        .update(payloadToUpdate)
        .eq("id", params.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (!error) {
        const item = rowToRecipe(data as RecipeRow) as any;
        // Kalau kolom is_favorite belum ada, jaga konsistensi response dengan request
        if (
          typeof requestedFavorite === "boolean" &&
          typeof item.isFavorite !== "boolean"
        ) {
          item.isFavorite = requestedFavorite;
        }
        return NextResponse.json({ item });
      }

      const missing = extractMissingColumn(error.message);

      if (missing && missing in payloadToUpdate) {
        delete payloadToUpdate[missing];
        if (Object.keys(payloadToUpdate).length === 0) {
          // Kalau cuma toggle favorit dan kolom belum ada, return current row + flag dari request (client-side compatibility)
          if (
            missing === "is_favorite" &&
            typeof requestedFavorite === "boolean"
          ) {
            const { data: current, error: getError } = await supabase
              .from("recipes")
              .select("*")
              .eq("id", params.id)
              .eq("user_id", userId)
              .single();
            if (getError) {
              return NextResponse.json(
                { error: getError.message },
                { status: 500 },
              );
            }
            return NextResponse.json({
              item: {
                ...rowToRecipe(current as RecipeRow),
                isFavorite: requestedFavorite,
              },
            });
          }

          return NextResponse.json(
            { error: "Tidak ada field yang bisa diupdate" },
            { status: 400 },
          );
        }
        continue;
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Gagal mengupdate resep" },
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
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getSupabaseUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerAdminClient();
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", params.id)
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
