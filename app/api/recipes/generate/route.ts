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

function difficultyPasses(r: RecipeOut, selectedDifficulty: string | undefined) {
  const d = selectedDifficulty;
  if (!d) return true;
  const steps = Array.isArray(r.instructions) ? r.instructions.length : 0;
  const text = normalize(recipeToText(r));

  if (d === "easy") return steps > 0 && steps <= 8;
  if (d === "medium") return steps >= 8 && steps <= 12;
  if (d === "hard") {
    const easyDish = /(nasi goreng|omelet|telur dadar|tumis .*simpel|simpel|simple|quick|cepat)/i.test(text);
    return steps >= 12 && !easyDish;
  }
  return true;
}

function buildFallbackRecipes(available: InputIngredient[], filters: any, mainIngredientRaw?: string): RecipeOut[] {
  const availNames = new Set(available.map((i) => normalize(i.name)));
  
  let main = "bahan";
  if (mainIngredientRaw && availNames.has(normalize(mainIngredientRaw))) {
    main = mainIngredientRaw;
  } else if (availNames.has("bayam")) {
    main = "bayam";
  } else if (available[0]?.name) {
    main = available[0].name;
  }
  
  const veg = Boolean(filters?.vegetarian);

  // Randomize fallback recipes agar tidak selalu sama
  const randomOffset = Math.floor(Date.now() / 1000) % 5;
  
  const recipeTemplates = [
    {
      name: `Tumis ${main} Bawang Putih`,
      description: `Menu cepat dan simpel untuk mengolah ${main} agar tetap segar, gurih, dan tidak pahit.`,
      prepTime: 8,
      cookTime: 7,
      servings: 2,
      difficulty: "easy" as const,
      calories: 180,
      baseIngredients: [{ name: "cabai merah (opsional)", quantity: 1, unit: "buah" }],
      instructions: [
        `Cuci ${main} hingga bersih, tiriskan, lalu potong kasar bila perlu.`,
        "Iris bawang putih dan bawang merah. Iris cabai bila memakai.",
        "Panaskan minyak. Tumis bawang merah dan bawang putih sampai harum.",
        `Masukkan ${main}. Aduk cepat 1–2 menit agar tidak terlalu layu.`,
        "Bumbui dengan garam dan lada. Aduk rata, koreksi rasa.",
        "Matikan api. Sajikan hangat sebagai lauk atau pendamping nasi.",
      ],
    },
    {
      name: `Sup Bening ${main}`,
      description: `Sup ringan yang cocok untuk stok bahan minim. Kuah bening, segar, dan tetap mengenyangkan.`,
      prepTime: 10,
      cookTime: 15,
      servings: 3,
      difficulty: "easy" as const,
      calories: 220,
      baseIngredients: [{ name: "air", quantity: 700, unit: "ml" }, { name: "kaldu bubuk (opsional)", quantity: 0.5, unit: "sdt" }, { name: "wortel (opsional)", quantity: 1, unit: "buah" }],
      instructions: [
        "Siapkan panci. Tumis bawang putih dan bawang merah sebentar agar wangi.",
        "Tambahkan air. Didihkan.",
        "Jika memakai wortel, masukkan dulu dan masak sampai agak empuk.",
        `Masukkan ${main}. Masak 2–3 menit saja agar warnanya tetap hijau.`,
        "Bumbui garam, lada, dan kaldu bila memakai. Koreksi rasa.",
        "Sajikan sup bening hangat. Tambahkan perasan jeruk nipis bila suka.",
      ],
    },
    {
      name: `Omelet ${main} Simpel`,
      description: `Opsi cepat dan praktis. ${main} jadi lebih "berisi" dengan telur dan bumbu dasar.`,
      prepTime: 10,
      cookTime: 10,
      servings: 2,
      difficulty: "easy" as const,
      calories: 320,
      baseIngredients: [{ name: "telur", quantity: 2, unit: "butir" }],
      instructions: [
        `Cuci ${main}, tiriskan. Jika daun besar, iris kasar.`,
        "Kocok telur dalam mangkuk. Tambahkan garam dan lada.",
        `Masukkan ${main} ke dalam kocokan telur. Aduk rata.`,
        "Panaskan sedikit minyak di wajan anti lengket.",
        "Tuang adonan, masak api kecil sampai bagian bawah set.",
        "Balik omelet, masak sampai matang. Angkat dan sajikan.",
      ],
    },
    {
      name: `${main} Goreng Tepung`,
      description: `Resep crispy dan renyah. Cocok untuk camilan atau lauk pauk.`,
      prepTime: 15,
      cookTime: 10,
      servings: 3,
      difficulty: "easy" as const,
      calories: 280,
      baseIngredients: [{ name: "tepung terigu", quantity: 100, unit: "gram" }, { name: "tepung bumbu", quantity: 50, unit: "gram" }, { name: "air es", quantity: 100, unit: "ml" }],
      instructions: [
        `Cuci ${main}, potong sesuai selera.`,
        "Campur tepung terigu, tepung bumbu, dan air es hingga adonan kental.",
        `Celupkan ${main} ke adonan tepung hingga terlapis rata.`,
        "Panaskan minyak banyak dengan api sedang.",
        "Goreng hingga kuning keemasan dan crispy.",
        "Tiriskan dan sajikan hangat dengan sambal atau saus.",
      ],
    },
    {
      name: `Nasi Goreng ${main}`,
      description: `Nasi goreng sederhana dengan ${main} sebagai pelengkap bergizi.`,
      prepTime: 10,
      cookTime: 12,
      servings: 2,
      difficulty: "easy" as const,
      calories: 420,
      baseIngredients: [{ name: "nasi putih", quantity: 300, unit: "gram" }, { name: "kecap manis", quantity: 2, unit: "sdm" }, { name: "telur", quantity: 1, unit: "butir" }],
      instructions: [
        "Panaskan minyak, orak-arik telur hingga matang.",
        "Masukkan bawang putih dan bawang merah, tumis hingga harum.",
        "Tambahkan nasi putih, aduk rata dengan telur.",
        `Masukkan ${main}, aduk hingga layu.`,
        "Tambahkan kecap manis, garam, dan lada. Aduk hingga merata.",
        "Sajikan hangat dengan kerupuk dan acar.",
      ],
    },
    {
      name: `Gulai ${main} Spesial`,
      description: `Sajian kaya rempah dengan kuah santan kental yang gurih dan meresap sempurna.`,
      prepTime: 20,
      cookTime: 35,
      servings: 4,
      difficulty: "hard" as const,
      calories: 520,
      baseIngredients: [{ name: "santan kental", quantity: 200, unit: "ml" }, { name: "bumbu gulai jadi", quantity: 3, unit: "sdm" }, { name: "daun jeruk", quantity: 2, unit: "lembar" }],
      instructions: [
        `Cuci bersih ${main} dan potong sesuai selera.`,
        "Panaskan minyak, tumis bumbu gulai dan daun jeruk hingga harum dan matang.",
        `Masukkan ${main}, aduk hingga bumbu merata dan bahan berubah warna.`,
        "Tuangkan air secukupnya, masak dengan api sedang hingga bahan setengah empuk.",
        "Kecilkan api, tuang santan kental secara perlahan sambil terus diaduk agar santan tidak pecah.",
        "Bumbui dengan garam dan sedikit gula. Masak perlahan hingga kuah menyusut dan bumbu meresap (sekitar 30 menit).",
        "Koreksi rasa, angkat, dan sajikan dengan nasi hangat."
      ],
    },
    {
      name: `${main} Bakar Bumbu Rujak`,
      description: `Proses memasak multi-tahap (ungkep lalu bakar) menghasilkan bumbu karamelisasi yang luar biasa lezat.`,
      prepTime: 20,
      cookTime: 40,
      servings: 3,
      difficulty: "hard" as const,
      calories: 450,
      baseIngredients: [{ name: "bumbu dasar merah", quantity: 3, unit: "sdm" }, { name: "kecap manis", quantity: 3, unit: "sdm" }, { name: "air asam jawa", quantity: 1, unit: "sdm" }],
      instructions: [
        `Bersihkan ${main}. Siapkan wajan besar.`,
        "Tumis bumbu dasar merah hingga wangi. Masukkan air asam jawa dan kecap manis.",
        `Masukkan ${main} dan sedikit air. Ungkep dengan api kecil hingga air menyusut dan bumbu mengental menempel (sekitar 25 menit).`,
        "Panaskan alat panggangan atau teflon dengan sedikit minyak/mentega.",
        `Bakar ${main} yang sudah diungkep sambil diolesi sisa bumbu ungkep.`,
        "Panggang hingga terbentuk lapisan karamelisasi yang harum di kedua sisi.",
        "Sajikan selagi panas dengan sambal terasi."
      ],
    },
    {
      name: `Rica-Rica ${main} Pedas`,
      description: `Sajian pedas gurih dengan aroma daun aromatik yang khas dan menggugah selera.`,
      prepTime: 15,
      cookTime: 25,
      servings: 3,
      difficulty: "medium" as const,
      calories: 380,
      baseIngredients: [{ name: "cabai giling", quantity: 2, unit: "sdm" }, { name: "serai", quantity: 1, unit: "batang" }, { name: "daun salam", quantity: 2, unit: "lembar" }],
      instructions: [
        `Potong ${main} ukuran kecil agar cepat matang.`,
        "Panaskan minyak, tumis bawang putih, bawang merah, cabai giling, serai (geprek), dan daun salam hingga wangi.",
        `Masukkan ${main}. Aduk rata hingga terbalut bumbu.`,
        "Tambahkan sedikit air agar bumbu tidak gosong. Tutup wajan dan masak dengan api sedang.",
        "Biarkan hingga air menyusut dan minyak dari bumbu keluar.",
        "Bumbui dengan garam, lada, dan penyedap bila suka. Aduk rata lalu sajikan."
      ],
    },
  ];

  const isHalal = Boolean(filters?.halal);
  const isVeg = Boolean(filters?.vegetarian);
  const requestedDiff = filters?.difficulty;
  if (requestedDiff) {
    // Filter templates based on difficulty, but keep some fallback if none match
    const matchingTemplates = recipeTemplates.filter(t => t.difficulty === requestedDiff);
    if (matchingTemplates.length > 0) {
      // Ganti array utama dengan yang cocok, lalu biarkan logic random memilih dari sini
      recipeTemplates.length = 0;
      recipeTemplates.push(...matchingTemplates);
    }
  }

  if (!isHalal && !isVeg) {
    recipeTemplates.push({
      name: `Tumis ${main} Saus Angciu (Non-Halal)`,
      description: `Tumisan wangi dengan aroma khas dari angciu (arak masak) yang lezat namun tidak halal.`,
      prepTime: 10,
      cookTime: 8,
      servings: 2,
      difficulty: "medium" as const,
      calories: 350,
      baseIngredients: [{ name: "angciu (arak masak)", quantity: 2, unit: "sdm" }, { name: "kecap asin", quantity: 1, unit: "sdm" }],
      instructions: [
        `Cuci bersih ${main} dan potong sesuai selera.`,
        "Panaskan minyak, tumis bawang putih hingga wangi.",
        `Masukkan ${main}, aduk cepat dengan api besar.`,
        "Tuangkan angciu di pinggiran wajan agar aromanya keluar.",
        "Tambahkan kecap asin, garam, dan sedikit air. Masak hingga matang.",
        "Angkat dan sajikan segera."
      ]
    });
    
    recipeTemplates.push({
      name: `${main} Masak Lard (Non-Halal)`,
      description: `Resep gurih non-halal yang menumis bahan dengan menggunakan minyak babi (lard).`,
      prepTime: 10,
      cookTime: 10,
      servings: 2,
      difficulty: "medium" as const,
      calories: 420,
      baseIngredients: [{ name: "lard (minyak babi)", quantity: 2, unit: "sdm" }],
      instructions: [
        `Siapkan ${main} yang sudah dicuci bersih.`,
        "Lelehkan lard di wajan. Masukkan bawang putih, tumis sampai harum.",
        `Masukkan ${main}, masak sambil terus diaduk.`,
        "Bumbui dengan garam dan lada.",
        "Aduk rata sampai bumbu meresap sempurna.",
        "Angkat dan sajikan selagi panas."
      ]
    });
  }

  // Pilih 3-5 resep secara random dari template
  const startIndex = randomOffset % recipeTemplates.length;
  const count = 3 + (randomOffset % 3); // 3-5 recipes
  const selectedRecipes = [];
  
  // Jika tidak halal, paksa masukkan minimal 1 resep non-halal di awal agar terlihat bedanya
  let forcedNonHalal = false;
  if (!isHalal && !isVeg) {
    selectedRecipes.push(recipeTemplates[recipeTemplates.length - 1]);
    forcedNonHalal = true;
  }
  
  for (let i = 0; i < (forcedNonHalal ? count - 1 : count); i++) {
    const idx = (startIndex + i) % (recipeTemplates.length - (forcedNonHalal ? 2 : 0));
    const template = recipeTemplates[idx];
    selectedRecipes.push(template);
  }

  const recipes: RecipeOut[] = selectedRecipes.map((template) => ({
    name: template.name,
    description: template.description,
    prepTime: template.prepTime,
    cookTime: template.cookTime,
    servings: template.servings,
    difficulty: template.difficulty,
    calories: template.calories,
    // Fallback: jangan masukin semua bahan user (biar nggak ada bahan aneh ikut kebawa)
    ingredients: uniqueIngredients([
      ...(available.slice(0, 2) || []),
      ...pantryBase(),
      ...template.baseIngredients,
    ]),
    instructions: template.instructions,
    matchPercentage: scoreMatch(
      available,
      uniqueIngredients([
        ...(available.slice(0, 2) || []),
        ...pantryBase(),
        ...template.baseIngredients,
      ]),
    ),
  }));

  const maxTime = Number(filters?.maxTime);
  const filtered = Number.isFinite(maxTime) && maxTime > 0 ? recipes.filter((r) => r.prepTime + r.cookTime <= maxTime) : recipes;
  return filtered.length ? filtered : recipes.slice(0, 3);
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
    const hardExtra =
      selectedDifficulty === "hard"
        ? `\nAturan ekstra untuk SULIT:\n- Minimal 12 langkah dan harus ada multi-proses (contoh: marinasi + bumbu halus + saus/pelengkap).\n- Jangan berikan resep kategori super cepat seperti nasi goreng/omelet/telur dadar/tumis simpel.\n`
        : "";

    const prompt = `Buat 5-8 resep masakan Indonesia yang kreatif dan MASUK AKAL dari bahan yang tersedia (NAMA bahan saja, bukan takaran resep): ${ingredientList}

${mainIngredient ? `BAHAN UTAMA (WAJIB): Fokus mengolah "${mainIngredient}" sebagai bahan utama di semua resep.` : ""}
${mainIngredient ? `Jika bahan utama adalah protein hewani (ayam/sapi/ikan/dll), JANGAN campur dengan protein hewani lain (contoh: jika ayam, jangan pakai daging sapi/ikan).` : ""}

${filters?.difficulty ? `Tingkat kesulitan: ${filters.difficulty}` : ""}
${filters?.maxTime ? `Waktu maksimum: ${filters.maxTime} menit` : ""}
${dietRules}

${webContext ? `Referensi dari web (ringkas). Gunakan hanya sebagai inspirasi agar masakan lebih realistis. Jangan menyalin teks mentah:\n${webContext}\n` : ""}
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
- Gunakan kunci variasi ini untuk menghasilkan kombinasi ide yang berbeda tiap request: ${variationKey}
${difficultyRule}

Jawab dalam format JSON persis seperti ini:
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

    let content: string | null = null;
    if (geminiKey) {
      try {
        const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        content = await generateWithGemini(prompt, geminiKey, model);
      } catch (e) {
        // Kalau Gemini error (mis. model 404), jangan matiin fitur AI — coba OpenAI kalau tersedia.
        console.error("Gemini generate failed, fallback to OpenAI:", e);
        content = null;
      }
    }
    if (!content && openaiKey) {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      content = await generateWithOpenAI(prompt, openaiKey, model);
    }
    if (!content) {
      return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters, mainIngredientRaw) });
    }

    let parsed: { recipes?: any[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
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
          const m2 = fixed.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(m2 ? m2[0] : fixed) as { recipes?: any[] };
        } catch (e2) {
          console.error("Recipe JSON parse still failed after retry:", e2);
          return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters, mainIngredientRaw) });
        }
      } else {
        return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters, mainIngredientRaw) });
      }
    }

    const list = Array.isArray(parsed.recipes) ? parsed.recipes : [];
    const normalized = list.map((r) => normalizeRecipeOut(r, ingredients)).filter(Boolean) as RecipeOut[];
    if (normalized.length === 0) {
      return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters, mainIngredientRaw) });
    }

    // Enforce diet rules server-side (biar checkbox benar-benar berfungsi).
    let enforced = normalized;
    if (vegetarianOn) enforced = enforced.filter((r) => !violatesVegetarian(recipeToText(r)));
    if (halalOn) enforced = enforced.filter((r) => !violatesHalal(recipeToText(r)));

    // Enforce bahan utama + difficulty server-side.
    if (mainIngredient) {
      enforced = enforced
        .filter((r) => recipeUsesMainIngredient(r, mainIngredient))
        .filter((r) => !recipeHasOtherProteins(r, mainIngredient));
    }
    if (selectedDifficulty) {
      enforced = enforced
        .filter((r) => difficultyPasses(r, selectedDifficulty))
        .map((r) => ({ ...r, difficulty: selectedDifficulty as any }));
    }

    const needsStrictRetry =
      enforced.length === 0 && (vegetarianOn || halalOn || Boolean(mainIngredient) || Boolean(selectedDifficulty));
    if (needsStrictRetry) {
      const strictPrompt = `${prompt}

PENTING:
- Semua resep WAJIB patuh aturan diet (jika aktif).
${mainIngredient ? `- Semua resep WAJIB memasukkan bahan utama "${mainIngredient}" di daftar ingredients.` : ""}
${selectedDifficulty === "hard" ? "- Mode SULIT: minimal 12 langkah dan jangan resep cepat." : ""}
Buang ide yang tidak patuh dan buat ulang dari nol.`;
      let strictContent: string | null = null;
      if (geminiKey) {
        const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        strictContent = await generateWithGemini(strictPrompt, geminiKey, model);
      } else if (openaiKey) {
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        strictContent = await generateWithOpenAI(strictPrompt, openaiKey, model);
      }
      if (strictContent) {
        const m = strictContent.match(/\{[\s\S]*\}/);
        const p2 = JSON.parse(m ? m[0] : strictContent) as { recipes?: any[] };
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
        if (selectedDifficulty) {
          e2 = e2
            .filter((r) => difficultyPasses(r, selectedDifficulty))
            .map((r) => ({ ...r, difficulty: selectedDifficulty as any }));
        }
        if (e2.length) enforced = e2;
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
    
    // Jika user memakai API key, lebih baik tampilkan error daripada template palsu
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (geminiKey || openaiKey) {
      return NextResponse.json(
        { error: error?.message || "Terjadi kesalahan saat menghubungi AI. Pastikan API Key valid atau kuota mencukupi." },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters, mainIngredientRaw) });
  }
}
