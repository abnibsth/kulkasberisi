import { NextResponse } from "next/server";
import {
  getSupabaseServerAdminClient,
  getSupabaseUserIdFromRequest,
} from "@/lib/supabase/server";

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
  ingredients: { name: string; quantity: number; unit: string }[] | null;
  created_at: string;
};

function rowToRecipe(row: RecipeRow) {
  return {
    id: row.id,
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
      .select(
        "id,user_id,name,description,prep_time,cook_time,servings,difficulty,calories,instructions,image_url,source,match_percentage,ingredients,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: (data ?? []).map((r) => rowToRecipe(r as RecipeRow)),
    });
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
      instructions?: string[];
      imageUrl?: string;
      source?: string;
      matchPercentage?: number;
      ingredients?: { name: string; quantity: number; unit: string }[];
    } | null;

    if (
      !body?.name ||
      !body.description ||
      typeof body.prepTime !== "number" ||
      typeof body.cookTime !== "number" ||
      typeof body.servings !== "number" ||
      typeof body.difficulty !== "string" ||
      !Array.isArray(body.instructions)
    ) {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      name: body.name,
      description: body.description,
      prep_time: body.prepTime,
      cook_time: body.cookTime,
      servings: body.servings,
      difficulty: body.difficulty,
      calories: typeof body.calories === "number" ? body.calories : null,
      instructions: body.instructions,
      image_url: body.imageUrl ?? null,
      source: body.source ?? null,
      match_percentage: typeof body.matchPercentage === "number" ? body.matchPercentage : null,
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : null,
    };
    if (body.id) insertPayload.id = body.id;

    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase
      .from("recipes")
      .upsert(insertPayload, { onConflict: "id" })
      .select(
        "id,user_id,name,description,prep_time,cook_time,servings,difficulty,calories,instructions,image_url,source,match_percentage,ingredients,created_at",
      )
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

