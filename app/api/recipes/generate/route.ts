import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Firecrawl from "@mendable/firecrawl-js";

export const runtime = "nodejs";

type InputIngredient = { name: string; quantity: number; unit: string };

type RecipeOut = {
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  calories: number;
  ingredients: InputIngredient[];
  instructions: string[];
  matchPercentage: number;
  imageUrl?: string;
};

async function generateWithGemini(prompt: string, apiKey: string, model: string) {
  // API v1beta mendukung responseMimeType untuk JSON mode
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
  );
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,
        topP: 0.95,
        topK: 40,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini error (${res.status}): ${text || res.statusText}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini: response kosong");
  return text;
}

async function generateWithOpenAI(prompt: string, apiKey: string, model: string) {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Anda asisten chef yang menghasilkan resep masakan Indonesia. Ikuti aturan diet dari user. Jawab dalam bahasa Indonesia dan selalu keluarkan JSON yang valid.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 2400,
    top_p: 0.95,
    frequency_penalty: 0.3,
    presence_penalty: 0.3,
  });
  const content = completion.choices[0].message.content;
  if (!content) throw new Error("OpenAI: response kosong");
  return content;
}

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

function pantryBase() {
  return [
    { name: "minyak goreng", quantity: 1, unit: "sdm" },
    { name: "garam", quantity: 0.5, unit: "sdt" },
    { name: "lada", quantity: 0.25, unit: "sdt" },
    { name: "bawang putih", quantity: 2, unit: "siung" },
    { name: "bawang merah", quantity: 2, unit: "butir" },
  ] satisfies InputIngredient[];
}

function pantrySet() {
  return new Set(pantryBase().map((i) => normalize(i.name)));
}

function scoreMatch(available: InputIngredient[], recipeIngredients: InputIngredient[]) {
  // Hitung seberapa banyak bahan user yang benar-benar kepakai di resep.
  const avail = new Set(available.map((i) => normalize(i.name)));
  const pantry = pantrySet();
  const used = new Set(
    recipeIngredients
      .map((i) => normalize(i.name))
      .filter((k) => k && !pantry.has(k) && avail.has(k)),
  );
  const pct = Math.round((used.size / Math.max(1, avail.size)) * 100);
  return clamp(pct, 5, 100);
}

function pickMustUse(available: InputIngredient[]) {
  // Minimal: pastikan setidaknya 1 bahan user kepakai untuk menjaga relevansi.
  // Jangan bawa "stok" user (kg/liter) jadi takaran resep.
  const first = available[0];
  if (!first?.name) return [];
  return [{ name: first.name, quantity: 1, unit: "secukupnya" }];
}

function violatesHalal(text: string) {
  const t = normalize(text);
  return [
    "babi",
    "pork",
    "ham",
    "bacon",
    "lard",
    "arak",
    "wine",
    "beer",
    "bir",
    "vodka",
    "whisky",
    "wiski",
    "rum",
    "sake",
    "tuak",
    "soju",
  ].some((k) => t.includes(k));
}

function violatesVegetarian(text: string) {
  const t = normalize(text);
  return [
    "ayam",
    "daging",
    "sapi",
    "kambing",
    "ikan",
    "udang",
    "seafood",
    "cumi",
    "kepiting",
    "tuna",
    "salmon",
    "teri",
    "abon",
    "sosis",
    "bacon",
    "ham",
    "kaldu ayam",
    "kaldu sapi",
    "gelatin",
  ].some((k) => t.includes(k));
}

function recipeToText(r: RecipeOut) {
  return [
    r.name,
    r.description,
    ...(r.ingredients ?? []).map((i) => i.name),
    ...(r.instructions ?? []),
  ].join("\n");
}

function recipeUsesMainIngredient(r: RecipeOut, mainIngredient: string) {
  const target = normalize(mainIngredient);
  if (!target) return true;
  const names = (r.ingredients ?? []).map((i) => normalize(i.name));
  return names.some((n) => n === target || n.includes(target) || target.includes(n));
}

function proteinKind(name: string) {
  const n = normalize(name);
  if (!n) return null;
  if (/(ayam)/i.test(n)) return "ayam";
  if (/(sapi|daging sapi)/i.test(n)) return "sapi";
  if (/(kambing|domba)/i.test(n)) return "kambing";
  if (/(ikan|tuna|salmon|teri)/i.test(n)) return "ikan";
  if (/(udang|cumi|kepiting|seafood)/i.test(n)) return "seafood";
  if (/(babi|pork|ham|bacon)/i.test(n)) return "babi";
  return null;
}

