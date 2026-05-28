/**
 * /api/recipes/image
 * Fallback image search via Unsplash API.
 * Dipakai oleh generator page jika recipe tidak memiliki imageUrl dari server.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Konversi nama resep bahasa Indonesia ke keyword Unsplash.
 * Strategi: petik kata kunci utama + teknik memasak.
 */
function toUnsplashKeyword(recipeName: string): string {
  const n = recipeName.toLowerCase().trim();

  // Pemetaan teknik dan nama masakan umum ke keyword Inggris
  const map: [RegExp, string][] = [
    [/nasi goreng/,          "fried rice"],
    [/nasi kuning/,          "yellow rice"],
    [/nasi uduk/,            "coconut rice"],
    [/nasi padang/,          "Indonesian rice"],
    [/mie goreng|bakmi goreng/, "fried noodles"],
    [/mie rebus|bakmi rebus/,   "noodle soup"],
    [/soto ayam/,            "chicken soup"],
    [/soto sapi/,            "beef soup"],
    [/sop buntut/,           "oxtail soup"],
    [/rawon/,                "dark beef soup"],
    [/rendang/,              "beef rendang"],
    [/gulai/,                "curry stew"],
    [/opor ayam/,            "chicken coconut curry"],
    [/ayam goreng/,          "fried chicken"],
    [/ayam bakar/,           "grilled chicken"],
    [/ayam kecap/,           "soy sauce chicken"],
    [/bebek goreng/,         "fried duck"],
    [/ikan goreng/,          "fried fish"],
    [/ikan bakar/,           "grilled fish"],
    [/ikan asin/,            "salted fish"],
    [/udang goreng/,         "fried shrimp"],
    [/udang balado/,         "spicy shrimp"],
    [/cumi/,                 "squid stir fry"],
    [/tempe goreng/,         "fried tempeh"],
    [/tempe balado/,         "spicy tempeh"],
    [/tahu goreng/,          "fried tofu"],
    [/tahu bacem/,           "braised tofu"],
    [/pecel/,                "peanut vegetable salad"],
    [/gado.gado/,            "peanut sauce vegetables"],
    [/rujak/,                "Indonesian fruit salad"],
    [/sayur asam/,           "sour vegetable soup"],
    [/cap cay|capcay/,       "vegetable stir fry"],
    [/tumis bayam/,          "spinach stir fry"],
    [/tumis kangkung/,       "water spinach stir fry"],
    [/telur dadar/,          "omelette"],
    [/telur balado/,         "spicy egg"],
    [/perkedel/,             "potato fritter"],
    [/bakwan/,               "vegetable fritter"],
    [/martabak/,             "stuffed pancake"],
    [/sate ayam/,            "chicken satay"],
    [/sate sapi/,            "beef satay"],
    [/sate kambing/,         "lamb satay"],
    [/sup/,                  "soup"],
    [/sambal/,               "sambal chili"],
    [/balado/,               "spicy stir fry"],
    [/rica.rica/,            "spicy Indonesian chicken"],
    [/semur/,                "Indonesian braised beef"],
    [/pepes/,                "steamed fish banana leaf"],
    [/bakar/,                "grilled food"],
    [/goreng/,               "fried food"],
    [/tumis/,                "stir fry"],
    [/rebus/,                "boiled food"],
    [/kukus/,                "steamed food"],
    [/ayam/,                 "chicken dish"],
    [/sapi|daging/,          "beef dish"],
    [/kambing/,              "lamb dish"],
    [/ikan/,                 "fish dish"],
    [/udang/,                "shrimp dish"],
    [/sayur/,                "vegetable dish"],
    [/tahu|tempe/,           "tofu dish"],
  ];

  for (const [pattern, keyword] of map) {
    if (pattern.test(n)) return keyword;
  }

  // Fallback: ambil 2 kata pertama nama resep
  const words = n.split(/\s+/).slice(0, 2).join(" ");
  return words || "Indonesian food";
}

export async function POST(req: NextRequest) {
  try {
    const body        = await req.json() as { recipeName?: string };
    const recipeName  = typeof body.recipeName === "string" ? body.recipeName.trim() : "";

    if (!recipeName) {
      return NextResponse.json({ error: "recipeName is required" }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json(
        { error: "UNSPLASH_ACCESS_KEY tidak dikonfigurasi" },
        { status: 500 },
      );
    }

    const keyword = toUnsplashKeyword(recipeName);
    console.log(`[Unsplash Image API] "${recipeName}" → keyword: "${keyword}"`);

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&client_id=${accessKey}&per_page=3&orientation=landscape`;

    const res = await fetch(url, {
      headers: { "Accept-Version": "v1" },
      signal : AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[Unsplash Image API] HTTP ${res.status}`);
      return NextResponse.json({ error: `Unsplash HTTP ${res.status}` }, { status: res.status });
    }

    const data = await res.json() as {
      results?: Array<{ urls?: { regular?: string; small?: string }; alt_description?: string }>;
    };

    // Pilih gambar pertama yang tersedia
    const result   = data.results?.[0];
    const imageUrl = result?.urls?.regular ?? result?.urls?.small ?? null;

    if (!imageUrl) {
      console.warn(`[Unsplash Image API] Tidak ada hasil untuk keyword: "${keyword}"`);
      return NextResponse.json({ imageUrl: null, keyword });
    }

    return NextResponse.json({ imageUrl, keyword, provider: "unsplash" });

  } catch (err) {
    console.error("[Unsplash Image API] Error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message ?? "Fetch ke Unsplash gagal" },
      { status: 500 },
    );
  }
}
