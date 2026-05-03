import { NextResponse } from "next/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";
import { enforceAdminRateLimit, requireAdmin, writeAdminAuditLog } from "@/lib/admin/server";

function dayKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 7);
  return d.toISOString().slice(0, 7);
}

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

function makeLastNDays(n: number) {
  const now = new Date();
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function makeLastNMonths(n: number) {
  const now = new Date();
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

export async function GET(request: Request) {
  try {
    enforceAdminRateLimit(request);
    const admin = await requireAdmin(request);

    const url = new URL(request.url);
    const exportKind = (url.searchParams.get("export") ?? "").trim().toLowerCase();
    const withSeries = (url.searchParams.get("series") ?? "").trim() === "1";

    const supabase = getSupabaseServerAdminClient();

    const users: Array<{ id: string; email: string | null; createdAt: string; role: string; banned: boolean }> = [];
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const batch = data.users ?? [];
      for (const u of batch) {
        const meta = (u.user_metadata as { role?: string; banned?: boolean } | null) ?? null;
        users.push({
          id: u.id,
          email: u.email ?? null,
          createdAt: u.created_at,
          role: meta?.role ?? "USER",
          banned: Boolean(meta?.banned),
        });
      }
      if (batch.length < 200) break;
    }

    if (exportKind === "users") {
      await writeAdminAuditLog({
        adminId: admin.userId,
        action: "USERS_EXPORTED_CSV",
        targetType: "ANALYTICS",
      }).catch(() => undefined);

      const header = ["id", "email", "created_at", "role", "banned"].map(csvCell).join(",");
      const rows = users.map((u) =>
        [u.id, u.email ?? "", u.createdAt, u.role, u.banned ? "true" : "false"].map(csvCell).join(","),
      );
      const csv = [header, ...rows].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="users.csv"',
        },
      });
    }

    if (exportKind === "recipes") {
      const days = makeLastNDays(30);
      const from = days[0] + "T00:00:00.000Z";
      const { data, error } = await supabase
        .from("recipes")
        .select("id,name,user_id,created_at,source")
        .gte("created_at", from)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await writeAdminAuditLog({
        adminId: admin.userId,
        action: "RECIPES_EXPORTED_CSV",
        targetType: "ANALYTICS",
        details: { from, limit: 5000 },
      }).catch(() => undefined);

      const header = ["id", "name", "user_id", "created_at", "source"].map(csvCell).join(",");
      const rows = (data ?? []).map((r) =>
        [r.id, r.name, r.user_id ?? "", r.created_at, r.source ?? ""].map(csvCell).join(","),
      );
      const csv = [header, ...rows].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="recipes.csv"',
        },
      });
    }

    const [recipesCountRes, recipesAiRes, ingredientsCountRes, usedIngredientsRes, ingredientCategoryRes] = await Promise.all([
      supabase.from("recipes").select("id", { count: "exact", head: true }),
      supabase.from("recipes").select("id", { count: "exact", head: true }).eq("source", "ai"),
      supabase.from("ingredients").select("id", { count: "exact", head: true }),
      supabase.from("ingredients").select("id", { count: "exact", head: true }).not("used_at", "is", null),
      supabase.from("ingredients").select("category, count"),
    ]);

    const recipesTotal = recipesCountRes.count ?? 0;
    const recipesAi = recipesAiRes.count ?? 0;
    const recipesUser = Math.max(0, recipesTotal - recipesAi);

    const usedCount = usedIngredientsRes.count ?? 0;
    const foodWasteReducedKg = Math.round(usedCount * 0.2 * 10) / 10;
    const foodWasteReducedRp = foodWasteReducedKg * 25000;

    // Ingredient category distribution
    const categoryCount = new Map<string, number>();
    for (const row of ingredientCategoryRes.data ?? []) {
      const cat = String(row.category ?? "Lainnya");
      const cnt = typeof row.count === "number" ? row.count : 1;
      categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + cnt);
    }
    const categoryDistribution = Array.from(categoryCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // New users this month
    const firstDayThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const newUsersThisMonth = users.filter((u) => u.createdAt >= firstDayThisMonth).length;

    const recentUsers = [...users]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const recentRecipes = await supabase
      .from("recipes")
      .select("id,name,created_at,source")
      .order("created_at", { ascending: false })
      .limit(5);

    const recentReviews = await supabase
      .from("reviews")
      .select("id,display_name,rating,is_public,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const series: {
      usersNewPerDay30d?: Array<{ day: string; count: number }>;
      usersNewPerMonth12m?: Array<{ month: string; count: number }>;
      recipesCreatedPerDay30d?: Array<{ day: string; count: number }>;
      recipesAiShare30d?: Array<{ day: string; ai: number; total: number }>;
      foodWastePerMonth?: Array<{ month: string; kg: number }>;
      recipesBySource?: Array<{ source: string; count: number }>;
    } = {};
    let topAiRecipes: Array<{ name: string; count: number }> = [];

    if (withSeries) {
      const days = makeLastNDays(30);
      const baseUsers = Object.fromEntries(days.map((d) => [d, 0])) as Record<string, number>;
      for (const u of users) {
        const k = dayKey(u.createdAt);
        if (k in baseUsers) baseUsers[k] += 1;
      }
      series.usersNewPerDay30d = days.map((d) => ({ day: d, count: baseUsers[d] ?? 0 }));

      // 12 month user growth
      const months = makeLastNMonths(12);
      const baseUsersMonth = Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;
      for (const u of users) {
        const k = monthKey(u.createdAt);
        if (k in baseUsersMonth) baseUsersMonth[k] += 1;
      }
      series.usersNewPerMonth12m = months.map((m) => ({ month: m, count: baseUsersMonth[m] ?? 0 }));

      const from = days[0] + "T00:00:00.000Z";
      const { data: recipeRows, error: recipeErr } = await supabase
        .from("recipes")
        .select("created_at,source,name")
        .gte("created_at", from)
        .order("created_at", { ascending: true })
        .limit(5000);

      if (!recipeErr) {
        const baseRecipes = Object.fromEntries(days.map((d) => [d, 0])) as Record<string, number>;
        const baseAi = Object.fromEntries(days.map((d) => [d, 0])) as Record<string, number>;
        const aiNameCount = new Map<string, number>();

        for (const r of recipeRows ?? []) {
          const k = dayKey(r.created_at as string);
          if (k in baseRecipes) baseRecipes[k] += 1;
          const src = String((r as { source?: string | null }).source ?? "").toLowerCase();
          if (src === "ai") {
            if (k in baseAi) baseAi[k] += 1;
            const name = String((r as { name?: string | null }).name ?? "").trim();
            if (name) aiNameCount.set(name, (aiNameCount.get(name) ?? 0) + 1);
          }
        }

        series.recipesCreatedPerDay30d = days.map((d) => ({ day: d, count: baseRecipes[d] ?? 0 }));
        series.recipesAiShare30d = days.map((d) => ({ day: d, ai: baseAi[d] ?? 0, total: baseRecipes[d] ?? 0 }));

        topAiRecipes = [...aiNameCount.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }

      // Food waste per month (12 months)
      const months12 = makeLastNMonths(12);
      const { data: ingredientRows } = await supabase
        .from("ingredients")
        .select("created_at,quantity,unit")
        .not("used_at", "is", null)
        .order("created_at", { ascending: true });
      
      if (ingredientRows) {
        const wasteByMonth = Object.fromEntries(months12.map((m) => [m, 0])) as Record<string, number>;
        for (const ing of ingredientRows) {
          const k = monthKey(ing.created_at);
          if (k in wasteByMonth) {
            // Assume avg 0.2kg per ingredient
            wasteByMonth[k] += 0.2;
          }
        }
        series.foodWastePerMonth = months12.map((m) => ({ month: m, kg: Math.round(wasteByMonth[m] * 10) / 10 }));
      }

      // Recipes by source
      const { data: allRecipes } = await supabase
        .from("recipes")
        .select("source")
        .limit(10000);
      
      if (allRecipes) {
        const sourceCount = new Map<string, number>();
        for (const r of allRecipes) {
          const src = String(r.source ?? "user");
          sourceCount.set(src, (sourceCount.get(src) ?? 0) + 1);
        }
        series.recipesBySource = Array.from(sourceCount.entries())
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count);
      }
    }

    await writeAdminAuditLog({
      adminId: admin.userId,
      action: "ADMIN_ANALYTICS_VIEWED",
      targetType: "ANALYTICS",
    }).catch(() => undefined);

    return NextResponse.json({
      stats: {
        usersTotal: users.length,
        usersBanned: users.filter((u) => u.banned).length,
        recipesTotal,
        recipesAi,
        recipesUser,
        ingredientsTotal: ingredientsCountRes.count ?? 0,
        foodWasteReducedKg,
        foodWasteReducedRp,
        newUsersThisMonth,
      },
      categoryDistribution,
      recent: {
        users: recentUsers,
        recipes: recentRecipes.data ?? [],
        reviews: recentReviews.data ?? [],
      },
      ...(withSeries ? { series, topAiRecipes } : {}),
    });
  } catch (e) {
    const status = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status });
  }
}