function recipeHasOtherProteins(r: RecipeOut, mainIngredient: string) {
  const mainKind = proteinKind(mainIngredient);
  if (!mainKind) return false; // kalau bahan utama bukan protein, jangan over-restrict

  const names = (r.ingredients ?? []).map((i) => normalize(i.name));
  const kinds = new Set(names.map((n) => proteinKind(n)).filter(Boolean) as string[]);
  // boleh mengandung protein utama itu sendiri; kalau ada protein lain, tolak
  kinds.delete(mainKind);
  return kinds.size > 0;
}

function difficultyPasses(r: RecipeOut, selectedDifficulty: string | undefined, maxTimeFilter?: number) {
  const d = selectedDifficulty;
  
  // Cek waktu dulu jika ada filter waktu
  const totalTime = r.prepTime + r.cookTime;
  if (maxTimeFilter && maxTimeFilter > 0 && totalTime > maxTimeFilter) {
    return false;
  }
  
  if (!d) return true;
  const steps = Array.isArray(r.instructions) ? r.instructions.length : 0;
  const text = normalize(recipeToText(r));

  // Easy: maksimal 8 langkah, total waktu ≤25 menit
  if (d === "easy") {
    return steps > 0 && steps <= 8 && totalTime <= 25;
  }
  
  // Medium: 8-12 langkah, total waktu 25-45 menit
  if (d === "medium") {
    return steps >= 8 && steps <= 12 && totalTime >= 25 && totalTime <= 45;
  }
  
  // Hard: minimal 12 langkah, total waktu ≥45 menit, bukan resep cepat
  if (d === "hard") {
    const easyDish = /(nasi goreng|omelet|telur dadar|tumis .*simpel|simpel|simple|quick|cepat|sup bening|tumis)/i.test(text);
    return steps >= 12 && totalTime >= 45 && !easyDish;
  }
  
  return true;
}

function buildFallbackRecipes(
  available: InputIngredient[],
  filters: { difficulty?: string; maxTime?: string; vegetarian?: boolean; halal?: boolean },
  mainIngredientRaw?: string,
  webContext?: string | null
): RecipeOut[] {
  // Fallback terakhir: kembalikan resep minimal dari bahan user
  // Ini HANYA dipakai jika AI gagal total (API error/kuota habis)
  const availNames = new Set(available.map((i) => normalize(i.name)));

  let main = "bahan";
  if (mainIngredientRaw && availNames.has(normalize(mainIngredientRaw))) {
    main = mainIngredientRaw;
  } else if (availNames.has("bayam")) {
    main = "bayam";
  } else if (available[0]?.name) {
    main = available[0].name;
  }

  const requestedDiff = filters?.difficulty || "";
  const maxTime = Number(filters?.maxTime) || 0;
  const isHalal = Boolean(filters?.halal);
  const isVeg = Boolean(filters?.vegetarian);

  // Set difficulty-appropriate times
  let basePrepTime = 10, baseCookTime = 15, steps = 6;
  if (requestedDiff === "easy") {
    basePrepTime = 8; baseCookTime = 12; steps = 5;
  } else if (requestedDiff === "medium") {
    basePrepTime = 15; baseCookTime = 25; steps = 8;
  } else if (requestedDiff === "hard") {
    basePrepTime = 25; baseCookTime = 45; steps = 12;
  }

  // Adjust if maxTime is set
  if (maxTime > 0 && basePrepTime + baseCookTime > maxTime) {
    baseCookTime = maxTime - basePrepTime;
    if (baseCookTime < 5) baseCookTime = 5;
  }

  // Simple generic recipe based on main ingredient
  const genericRecipe: RecipeOut = {
    name: `Olahan ${main}`,
    description: `Resep sederhana mengolah ${main} dengan bumbu dasar.`,
    prepTime: basePrepTime,
    cookTime: baseCookTime,
    servings: 3,
    difficulty: requestedDiff === "easy" || requestedDiff === "medium" || requestedDiff === "hard" ? requestedDiff as any : "easy",
    calories: 300,
    ingredients: uniqueIngredients([
      ...(available.slice(0, 3) || []),
      ...pantryBase(),
    ]),
    instructions: [
      `Siapkan ${main} dan semua bahan.`,
      "Cuci bersih bahan-bahan.",
      "Tumis bumbu dasar hingga harum.",
      `Masukkan ${main}, aduk rata.`,
      "Bumbui dengan garam dan lada.",
      "Masak hingga matang.",
      "Koreksi rasa dan sajikan.",
    ].slice(0, Math.max(6, steps)),
    matchPercentage: scoreMatch(
      available,
      uniqueIngredients([
        ...(available.slice(0, 3) || []),
        ...pantryBase(),
      ]),
    ),
  };

  // Return minimal recipes (1-3) just to have something
  const recipes = [genericRecipe];
  
  // Add 1-2 more variations with slight modifications
  const variations = [
    { name: `Tumis ${main}`, technique: "tumis", extraTime: 5 },
    { name: `${main} Goreng`, technique: "goreng", extraTime: 10 },
    { name: `Sup ${main}`, technique: "rebus", extraTime: 15 },
  ];

  const randomOffset = Math.floor(Date.now() / 1000) % variations.length;
  for (let i = 0; i < Math.min(2, variations.length); i++) {
    const varIdx = (randomOffset + i) % variations.length;
    const variation = variations[varIdx];
    
    const varPrepTime = basePrepTime;
    const varCookTime = Math.min(baseCookTime + variation.extraTime, maxTime > 0 ? maxTime - basePrepTime : 999);
    
    if (maxTime > 0 && varPrepTime + varCookTime > maxTime) continue;
    
    recipes.push({
      name: variation.name,
      description: `${variation.technique.charAt(0).toUpperCase() + variation.technique.slice(1)} ${main} dengan bumbu sederhana.`,
      prepTime: varPrepTime,
      cookTime: varCookTime,
      servings: 3,
      difficulty: requestedDiff === "easy" || requestedDiff === "medium" || requestedDiff === "hard" ? requestedDiff as any : "easy",
      calories: 280 + i * 50,
      ingredients: uniqueIngredients([
        ...(available.slice(0, 2) || []),
        ...pantryBase(),
      ]),
      instructions: [
        `Siapkan ${main}.`,
        "Cuci bersih.",
        `Panaskan minyak untuk ${variation.technique}.`,
        "Tumis bumbu dasar.",
        `Masukkan ${main}.`,
        `Masak dengan teknik ${variation.technique} hingga matang.`,
        "Koreksi rasa.",
        "Sajikan.",
      ].slice(0, Math.max(6, steps)),
      matchPercentage: scoreMatch(
        available,
        uniqueIngredients([
          ...(available.slice(0, 2) || []),
          ...pantryBase(),
        ]),
      ),
    });
  }

  return recipes.slice(0, 3);
}

