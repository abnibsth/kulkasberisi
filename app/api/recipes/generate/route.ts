/**
 * ============================================================
 *  /api/recipes/generate  — Multi-Model Orchestration
 * ============================================================
 *  Tahap 1 : Gemini 2.5-Flash  → generate teks resep + imageKeyword
 *  Tahap 2 : Unsplash API      → cari foto makanan per resep
 *  Tahap 3 : Response final dengan imageUrl melekat di tiap resep
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import Firecrawl from "@mendable/firecrawl-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

export const runtime    = "nodejs";
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────
//  TIPE DATA
// ─────────────────────────────────────────────────────────────

type InputIngredient = { name: string; quantity: number; unit: string };

type RecipeOut = {
  name           : string;
  description    : string;
  prepTime       : number;
  cookTime       : number;
  servings       : number;
  difficulty     : "easy" | "medium" | "hard";
  calories       : number;
  ingredients    : InputIngredient[];
  instructions   : string[];
  matchPercentage: number;
  /** 1-2 kata kunci bahasa Inggris dari Gemini, dipakai untuk cari foto di Unsplash */
  imageKeyword?  : string;
  /** URL gambar dari Unsplash (null jika tidak ditemukan / API error) */
  imageUrl?      : string | null;
};

// ─────────────────────────────────────────────────────────────
//  LAYER 1 — GEMINI (Text generation + imageKeyword)
// ─────────────────────────────────────────────────────────────

async function generateWithGemini(
  prompt: string,
  apiKey: string,
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature     : 0.8,
      maxOutputTokens : 8192,
      topP            : 0.95,
      topK            : 40,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const text   = result.response.text();
  if (!text) throw new Error("Gemini: response kosong");
  return text;
}

