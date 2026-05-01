import { NextRequest, NextResponse } from "next/server";

function mapCategoryFromTags(tags: string[]) {
  const t = tags.map((s) => s.toLowerCase());
  const has = (k: string) => t.some((x) => x.includes(k));

  if (has("beverages") || has("drinks") || has("tea") || has("coffee") || has("juice")) return "minuman";
  if (has("dair") || has("milk") || has("cheese") || has("yogurt")) return "dairy";
  if (has("meat") || has("chicken") || has("beef") || has("fish") || has("seafood") || has("egg")) return "protein";
  if (has("vegetable") || has("veg") || has("spinach") || has("leaf")) return "sayur";
  if (has("fruit")) return "buah";
  if (has("sauce") || has("seasoning") || has("spice") || has("condiment")) return "bumbu";
  if (has("cereal") || has("rice") || has("noodle") || has("bread") || has("pasta") || has("grain")) return "karbohidrat";
  return "lainnya";
}

export async function GET(request: NextRequest) {
  try {
    const barcode = request.nextUrl.searchParams.get("barcode")?.trim() ?? "";
    if (!barcode) return NextResponse.json({ error: "barcode wajib diisi" }, { status: 400 });

    const upstream = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      cache: "no-store",
      headers: { "User-Agent": "kulkasberisi/1.0 (barcode lookup)" },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Barcode tidak ditemukan" }, { status: 404 });
    }

    const json = (await upstream.json()) as {
      product?: {
        product_name?: string;
        product_name_id?: string;
        brands?: string;
        categories_tags?: string[];
      };
      status?: number;
    };

    const nameRaw =
      json.product?.product_name?.trim() ||
      json.product?.product_name_id?.trim() ||
      "";
    const brand = json.product?.brands?.split(",")?.[0]?.trim() || "";
    const name = nameRaw ? (brand ? `${nameRaw} (${brand})` : nameRaw) : "";
    if (!name) {
      return NextResponse.json({ error: "Produk ditemukan tapi nama kosong" }, { status: 404 });
    }

    const tags = Array.isArray(json.product?.categories_tags) ? json.product?.categories_tags : [];
    const category = mapCategoryFromTags(tags);

    return NextResponse.json({
      item: {
        barcode,
        name,
        category,
        source: "openfoodfacts",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