function normalizeRecipeOut(raw: any, available: InputIngredient[]): RecipeOut | null {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  if (!name || !description) return null;

  const difficulty =
    raw.difficulty === "easy" || raw.difficulty === "medium" || raw.difficulty === "hard" ? raw.difficulty : "easy";

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .map((i: any) => ({
          name: typeof i?.name === "string" ? i.name.trim() : "",
          quantity: typeof i?.quantity === "number" ? i.quantity : 0,
          unit: typeof i?.unit === "string" ? i.unit.trim() : "",
        }))
        .filter((i: InputIngredient) => i.name)
    : [];

  const availSet = new Set(available.map((i) => normalize(i.name)));
  const pantry = pantrySet();
  const kept: InputIngredient[] = [];
  const extras: InputIngredient[] = [];
  const pantryMentioned: InputIngredient[] = [];

  // Pertahankan hanya bahan yang memang disebut model (jadi bahan user yang tidak kepakai tidak ikut tampil).
  for (const ing of ingredients) {
    const k = normalize(ing.name);
    if (!k) continue;
    if (pantry.has(k)) {
      pantryMentioned.push(ing);
      continue;
    }

    if (availSet.has(k)) {
      kept.push(ing);
      continue;
    }

    if (!extras.find((e) => normalize(e.name) === k)) {
      extras.push(ing);
    }
  }

  const limitedExtras = extras.slice(0, 3);

  // Kalau model tidak pakai bahan user sama sekali, paksa minimal 1-2 bahan user muncul.
  const ensuredUser = kept.length > 0 ? [] : pickMustUse(available);

  // "Pure AI": jangan auto-inject pantry staples. Tampilkan yang memang AI pilih,
  // hanya pastikan ada minimal 1-2 bahan dari kulkas agar tetap relevan.
  const mergedIngredients = uniqueIngredients([
    ...kept,
    ...ensuredUser,
    ...limitedExtras,
  ]);

  const instructions = Array.isArray(raw.instructions)
    ? raw.instructions.map((s: any) => (typeof s === "string" ? s.trim() : "")).filter(Boolean)
    : [];
  const ensuredInstructions =
    instructions.length >= 6
      ? instructions
      : [
          "Siapkan semua bahan dan peralatan masak.",
          "Cuci bahan segar, lalu potong sesuai kebutuhan.",
          "Panaskan minyak/air sesuai metode masak.",
          "Masukkan bumbu, tumis sampai harum.",
          "Masukkan bahan utama, masak sampai matang, koreksi rasa.",
          "Sajikan selagi hangat.",
        ];

  const matchPercentage = scoreMatch(available, mergedIngredients);

  return {
    name,
    description,
    prepTime: roundInt(raw.prepTime, 10),
    cookTime: roundInt(raw.cookTime, 15),
    servings: clamp(roundInt(raw.servings, 2), 1, 12),
    difficulty,
    calories: clamp(roundInt(raw.calories, 300), 50, 1200),
    ingredients: mergedIngredients,
    instructions: ensuredInstructions,
    matchPercentage,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
  };
}