function handleGeminiError(e: any) {
  console.error(`[Gemini] ❌ Gagal memanggil API:`, e?.message || e);
  const errMsg = e?.message || String(e);
  const is429 = errMsg.includes("429") || 
                errMsg.includes("RESOURCE_EXHAUSTED") || 
                errMsg.includes("quota") || 
                errMsg.includes("limit") || 
                errMsg.includes("exhausted") || 
                errMsg.includes("Too Many Requests");

  if (is429) {
    return NextResponse.json(
      {
        error: "Kuota API gratis sedang penuh. Harap tunggu 1 menit lalu coba klik Generate kembali."
      },
      { status: 429 }
    );
  }

  const is503 = errMsg.includes("503") ||
                errMsg.includes("Service Unavailable") ||
                errMsg.includes("overloaded") ||
                errMsg.includes("high demand") ||
                errMsg.includes("limit");

  if (is503) {
    return NextResponse.json(
      {
        error: "Gemini gagal merespons. Server sedang overload atau kuota habis. Silakan coba beberapa saat lagi.",
        hint : errMsg || "Service Unavailable",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: "Terjadi kesalahan saat generate resep." + (errMsg ? ` (${errMsg})` : "") },
    { status: 500 }
  );
}

// ─────────────────────────────────────────────────────────────
//  LAYER 2 — UNSPLASH API (Foto per resep, independent try-catch)
// ─────────────────────────────────────────────────────────────

/**
 * Cari satu foto makanan di Unsplash berdasarkan imageKeyword dari Gemini.
 * Jika tidak ditemukan atau API error → return null, JANGAN throw.
 */
async function fetchUnsplashImage(imageKeyword: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("[Unsplash] UNSPLASH_ACCESS_KEY tidak diset di .env.local");
    return null;
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(imageKeyword)}&client_id=${accessKey}&per_page=1&orientation=landscape`;

    const res = await fetch(url, {
      headers: { "Accept-Version": "v1" },
      // Timeout 10 detik per request Unsplash
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[Unsplash] HTTP ${res.status} untuk keyword: "${imageKeyword}"`);
      return null;
    }

    const data = await res.json() as {
      results?: Array<{ urls?: { regular?: string } }>;
    };

    const imageUrl = data.results?.[0]?.urls?.regular ?? null;

    if (imageUrl) {
      console.log(`[Unsplash] ✅ Foto ditemukan untuk: "${imageKeyword}"`);
    } else {
      console.warn(`[Unsplash] ⚠️  Tidak ada hasil untuk: "${imageKeyword}"`);
    }

    return imageUrl;
  } catch (err) {
    // Tangkap error jaringan / timeout — proses resep tetap lanjut
    console.error(`[Unsplash] ❌ Fetch gagal untuk "${imageKeyword}":`, (err as Error).message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function roundInt(n: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function uniqueIngredients(list: InputIngredient[]) {
  const map = new Map<string, InputIngredient>();
  for (const ing of list) {
    const k = normalize(ing.name);
    if (!k) continue;
    if (!map.has(k)) map.set(k, ing);
  }
  return Array.from(map.values());
}

function pantryBase(): InputIngredient[] {
  return [
    { name: "minyak goreng", quantity: 1,    unit: "sdm"   },
    { name: "garam",         quantity: 0.5,  unit: "sdt"   },
    { name: "lada",          quantity: 0.25, unit: "sdt"   },
    { name: "bawang putih",  quantity: 2,    unit: "siung" },
    { name: "bawang merah",  quantity: 2,    unit: "butir" },
  ];
}

function pantrySet() {
  return new Set(pantryBase().map(i => normalize(i.name)));
}

function scoreMatch(available: InputIngredient[], recipeIngredients: InputIngredient[]) {
  const avail  = new Set(available.map(i => normalize(i.name)));
  const pantry = pantrySet();
  const used   = new Set(
    recipeIngredients
      .map(i => normalize(i.name))
      .filter(k => k && !pantry.has(k) && avail.has(k)),
  );
  return clamp(Math.round((used.size / Math.max(1, avail.size)) * 100), 5, 100);
}

function pickMustUse(available: InputIngredient[]) {
  const first = available[0];
  if (!first?.name) return [];
  return [{ name: first.name, quantity: 1, unit: "secukupnya" }];
}

function violatesHalal(text: string) {
  const t = normalize(text);
  
  // Kata-kata yang aman dicari sebagai substring (spesifik / panjang)
  const substringHaram = [
    "babi", "bacon", "lard", "arak", "vodka", "whisky", "wiski", "tuak", "soju"
  ];
  if (substringHaram.some(k => t.includes(k))) return true;

  // Kata-kata pendek yang sering memicu false positive jika dicari sebagai substring:
  // - "ham" (false positive pada "hampir")
  // - "rum" (false positive pada "harum")
  // - "bir" (false positive pada "biru", "kebiri", "gembira")
  // - "sake" (false positive pada "saksikan", "pusaka")
  // - "wine", "beer", "pork" (batas kata lebih aman)
  const exactHaramRegex = /\b(ham|rum|bir|sake|wine|beer|pork)\b/i;
  return exactHaramRegex.test(t);
}

function violatesVegetarian(text: string) {
  const t = normalize(text);
  
  // Kata-kata yang aman dicari sebagai substring
  const substringNonVeg = [
    "ayam", "daging", "sapi", "kambing", "ikan", "udang", "seafood", "cumi",
    "kepiting", "tuna", "salmon", "sosis", "bacon", "kaldu ayam", "kaldu sapi", "gelatin"
  ];
  if (substringNonVeg.some(k => t.includes(k))) return true;

  // Kata-kata pendek dengan batas kata (word boundary)
  // - "teri" (false positive pada "terigu", "materi", "kategori")
  // - "ham" (false positive pada "hampir")
  // - "abon" (lebih aman dengan batas kata)
  const exactNonVegRegex = /\b(teri|ham|abon)\b/i;
  return exactNonVegRegex.test(t);
}

function recipeToText(r: RecipeOut) {
  return [
    r.name,
    r.description,
    ...(r.ingredients  ?? []).map(i => i.name),
    ...(r.instructions ?? []),
  ].join("\n");
}

function recipeUsesMainIngredient(r: RecipeOut, mainIngredient: string) {
  const target = normalize(mainIngredient);
  if (!target) return true;

  const targetKind = proteinKind(target);
  const names = (r.ingredients ?? []).map(i => normalize(i.name));

  return names.some(n => {
    // Jika tipe protein sama (misal "daging kambing" dan "iga kambing" -> "kambing")
    if (targetKind && proteinKind(n) === targetKind) {
      return true;
    }
    // Cocokkan sebagian kata (misal "kambing" dan "daging kambing")
    if (n.includes(target) || target.includes(n)) {
      return true;
    }
    // Urai kata-kata untuk pencocokan lebih cerdas (misal "daging paha kambing" vs "daging kambing")
    const targetWords = target.split(/\s+/).filter(w => w.length > 2);
    const nWords = n.split(/\s+/).filter(w => w.length > 2);
    if (targetWords.length === 0 || nWords.length === 0) return false;
    return targetWords.every(tw => nWords.some(nw => nw.includes(tw) || tw.includes(nw)));
  });
}

function proteinKind(name: string) {
  const n = normalize(name);
  if (!n) return null;
  if (n.includes("telur") || n.includes("kaldu")) return null;
  if (/(ayam)/i.test(n))                    return "ayam";
  if (/(sapi|daging sapi)/i.test(n))        return "sapi";
  if (/(kambing|domba)/i.test(n))           return "kambing";
  if (/(ikan|tuna|salmon|teri)/i.test(n))   return "ikan";
  if (/(udang|cumi|kepiting|seafood)/i.test(n)) return "seafood";
  if (/(babi|pork|ham|bacon)/i.test(n))     return "babi";
  return null;
}

function recipeHasOtherProteins(r: RecipeOut, mainIngredient: string) {
  const mainKind = proteinKind(mainIngredient);
  if (!mainKind) return false;
  const kinds = new Set(
    (r.ingredients ?? [])
      .map(i => normalize(i.name))
      .map(n => proteinKind(n))
      .filter(Boolean) as string[],
  );
  kinds.delete(mainKind);
  return kinds.size > 0;
}

function difficultyPasses(
  r                : RecipeOut,
  selectedDifficulty: string | undefined,
  maxTimeFilter?   : number,
) {
  const totalTime = r.prepTime + r.cookTime;
  if (maxTimeFilter && maxTimeFilter > 0 && totalTime > maxTimeFilter) return false;
  if (!selectedDifficulty) return true;

  // Cocokkan difficulty langsung dari AI (easy, medium, hard)
  if (r.difficulty === selectedDifficulty) return true;

  // Fallback cadangan jika format atau penamaan berbeda
  const target = normalize(selectedDifficulty);
  const current = normalize(r.difficulty || "");
  return current === target || current.includes(target) || target.includes(current);
}

function normalizeRecipeOut(raw: any, available: InputIngredient[]): RecipeOut | null {
  if (!raw || typeof raw !== "object") return null;
  const name        = typeof raw.name        === "string" ? raw.name.trim()        : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (!name || !description) return null;

  const difficulty =
    raw.difficulty === "easy" || raw.difficulty === "medium" || raw.difficulty === "hard"
      ? raw.difficulty : "easy";

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .map((i: any) => ({
          name    : typeof i?.name     === "string" ? i.name.trim() : "",
          quantity: typeof i?.quantity === "number" ? i.quantity    : 0,
          unit    : typeof i?.unit     === "string" ? i.unit.trim() : "",
        }))
        .filter((i: InputIngredient) => i.name)
    : [];

  const availSet = new Set(available.map(i => normalize(i.name)));
  const pantry   = pantrySet();
  const kept  : InputIngredient[] = [];
  const extras: InputIngredient[] = [];

  for (const ing of ingredients) {
    const k = normalize(ing.name);
    if (!k) continue;
    if (pantry.has(k))   { continue; }
    if (availSet.has(k)) { kept.push(ing); continue; }
    if (!extras.find(e => normalize(e.name) === k)) extras.push(ing);
  }

  const ensuredUser       = kept.length > 0 ? [] : pickMustUse(available);
  const mergedIngredients = uniqueIngredients([...kept, ...ensuredUser, ...extras.slice(0, 3)]);

  const instructions = Array.isArray(raw.instructions)
    ? raw.instructions.map((s: any) => (typeof s === "string" ? s.trim() : "")).filter(Boolean)
    : [];

  const ensuredInstructions = instructions.length >= 6 ? instructions : [
    "Siapkan semua bahan dan peralatan masak.",
    "Cuci bahan segar, lalu potong sesuai kebutuhan.",
    "Panaskan minyak/air sesuai metode masak.",
    "Masukkan bumbu, tumis sampai harum.",
    "Masukkan bahan utama, masak sampai matang, koreksi rasa.",
    "Sajikan selagi hangat.",
  ];

  // Ambil imageKeyword dari Gemini (1-2 kata dalam bahasa Inggris untuk Unsplash)
  const imageKeyword = typeof raw.imageKeyword === "string" ? raw.imageKeyword.trim() : undefined;

  return {
    name,
    description,
    prepTime       : roundInt(raw.prepTime, 10),
    cookTime       : roundInt(raw.cookTime, 15),
    servings       : clamp(roundInt(raw.servings, 2), 1, 12),
    difficulty,
    calories       : clamp(roundInt(raw.calories, 300), 50, 1200),
    ingredients    : mergedIngredients,
    instructions   : ensuredInstructions,
    matchPercentage: scoreMatch(available, mergedIngredients),
    imageKeyword,
  };
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Toleran parse JSON dari string AI
// ─────────────────────────────────────────────────────────────

function parseAiJson(raw: string): { recipes?: any[] } {
  let s = raw.trim();
  // Hapus wrapper markdown jika ada (```json ... ```)
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const start = s.indexOf("{");
  const end   = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) s = s.substring(start, end + 1);
  // Hapus trailing comma yang bikin JSON.parse gagal
  s = s.replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(s) as { recipes?: any[] };
  } catch (error) {
    console.log("JSON Rusak:", raw);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPER: Konteks resep dari web via Firecrawl (opsional)
// ─────────────────────────────────────────────────────────────

function shorten(text: string, maxChars: number) {
  const s = (text || "").trim();
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(0, maxChars - 20)).trimEnd()}\n...\n[truncated]`;
}

function extractRecipeLikeLines(markdown: string) {
  const lines  = markdown.split(/\r?\n/);
  const keep   : string[] = [];
  const wanted = /(bahan|ingredients|cara|langkah|steps|cara membuat|petunjuk|instruksi|bumbu|marinasi|saus|sambal|takaran|porsi|waktu)/i;
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) continue;
    if (wanted.test(t) || t.startsWith("#") || t.startsWith("- ") || t.startsWith("1.")) keep.push(t);
    if (keep.length >= 120) break;
  }
  return keep.join("\n");
}

async function getWebRecipeContext(params: {
  ingredientNames: string[];
  difficulty?: string;
  maxTime?: string;
  vegetarian: boolean;
  halal: boolean;
}) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  const main  = params.ingredientNames[0] || "bahan";
  const diet  = params.vegetarian ? "vegetarian" : params.halal ? "halal" : "non halal";
  const time  = params.maxTime    ? `${params.maxTime} menit` : "";
  const diff  = params.difficulty ? `level ${params.difficulty}` : "";
  const query = `resep ${main} ${diet} ${diff} ${time}`.trim().replace(/\s+/g, " ");

  try {
    const firecrawl = new Firecrawl({ apiKey });
    const searchFn  = (firecrawl as unknown as { search?: (q: string, o: any) => Promise<any> }).search;
    if (typeof searchFn !== "function") return null;

    const searchRes = await searchFn(query, {
      limit            : 5,
      scrapeOptions    : { formats: ["markdown"] },
      ignoreInvalidURLs: true,
      timeout          : 30,
    });

    const data = Array.isArray(searchRes?.data) ? searchRes.data :
                 Array.isArray(searchRes?.results) ? searchRes.results : [];

    const docs = data
      .map((d: any) => {
        const url      = typeof d?.url      === "string" ? d.url      : "";
        const title    = typeof d?.title    === "string" ? d.title    : "";
        const markdown = typeof d?.markdown === "string" ? d.markdown :
                         typeof d?.data?.markdown === "string" ? d.data.markdown : "";
        if (!url || !markdown) return null;
        return { url, title, extracted: extractRecipeLikeLines(markdown) };
      })
      .filter(Boolean) as Array<{ url: string; title: string; extracted: string }>;

    if (!docs.length) return null;

    const joined = docs
      .slice(0, 4)
      .map((d, i) => `Sumber ${i + 1}: ${d.title ? `${d.title} - ` : ""}${d.url}\n${shorten(d.extracted, 1200)}`)
      .join("\n\n---\n\n");

    return shorten(joined, 3500);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  MAIN HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let ingredients    : InputIngredient[] = [];
  let mainIngredientRaw = "";
  let filters        : any = {};

  try {
    // ── Parse request body ────────────────────────────────────
    const body        = await req.json();
    ingredients       = body.ingredients || [];
    mainIngredientRaw = typeof body.mainIngredient === "string" ? body.mainIngredient.trim() : "";
    filters           = body.filters || {};

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY belum dikonfigurasi di .env.local",
          hint : "Dapatkan key di https://aistudio.google.com/apikey",
        },
        { status: 500 },
      );
    }

    // ── Normalisasi nama bahan ────────────────────────────────
    const ingredientNames     = ingredients.map((ing: { name: string }) => ing.name).filter(Boolean);
    const ingredientNamesNorm = ingredientNames.map(n => normalize(n));
    const mainIngredientNorm  = mainIngredientRaw ? normalize(mainIngredientRaw) : "";
    const mainIngredient      = mainIngredientNorm && ingredientNamesNorm.includes(mainIngredientNorm)
      ? ingredientNames[ingredientNamesNorm.indexOf(mainIngredientNorm)] || mainIngredientRaw
      : "";
    const ingredientList      = ingredientNames.join(", ");

    // ── Susun aturan filter ───────────────────────────────────
    const selectedDifficulty = typeof filters?.difficulty === "string" ? filters.difficulty : "";
    const maxTimeValue       = Number(filters?.maxTime) || 0;
    const vegetarianOn       = Boolean(filters?.vegetarian);
    const halalOn            = Boolean(filters?.halal);

    const difficultyRule =
      filters?.difficulty === "easy"   ? `- Tingkat kesulitan: mudah. Maksimal 8 langkah. Teknik dasar saja.` :
      filters?.difficulty === "medium" ? `- Tingkat kesulitan: sedang. 8–12 langkah. Boleh 1 proses tambahan.` :
      filters?.difficulty === "hard"   ? `- Tingkat kesulitan: sulit. 12–18 langkah. Multi-proses, teknik advanced.` :
                                         `- Tingkat kesulitan: bebas.`;

    const dietRules = [
      vegetarianOn
        ? `- VEGETARIAN (WAJIB): Jangan gunakan daging/ayam/ikan/seafood/kaldu hewani/gelatin.`
        : `- VEGETARIAN: Tidak wajib.`,
      halalOn
        ? `- HALAL (WAJIB): Jangan gunakan babi/alkohol dan bahan non-halal.`
        : `- HALAL: Tidak wajib.`,
    ].join("\n");

    let timeRule = "";
    if (selectedDifficulty === "easy")   timeRule = "- Waktu total MAKSIMAL 25 menit.";
    if (selectedDifficulty === "medium") timeRule = "- Waktu total 25–45 menit.";
    if (selectedDifficulty === "hard")   timeRule = "- Waktu total MINIMAL 45 menit.";
    if (maxTimeValue > 0) timeRule += ` WAJIB: Tidak boleh melebihi ${maxTimeValue} menit.`;

    const hardExtra =
      selectedDifficulty === "hard"
        ? `\nAturan ekstra SULIT:\n- Minimal 12 langkah, multi-proses (marinasi + bumbu halus + saus).\n- Jangan resep cepat (nasi goreng/omelet). Wajib teknik kompleks.`
        : selectedDifficulty === "medium"
          ? `\nAturan SEDANG: 8–12 langkah, 1–2 proses tambahan.`
          : selectedDifficulty === "easy"
            ? `\nAturan MUDAH: Maksimal 8 langkah, teknik dasar saja.`
            : "";

    const variationKey = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    // ── Tahap 0: Konteks web dari Firecrawl (opsional) ───────
    const webContext = await getWebRecipeContext({
      ingredientNames,
      difficulty : filters?.difficulty,
      maxTime    : filters?.maxTime,
      vegetarian : vegetarianOn,
      halal      : halalOn,
    });

    // ─────────────────────────────────────────────────────────
    //  TAHAP 1 — GEMINI: Generate resep teks + imageKeyword
    // ─────────────────────────────────────────────────────────
    /**
     * imageKeyword: 1-2 kata kunci bahasa Inggris untuk Unsplash.
     * Contoh: "fried rice", "chicken curry", "beef stew".
     * Harus singkat dan relevan dengan nama makanan.
     */
    const prompt = `Buat TEPAT 1 resep masakan Indonesia yang kreatif dari bahan: ${ingredientList}

${mainIngredient ? `BAHAN UTAMA (WAJIB): Fokus mengolah "${mainIngredient}" di resep ini.` : ""}
${mainIngredient ? `Jika bahan utama adalah protein hewani, JANGAN campur protein hewani lain.` : ""}
${filters?.difficulty ? `Tingkat kesulitan: ${filters.difficulty}` : ""}
${filters?.maxTime    ? `Waktu maksimum: ${filters.maxTime} menit`  : ""}
${dietRules}
${webContext ? `Referensi web (gunakan sebagai inspirasi saja):\n${webContext}\n` : ""}
${timeRule}
${hardExtra}

Aturan penting:
- OUTPUT WAJIB 1 RESEP SAJA: Kembalikan tepat 1 resep. Jangan membuat 2 atau 3 resep.
- TULISAN PADAT & SINGKAT: Buat instruksi dan langkah memasak yang singkat, padat, dan langsung pada intinya. Hindari deskripsi bertele-tele agar menghemat token dan mencegah respons terputus di tengah jalan.
- Prioritaskan bahan yang tersedia. Jangan abaikan bahan tersedia.
- Takaran realistis 2–4 porsi (bukan stok massal). Gunakan angka wajar (200g, 1 sdm, dll).
- Tambahan bahan lain maksimal 3 item.
- Langkah minimal 6 langkah, detail namun padat.
- FILTER PENTING: Resep tidak sesuai kesulitan/waktu akan ditolak.
- Kunci variasi unik: ${variationKey}
${difficultyRule}

Untuk field "imageKeyword":
- Tulis 1-2 kata dalam bahasa Inggris yang mendeskripsikan makanan ini.
- Tujuannya untuk pencarian foto di Unsplash.
- Contoh: "fried rice", "chicken soup", "beef rendang", "tofu stir fry", "grilled fish", "vegetable curry".
- Jangan terlalu spesifik, gunakan nama umum dalam masakan internasional.

Jawab HANYA dalam JSON valid (tanpa teks tambahan):
{
  "recipes": [
    {
      "name"           : "Nama Resep",
      "description"    : "Deskripsi singkat",
      "prepTime"       : 10,
      "cookTime"       : 20,
      "servings"       : 4,
      "difficulty"     : "easy",
      "calories"       : 350,
      "ingredients"    : [{"name": "Bahan", "quantity": 100, "unit": "gram"}],
      "instructions"   : ["Langkah 1", "Langkah 2"],
      "matchPercentage": 85,
      "imageKeyword"   : "fried rice"
    }
  ]
}`;

    // ── Panggil Gemini ─────────────────────────────────────────
    let content: string;

    try {
      console.log(`[Gemini] Memanggil gemini-2.5-flash...`);
      content = await generateWithGemini(prompt, geminiKey);
      console.log(`[Gemini] ✅ Sukses menggunakan gemini-2.5-flash`);
    } catch (e: any) {
      return handleGeminiError(e);
    }

    // ── Parse JSON resep dari Gemini ──────────────────────────
    let parsed: { recipes?: any[] };
    try {
      parsed = parseAiJson(content);
    } catch (parseErr: any) {
      console.error("[Parse] JSON parse failed:", parseErr?.message, "RAW:", content.slice(0, 500));
      // Retry sekali dengan prompt perbaikan
      const fixPrompt = `${prompt}\n\nPENTING: Output sebelumnya bukan JSON valid. Ulangi HANYA dalam JSON valid sesuai schema.`;
      try {
        console.log(`[Gemini] Memanggil gemini-2.5-flash untuk perbaikan JSON...`);
        const fixedText = await generateWithGemini(fixPrompt, geminiKey);
        parsed = parseAiJson(fixedText);
        content = fixedText; // Update content untuk debug file
      } catch (e: any) {
        if (e instanceof SyntaxError || e?.message?.includes("Unexpected token")) {
          return NextResponse.json(
            { error: "Gagal parsing JSON dari Gemini setelah retry" },
            { status: 500 },
          );
        }
        return handleGeminiError(e);
      }
    }

    // ── Normalize & validasi resep ────────────────────────────
    const list       = Array.isArray(parsed.recipes) ? parsed.recipes : [];
    const normalized = list.map(r => normalizeRecipeOut(r, ingredients)).filter(Boolean) as RecipeOut[];

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "AI tidak menghasilkan resep yang valid (0 resep)" },
        { status: 500 },
      );
    }

    const maxTimeFilter = maxTimeValue > 0 ? maxTimeValue : undefined;

    // ── Enforce filter diet + bahan utama + difficulty ────────
    console.log("[Backend Debug] Total normalized recipes from Gemini:", normalized.length);
    normalized.forEach((r, idx) => {
      console.log(`[Backend Debug] Resep ${idx + 1}: "${r.name}"`);
      console.log(` - Halal check:`, !violatesHalal(recipeToText(r)));
      console.log(` - Vegetarian check:`, !violatesVegetarian(recipeToText(r)));
      console.log(` - Has main ingredient "${mainIngredient}":`, recipeUsesMainIngredient(r, mainIngredient));
      console.log(` - Has other proteins:`, recipeHasOtherProteins(r, mainIngredient));
      console.log(` - Difficulty matches "${selectedDifficulty}" / time under "${maxTimeFilter}":`, difficultyPasses(r, selectedDifficulty, maxTimeFilter));
    });

    let enforced = normalized;
    if (vegetarianOn) enforced = enforced.filter(r => !violatesVegetarian(recipeToText(r)));
    if (halalOn)      enforced = enforced.filter(r => !violatesHalal(recipeToText(r)));

    if (mainIngredient) {
      enforced = enforced
        .filter(r => recipeUsesMainIngredient(r, mainIngredient))
        .filter(r => !recipeHasOtherProteins(r, mainIngredient));
    }

    if (selectedDifficulty || maxTimeFilter) {
      const before = enforced.length;
      enforced     = enforced.filter(r => difficultyPasses(r, selectedDifficulty, maxTimeFilter));

      // Jika semua terfilter, override difficulty tanpa buang resep
      if (enforced.length === 0 && selectedDifficulty && before > 0) {
        enforced = normalized
          .filter(r => !vegetarianOn || !violatesVegetarian(recipeToText(r)))
          .filter(r => !halalOn      || !violatesHalal(recipeToText(r)))
          .filter(r => !mainIngredient || recipeUsesMainIngredient(r, mainIngredient))
          .filter(r => !mainIngredient || !recipeHasOtherProteins(r, mainIngredient))
          .map(r => ({ ...r, difficulty: selectedDifficulty as any }));
      }
    }

    // ── Strict retry jika enforced masih kosong ───────────────
    const needsStrictRetry =
      enforced.length === 0 &&
      (vegetarianOn || halalOn || Boolean(mainIngredient) || Boolean(selectedDifficulty));

    if (needsStrictRetry) {
      const timeConstraint =
        maxTimeValue > 0        ? `- Total waktu TIDAK BOLEH melebihi ${maxTimeValue} menit.` :
        selectedDifficulty === "easy"   ? "- Total waktu maksimal 25 menit." :
        selectedDifficulty === "medium" ? "- Total waktu 25–45 menit." :
                                          "- Total waktu minimal 45 menit.";

      const strictPrompt = `${prompt}

PENTING - RETRY DENGAN ATURAN LEBIH KETAT:
- Semua resep WAJIB patuh aturan diet.
${mainIngredient ? `- Semua resep WAJIB memasukkan "${mainIngredient}" di daftar ingredients.` : ""}
${timeConstraint}
${selectedDifficulty === "hard" ? "- Mode SULIT: minimal 12 langkah, wajib multi-proses." :
  selectedDifficulty === "medium" ? "- Mode SEDANG: 8–12 langkah." :
  "- Mode MUDAH: maksimal 8 langkah."}
Buang semua ide yang tidak patuh dan buat ulang dari nol.`;

      try {
        console.log(`[Gemini] Memanggil gemini-2.5-flash untuk strict retry...`);
        const strictResText = await generateWithGemini(strictPrompt, geminiKey);
        const p2 = parseAiJson(strictResText);
        const l2 = Array.isArray(p2.recipes) ? p2.recipes : [];
        const n2 = l2.map(r => normalizeRecipeOut(r, ingredients)).filter(Boolean) as RecipeOut[];
        
        console.log("[Backend Debug] Strict retry normalized recipes:", n2.length);
        n2.forEach((r, idx) => {
          console.log(`[Backend Debug] Strict Resep ${idx + 1}: "${r.name}"`);
          console.log(` - Halal check:`, !violatesHalal(recipeToText(r)));
          console.log(` - Vegetarian check:`, !violatesVegetarian(recipeToText(r)));
          console.log(` - Has main ingredient "${mainIngredient}":`, recipeUsesMainIngredient(r, mainIngredient));
          console.log(` - Has other proteins:`, recipeHasOtherProteins(r, mainIngredient));
          console.log(` - Difficulty matches "${selectedDifficulty}" / time under "${maxTimeFilter}":`, difficultyPasses(r, selectedDifficulty, maxTimeFilter));
        });

        let   e2 = n2;

        if (vegetarianOn) e2 = e2.filter(r => !violatesVegetarian(recipeToText(r)));
        if (halalOn)      e2 = e2.filter(r => !violatesHalal(recipeToText(r)));
        if (mainIngredient) {
          e2 = e2.filter(r => recipeUsesMainIngredient(r, mainIngredient))
                 .filter(r => !recipeHasOtherProteins(r, mainIngredient));
        }
        if (selectedDifficulty || maxTimeFilter) {
          e2 = e2.filter(r => difficultyPasses(r, selectedDifficulty, maxTimeFilter));
          if (e2.length === 0 && selectedDifficulty) {
            e2 = n2
              .filter(r => !vegetarianOn || !violatesVegetarian(recipeToText(r)))
              .filter(r => !halalOn      || !violatesHalal(recipeToText(r)))
              .filter(r => !mainIngredient || recipeUsesMainIngredient(r, mainIngredient))
              .filter(r => !mainIngredient || !recipeHasOtherProteins(r, mainIngredient))
              .map(r => ({ ...r, difficulty: selectedDifficulty as any }));
          }
        }
        if (e2.length) enforced = e2;
      } catch (err) {
        console.error("[Strict retry] Failed:", err);
      }
    }

    if (enforced.length === 0 && normalized.length > 0) {
      console.log("[Backend Debug] Enforced masih kosong, jalankan fallback pelonggaran filter...");
      let fallback = normalized;
      if (vegetarianOn) fallback = fallback.filter(r => !violatesVegetarian(recipeToText(r)));
      if (halalOn)      fallback = fallback.filter(r => !violatesHalal(recipeToText(r)));
      if (mainIngredient) {
        const withMain = fallback.filter(r => recipeUsesMainIngredient(r, mainIngredient));
        if (withMain.length > 0) {
          fallback = withMain;
        }
      }
      if (fallback.length > 0) {
        enforced = fallback;
      }
    }

    const finalRecipes = enforced.slice(0, 1);

    const debugData = {
      timestamp: new Date().toISOString(),
      ingredients: ingredients,
      mainIngredient: mainIngredient,
      filters: filters,
      rawContentFromGemini: content,
      normalizedRecipes: normalized.map(r => ({
        name: r.name,
        ingredients: r.ingredients,
        difficulty: r.difficulty,
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        halalPass: !violatesHalal(recipeToText(r)),
        vegPass: !violatesVegetarian(recipeToText(r)),
        mainIngPass: recipeUsesMainIngredient(r, mainIngredient),
        otherProPass: !recipeHasOtherProteins(r, mainIngredient),
        diffPass: difficultyPasses(r, selectedDifficulty, maxTimeFilter)
      })),
      enforcedCount: enforced.length,
      finalRecipesCount: finalRecipes.length
    };
    try {
      fs.writeFileSync(path.join(process.cwd(), "debug-recipe.json"), JSON.stringify(debugData, null, 2));
      console.log("[Backend Debug] debug-recipe.json berhasil ditulis.");
    } catch (err) {
      console.error("Gagal menulis debug-recipe.json:", err);
    }

    // ─────────────────────────────────────────────────────────
    //  TAHAP 2 — UNSPLASH API: Cari foto per resep (paralel)
    // ─────────────────────────────────────────────────────────
    /**
     * Setiap resep mendapat imageKeyword dari Gemini.
     * Semua request ke Unsplash dijalankan paralel via Promise.allSettled.
     * Jika satu resep gagal foto → imageUrl = null, resep lain tetap lanjut.
     * Tidak ada dependency ke OpenAI sama sekali.
     */
    const hasUnsplashKey = Boolean(process.env.UNSPLASH_ACCESS_KEY);

    let recipesWithImages: RecipeOut[];

    if (hasUnsplashKey && finalRecipes.some(r => r.imageKeyword)) {
      console.log(`[Unsplash] Fetching photos for ${finalRecipes.length} recipes...`);

      const photoResults = await Promise.allSettled(
        finalRecipes.map(recipe =>
          recipe.imageKeyword
            ? fetchUnsplashImage(recipe.imageKeyword)
            : Promise.resolve(null),
        ),
      );

      recipesWithImages = finalRecipes.map((recipe, idx) => {
        const result   = photoResults[idx];
        const imageUrl = result.status === "fulfilled" ? result.value : null;
        return { ...recipe, imageUrl };
      });
    } else {
      if (!hasUnsplashKey) {
        console.warn("[Unsplash] UNSPLASH_ACCESS_KEY tidak ditemukan — melewati pencarian foto.");
      }
      // Lanjut tanpa foto
      recipesWithImages = finalRecipes.map(r => ({ ...r, imageUrl: null }));
    }

    // ─────────────────────────────────────────────────────────
    //  TAHAP 3 — Final Response
    // ─────────────────────────────────────────────────────────
    /**
     * Resep dikembalikan dengan imageUrl sudah tertempel.
     * Frontend (generator page) langsung menampilkan imageUrl jika tersedia,
     * tanpa perlu melakukan request tambahan ke /api/recipes/image.
     */
    return NextResponse.json({ recipes: recipesWithImages });

  } catch (error: any) {
    console.error("[Recipe generation] Fatal error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat generate resep." },
      { status: 500 },
    );
  }
}