function shorten(text: string, maxChars: number) {
  const s = (text || "").trim();
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(0, maxChars - 20)).trimEnd()}\n...\n[truncated]`;
}

function extractRecipeLikeLines(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const keep: string[] = [];
  const wanted = /(bahan|ingredients|cara|langkah|steps|cara membuat|petunjuk|instruksi|bumbu|marinasi|saus|sambal|takaran|porsi|waktu)/i;
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) continue;
    if (wanted.test(t) || t.startsWith("#") || t.startsWith("- ") || t.startsWith("1.")) {
      keep.push(t);
    }
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

  const main = params.ingredientNames[0] || "bahan";
  const diet =
    params.vegetarian ? "vegetarian" : params.halal ? "halal" : "non halal";
  const time = params.maxTime ? `${params.maxTime} menit` : "";
  const diff = params.difficulty ? `level ${params.difficulty}` : "";

  const query = `resep ${main} ${diet} ${diff} ${time}`.trim().replace(/\s+/g, " ");

  try {
    const firecrawl = new Firecrawl({ apiKey });
    const searchFn = (firecrawl as unknown as { search?: (q: string, o: any) => Promise<any> }).search;
    if (typeof searchFn !== "function") return null;

    const searchRes = await searchFn(query, {
      limit: 5,
      // scrapeOptions akan bikin Firecrawl langsung siapin markdown per result (kalau didukung).
      scrapeOptions: { formats: ["markdown"] },
      ignoreInvalidURLs: true,
      timeout: 30,
    });

    const data = Array.isArray(searchRes?.data) ? searchRes.data : Array.isArray(searchRes?.results) ? searchRes.results : [];
    const docs = data
      .map((d: any) => {
        const url = typeof d?.url === "string" ? d.url : "";
        const title = typeof d?.title === "string" ? d.title : "";
        const markdown = typeof d?.markdown === "string" ? d.markdown : typeof d?.data?.markdown === "string" ? d.data.markdown : "";
        if (!url || !markdown) return null;
        const extracted = extractRecipeLikeLines(markdown);
        return { url, title, extracted };
      })
      .filter(Boolean) as Array<{ url: string; title: string; extracted: string }>;

    if (!docs.length) return null;

    const joined = docs
      .slice(0, 4)
      .map((d, idx) => `Sumber ${idx + 1}: ${d.title ? `${d.title} - ` : ""}${d.url}\n${shorten(d.extracted, 1200)}`)
      .join("\n\n---\n\n");

    return shorten(joined, 3500);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let ingredients: InputIngredient[] = [];
  let mainIngredientRaw = "";
  let filters: any = {};

  try {
    const body = await req.json();
    ingredients = body.ingredients || [];
    mainIngredientRaw = typeof body.mainIngredient === "string" ? body.mainIngredient.trim() : "";
    filters = body.filters || {};

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 });
    }

    // Penting: kuantitas di inventory adalah "stok", bukan takaran resep.
    // Kalau kita kirim stok (mis. 5 kg jeruk), model sering menyalin jadi takaran resep dan hasilnya aneh.
    const ingredientNames = ingredients.map((ing: { name: string }) => ing.name).filter(Boolean);
    const ingredientNamesNorm = ingredientNames.map((n) => normalize(n));
    const mainIngredientNorm = mainIngredientRaw ? normalize(mainIngredientRaw) : "";
    const mainIngredient =
      mainIngredientNorm && ingredientNamesNorm.includes(mainIngredientNorm)
        ? ingredientNames[ingredientNamesNorm.indexOf(mainIngredientNorm)] || mainIngredientRaw
        : "";
    const ingredientList = ingredientNames.join(", ");

    const difficultyRule =
      filters?.difficulty === "easy"
        ? `- Tingkat kesulitan: mudah. Maksimal 8 langkah. Teknik dasar saja (tumis/goreng sederhana/rebus), tanpa proses panjang (tanpa fermentasi/ungkep lama), tanpa banyak komponen.`
        : filters?.difficulty === "medium"
          ? `- Tingkat kesulitan: sedang. 8–12 langkah. Boleh 1 proses tambahan (marinasi singkat, membuat sambal/saus sederhana, atau 2 komponen: lauk + pelengkap).`
          : filters?.difficulty === "hard"
            ? `- Tingkat kesulitan: sulit. 12–18 langkah. Boleh multi-proses (marinasi + saus + pelengkap), teknik lebih advanced (pepes/bakar dengan bumbu halus, kuah kompleks), dan manajemen timing.`
            : `- Tingkat kesulitan: bebas (sesuaikan agar tetap masuk akal).`;

    const vegetarianOn = Boolean(filters?.vegetarian);
    const halalOn = Boolean(filters?.halal);

    const dietRules = [
      vegetarianOn
        ? `- VEGETARIAN (WAJIB): Jangan gunakan daging/ayam/ikan/seafood/kaldu hewani/gelatin/lemak hewani. Protein boleh dari tahu, tempe, telur, jamur, kacang-kacangan. Jangan sebut bahan non-vegetarian bahkan sebagai opsi.`
        : `- VEGETARIAN: Tidak wajib (boleh pakai protein hewani bila cocok).`,
      halalOn
        ? `- HALAL (WAJIB): Jangan gunakan babi/ham/bacon/lard/gelatin babi, alkohol (arak/wine/beer), dan bahan turunan non-halal. Pastikan semua resep halal. Jangan sebut bahan non-halal bahkan sebagai opsi.`
        : `- HALAL: Tidak wajib. Boleh memasukkan resep non-halal (misalnya berbahan babi atau alkohol) jika cocok.`,
      !halalOn && !vegetarianOn
        ? `- Jika HALAL tidak wajib, buat setidaknya 1 resep yang jelas non-halal agar perbedaannya terlihat.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const variationKey =
      (globalThis.crypto && "randomUUID" in globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`);

    const webContext = await getWebRecipeContext({
      ingredientNames,
      difficulty: filters?.difficulty,
      maxTime: filters?.maxTime,
      vegetarian: vegetarianOn,
      halal: halalOn,
    });

    const selectedDifficulty = typeof filters?.difficulty === "string" ? filters.difficulty : "";
    const maxTimeValue = Number(filters?.maxTime) || 0;
    
    // Aturan waktu berdasarkan difficulty
    let timeRule = "";
    if (selectedDifficulty === "easy") {
      timeRule = "- Waktu total (prep + cook) MAKSIMAL 25 menit untuk resep mudah.";
    } else if (selectedDifficulty === "medium") {
      timeRule = "- Waktu total (prep + cook) 25-45 menit untuk resep tingkat sedang.";
    } else if (selectedDifficulty === "hard") {
      timeRule = "- Waktu total (prep + cook) MINIMAL 45 menit untuk resep sulit (bisa 60-120 menit).";
    }
    if (maxTimeValue > 0) {
      timeRule += ` WAJIB: Total waktu tidak boleh melebihi ${maxTimeValue} menit.`;
    }

    const hardExtra =
      selectedDifficulty === "hard"
        ? `\nAturan ekstra untuk SULIT:\n- Minimal 12 langkah dan harus ada multi-proses (contoh: marinasi + bumbu halus + saus/pelengkap).\n- Jangan berikan resep kategori super cepat seperti nasi goreng/omelet/telur dadar/tumis simpel/sup bening.\n- Resep sulit HARUS punya teknik kompleks: ungkep lalu bakar, bumbu halus + santan, atau proses lambat (rendang/gulai/opor).`
        : selectedDifficulty === "medium"
          ? `\nAturan untuk SEDANG:\n- 8-12 langkah dengan 1-2 proses tambahan (marinasi singkat, membuat sambal, atau lauk + pelengkap).\n- Boleh teknik bakar, rica-rica, atau nasi goreng spesial.`
          : selectedDifficulty === "easy"
            ? `\nAturan untuk MUDAH:\n- Maksimal 8 langkah, teknik dasar (tumis/goreng/rebus).\n- Tanpa proses panjang seperti marinasi atau ungkep.`
            : "";

    const prompt = `Buat 3-5 resep masakan Indonesia yang kreatif dan MASUK AKAL dari bahan yang tersedia (NAMA bahan saja, bukan takaran resep): ${ingredientList}

${mainIngredient ? `BAHAN UTAMA (WAJIB): Fokus mengolah "${mainIngredient}" sebagai bahan utama di semua resep.` : ""}
${mainIngredient ? `Jika bahan utama adalah protein hewani (ayam/sapi/ikan/dll), JANGAN campur dengan protein hewani lain (contoh: jika ayam, jangan pakai daging sapi/ikan).` : ""}

${filters?.difficulty ? `Tingkat kesulitan: ${filters.difficulty}` : ""}
${filters?.maxTime ? `Waktu maksimum: ${filters.maxTime} menit` : ""}
${dietRules}

${webContext ? `Referensi dari web (ringkas). Gunakan hanya sebagai inspirasi agar masakan lebih realistis. Jangan menyalin teks mentah:\n${webContext}\n` : ""}
${timeRule}
${hardExtra}

Aturan penting:
- Prioritaskan memakai bahan yang tersedia sebagai bahan utama. Jangan mengabaikan bahan tersedia.
- Jangan pakai semua bahan jika tidak cocok. Pilih kombinasi yang masuk akal untuk masakan tersebut.
- Takaran resep harus realistis untuk 2–4 porsi (jangan menyalin stok seperti 3kg/5kg). Gunakan angka wajar (contoh: 200 gram, 1 sdm, 1 sdt, 2 butir).
- Bahan resep harus sesuai dan masuk akal untuk masakan tersebut. Jangan memasukkan bahan yang tidak relevan.
- Tambahan bahan lain maksimal 3 item per resep (opsional).
- Langkah memasak wajib detail minimal 6 langkah.
- **PENTING**: Output HARUS berupa JSON yang valid. JANGAN gunakan kutip ganda (") atau enter (newline) di dalam teks value string JSON. Jangan sampai JSON terpotong di tengah jalan.
- **VARIASI WAJIB**: Setiap resep harus berbeda TEKNIK MASAK (jangan semua tumis/sup/omelet). Pilih teknik berbeda dari daftar ini tanpa mengulang: tumis, sup/kuah, goreng, bakar/panggang, kukus, pepes, semur, soto, balado, rica-rica, opor, gulai, perkedel/bakwan, nasi goreng, mie goreng/rebus.
- **FILTER PENTING**: Resep yang tidak sesuai tingkat kesulitan dan waktu akan DITOLAK. Pastikan prepTime dan cookTime realistis.
- Gunakan kunci variasi ini untuk menghasilkan kombinasi ide yang berbeda tiap request: ${variationKey}
${difficultyRule}

Jawab dalam format JSON persis seperti ini (HANYA JSON, jangan ada teks pembuka/penutup):
{
  "recipes": [
    {
      "name": "Nama Resep",
      "description": "Deskripsi singkat",
      "prepTime": 10,
      "cookTime": 20,
      "servings": 4,
      "difficulty": "easy",
      "calories": 350,
      "ingredients": [
        {"name": "Bahan", "quantity": 100, "unit": "gram"}
      ],
      "instructions": ["Langkah 1", "Langkah 2"],
      "matchPercentage": 85
    }
  ]
}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Kalau tidak ada API key sama sekali, langsung error yang jelas
    if (!geminiKey && !openaiKey) {
      return NextResponse.json(
        { 
          error: "API key belum dikonfigurasi. Silakan set GEMINI_API_KEY atau OPENAI_API_KEY di .env.local",
          hint: "Dapatkan Gemini API key di https://aistudio.google.com/apikey"
        },
        { status: 500 }
      );
    }

    let content: string | null = null;
    if (geminiKey) {
      // Model names sesuai dengan yang ada di Rate Limit dashboard
      // Gemini 2.5 Flash dan Gemini 3 Flash masih ada quota
      const modelsToTry = [
        "gemini-2.5-flash", // Model yang ada di dashboard (masih 2/5 RPM used)
        "gemini-3-flash", // Model yang ada di dashboard (masih 3/5 RPM used)
        "gemini-1.5-flash", // Fallback ke model stabil
      ];

      for (const model of modelsToTry) {
        try {
          content = await generateWithGemini(prompt, geminiKey, model);
          if (content) {
            console.log(`✅ Gemini success with model: ${model}`);
            break;
          }
        } catch (e: any) {
          console.warn(`❌ Gemini model ${model} failed:`, e?.message || e);
          // Continue to next model
        }
      }
    }
    if (!content && openaiKey) {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      content = await generateWithOpenAI(prompt, openaiKey, model);
    }
    if (!content) {
      // Error jika AI gagal total
      return NextResponse.json(
        { 
          error: "Gagal menghubungi AI. Periksa API key dan kuota Anda.",
          hint: geminiKey ? "Gemini API error - periksa quota/key" : "OpenAI API error - periksa quota/key"
        },
        { status: 500 }
      );
    }

    let parsed: { recipes?: any[] };
    try {
      // Membersihkan string JSON dari kemungkinan markdown atau teks tambahan
      let jsonStr = content.trim();
      
      // Hapus backticks markdown jika ada
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      // Cari kurung kurawal pertama dan terakhir untuk memastikan hanya mengambil objek JSON
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        jsonStr = jsonStr.substring(start, end + 1);
      }

      // Hapus trailing commas yang sering merusak JSON.parse
      // Regex ini mencari koma yang diikuti oleh whitespace dan penutup kurung } atau ]
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

      parsed = JSON.parse(jsonStr) as { recipes?: any[] };
    } catch (parseErr: any) {
      console.error("Recipe JSON parse failed:", parseErr?.message ?? parseErr, "RAW:", content.slice(0, 500));
      // Retry sekali dengan prompt "perbaiki JSON" (pakai provider yang tersedia)
      const fixPrompt = `${prompt}\n\nPENTING: Output kamu barusan bukan JSON valid. Ulangi jawaban HANYA dalam JSON valid sesuai schema tanpa teks tambahan.`;
      let fixed: string | null = null;
      if (openaiKey) {
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        fixed = await generateWithOpenAI(fixPrompt, openaiKey, model);
      } else if (geminiKey) {
        try {
          const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
          fixed = await generateWithGemini(fixPrompt, geminiKey, model);
        } catch {
          fixed = null;
        }
      }
      if (fixed) {
        try {
          let fixedStr = fixed.trim();
          if (fixedStr.startsWith("```")) {
            fixedStr = fixedStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          const m2 = fixedStr.indexOf('{');
          const e2 = fixedStr.lastIndexOf('}');
          if (m2 !== -1 && e2 !== -1) {
            fixedStr = fixedStr.substring(m2, e2 + 1);
          }
          fixedStr = fixedStr.replace(/,\s*([}\]])/g, "$1");
          parsed = JSON.parse(fixedStr) as { recipes?: any[] };
        } catch (e2) {
          console.error("Recipe JSON parse still failed after retry:", e2);
          return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters, mainIngredientRaw, webContext) });
        }
      } else {
        return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters, mainIngredientRaw, webContext) });
      }
    }

    const list = Array.isArray(parsed.recipes) ? parsed.recipes : [];
    const normalized = list.map((r) => normalizeRecipeOut(r, ingredients)).filter(Boolean) as RecipeOut[];
    if (normalized.length === 0) {
      return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters, mainIngredientRaw, webContext) });
    }

    // Enforce diet rules server-side (biar checkbox benar-benar berfungsi).
    let enforced = normalized;
    if (vegetarianOn) enforced = enforced.filter((r) => !violatesVegetarian(recipeToText(r)));
    if (halalOn) enforced = enforced.filter((r) => !violatesHalal(recipeToText(r)));

    // Enforce bahan utama + difficulty + waktu server-side.
    const maxTimeFilter = Number(filters?.maxTime) || undefined;
    
    if (mainIngredient) {
      enforced = enforced
        .filter((r) => recipeUsesMainIngredient(r, mainIngredient))
        .filter((r) => !recipeHasOtherProteins(r, mainIngredient));
    }
    
    // Filter berdasarkan difficulty DAN waktu maksimum
    if (selectedDifficulty || maxTimeFilter) {
      const beforeCount = enforced.length;
      enforced = enforced.filter((r) => difficultyPasses(r, selectedDifficulty, maxTimeFilter));
      
      // Kalau semua terfilter, override difficulty sesuai yang dipilih user
      if (enforced.length === 0 && selectedDifficulty) {
        enforced = normalized
          .filter((r) => !vegetarianOn || !violatesVegetarian(recipeToText(r)))
          .filter((r) => !halalOn || !violatesHalal(recipeToText(r)))
          .filter((r) => !mainIngredient || recipeUsesMainIngredient(r, mainIngredient))
          .filter((r) => !mainIngredient || !recipeHasOtherProteins(r, mainIngredient))
          .map((r) => ({ ...r, difficulty: selectedDifficulty as any }));
      }
    }

    const needsStrictRetry =
      enforced.length === 0 && (vegetarianOn || halalOn || Boolean(mainIngredient) || Boolean(selectedDifficulty));
    if (needsStrictRetry) {
      const timeConstraint = maxTimeValue > 0 ? `- Total waktu (prep + cook) TIDAK BOLEH melebihi ${maxTimeValue} menit.` : selectedDifficulty === "easy" ? "- Total waktu maksimal 25 menit." : selectedDifficulty === "medium" ? "- Total waktu 25-45 menit." : "- Total waktu minimal 45 menit.";
      
      const strictPrompt = `${prompt}

PENTING - RETRY DENGAN ATURAN LEBIH KETAT:
- Semua resep WAJIB patuh aturan diet (jika aktif).
${mainIngredient ? `- Semua resep WAJIB memasukkan bahan utama "${mainIngredient}" di daftar ingredients.` : ""}
${timeConstraint}
${selectedDifficulty === "hard" ? "- Mode SULIT: minimal 12 langkah, jangan resep cepat (nasi goreng/omelet/tumis), wajib multi-proses (ungkep+bakar, bumbu halus+santan)." : selectedDifficulty === "medium" ? "- Mode SEDANG: 8-12 langkah, boleh marinasi singkat atau buat sambal." : "- Mode MUDAH: maksimal 8 langkah, teknik dasar saja."}
Buang ide yang tidak patuh dan buat ulang dari nol.`;
      let strictContent: string | null = null;
      if (geminiKey) {
        const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
        strictContent = await generateWithGemini(strictPrompt, geminiKey, model);
      } else if (openaiKey) {
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        strictContent = await generateWithOpenAI(strictPrompt, openaiKey, model);
      }
      if (strictContent) {
        try {
          let strictStr = strictContent.trim();
          if (strictStr.startsWith("```")) {
            strictStr = strictStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          const ms = strictStr.indexOf('{');
          const es = strictStr.lastIndexOf('}');
          if (ms !== -1 && es !== -1) {
            strictStr = strictStr.substring(ms, es + 1);
          }
          strictStr = strictStr.replace(/,\s*([}\]])/g, "$1");
          
          const p2 = JSON.parse(strictStr) as { recipes?: any[] };
          const l2 = Array.isArray(p2.recipes) ? p2.recipes : [];
          const n2 = l2.map((r) => normalizeRecipeOut(r, ingredients)).filter(Boolean) as RecipeOut[];
          let e2 = n2;
          if (vegetarianOn) e2 = e2.filter((r) => !violatesVegetarian(recipeToText(r)));
          if (halalOn) e2 = e2.filter((r) => !violatesHalal(recipeToText(r)));
          if (mainIngredient) {
            e2 = e2
              .filter((r) => recipeUsesMainIngredient(r, mainIngredient))
              .filter((r) => !recipeHasOtherProteins(r, mainIngredient));
          }
          if (selectedDifficulty || maxTimeFilter) {
            e2 = e2.filter((r) => difficultyPasses(r, selectedDifficulty, maxTimeFilter));
            if (e2.length === 0 && selectedDifficulty) {
              e2 = n2
                .filter((r) => !vegetarianOn || !violatesVegetarian(recipeToText(r)))
                .filter((r) => !halalOn || !violatesHalal(recipeToText(r)))
                .filter((r) => !mainIngredient || recipeUsesMainIngredient(r, mainIngredient))
                .filter((r) => !mainIngredient || !recipeHasOtherProteins(r, mainIngredient))
                .map((r) => ({ ...r, difficulty: selectedDifficulty as any }));
            }
          }
          if (e2.length) enforced = e2;
        } catch (err) {
          console.error("Strict retry JSON parse failed:", err);
        }
      }
    }

    // Kalau halal tidak wajib dan vegetarian juga tidak wajib, usahakan ada 1 non-halal (kalau model tidak menghasilkan).
    if (!halalOn && !vegetarianOn) {
      const hasNonHalal = enforced.some((r) => violatesHalal(recipeToText(r)));
      if (!hasNonHalal) {
        // Tidak dipaksa keras, tapi tambahkan 1 "opsional" non-halal dengan prompt ulang kecil (kalau ada slot).
        // Kalau gagal, biarkan saja (lebih aman daripada bikin output aneh).
      }
    }

    return NextResponse.json({ recipes: enforced.slice(0, 8) });
  } catch (error: any) {
    console.error("Recipe generation error:", error);

    // Selalu return error, JANGAN fallback ke template
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat generate resep. Periksa API Key dan kuota Anda." },
      { status: 500 }
    );
  }
}
