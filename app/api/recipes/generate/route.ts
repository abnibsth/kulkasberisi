import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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
        maxOutputTokens: 2400,
        topP: 0.95,
        topK: 40,
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
    messages: [
      {
        role: "system",
        content:
          "Anda asisten chef yang menghasilkan resep masakan Indonesia. Jawab dalam bahasa Indonesia dan selalu keluarkan JSON yang valid.",
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

function scoreMatch(available: InputIngredient[], totalIngredients: InputIngredient[]) {
  const pct = Math.round((available.length / Math.max(1, totalIngredients.length)) * 100);
  return clamp(pct, 10, 95);
}

function buildFallbackRecipes(available: InputIngredient[], filters: any): RecipeOut[] {
  const availNames = new Set(available.map((i) => normalize(i.name)));
  const main = availNames.has("bayam") ? "bayam" : available[0]?.name || "bahan";
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
  ];

  // Pilih 3-5 resep secara random dari template
  const startIndex = randomOffset % recipeTemplates.length;
  const count = 3 + (randomOffset % 3); // 3-5 recipes
  const selectedRecipes = [];
  for (let i = 0; i < count; i++) {
    const idx = (startIndex + i) % recipeTemplates.length;
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
    ingredients: uniqueIngredients([...available, ...pantryBase(), ...template.baseIngredients]),
    instructions: template.instructions,
    matchPercentage: scoreMatch(available, uniqueIngredients([...available, ...pantryBase(), ...template.baseIngredients])),
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

  const mergedIngredients = uniqueIngredients([...available, ...ingredients, ...pantryBase()]);

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

  const matchPercentage =
    typeof raw.matchPercentage === "number"
      ? clamp(Math.round(raw.matchPercentage), 1, 100)
      : scoreMatch(available, mergedIngredients);

  return {
    name,
    description,
    prepTime: roundInt(raw.prepTime, 10),
    cookTime: roundInt(raw.cookTime, 15),
    servings: clamp(roundInt(raw.servings, 2), 1, 12),
    difficulty,
    calories: clamp(roundInt(raw.calories, 300), 50, 1200),
    ingredients: mergedIngredients.length >= 6 ? mergedIngredients : uniqueIngredients([...mergedIngredients, { name: "air", quantity: 200, unit: "ml" }]),
    instructions: ensuredInstructions,
    matchPercentage,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
  };
}

export async function POST(req: NextRequest) {
  let ingredients: InputIngredient[] = [];

  try {
    const body = await req.json();
    ingredients = body.ingredients || [];
    const filters = body.filters;

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 });
    }

    const ingredientList = ingredients
      .map((ing: { name: string; quantity: number; unit: string }) => `${ing.name} (${ing.quantity} ${ing.unit})`)
      .join(", ");

    const prompt = `Buat 5-8 resep kreatif dari bahan yang tersedia: ${ingredientList}

${filters?.difficulty ? `Tingkat kesulitan: ${filters.difficulty}` : ""}
${filters?.maxTime ? `Waktu maksimum: ${filters.maxTime} menit` : ""}
${filters?.vegetarian ? "Harus vegetarian" : ""}
${filters?.halal ? "Harus halal" : ""}

Aturan penting:
- Walaupun bahan tersedia sedikit (misal hanya 1), resep harus tetap masuk akal dengan menambahkan bahan dapur umum (contoh: bawang putih, bawang merah, garam, lada, minyak, air) dan maksimal 3 bahan tambahan opsional.
- Daftar bahan wajib minimal 6 item.
- Langkah memasak wajib detail minimal 6 langkah.
- **VARIASI WAJIB**: Setiap resep harus berbeda jenis masakannya (jangan semua tumis/sup/omelet). Contoh variasi: gorengan, pepes, soto, nasi goreng, mie, salad, sandwich, martabak, bakwan, perkedel, dll.
- **RANDOM**: Gunakan temperature tinggi untuk hasil lebih variatif dan tidak monoton.

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
      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      content = await generateWithGemini(prompt, geminiKey, model);
    } else if (openaiKey) {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      content = await generateWithOpenAI(prompt, openaiKey, model);
    } else {
      return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters) });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content) as { recipes?: any[] };
    const list = Array.isArray(parsed.recipes) ? parsed.recipes : [];
    const normalized = list.map((r) => normalizeRecipeOut(r, ingredients)).filter(Boolean) as RecipeOut[];
    if (normalized.length === 0) {
      return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, filters) });
    }

    return NextResponse.json({ recipes: normalized.slice(0, 8) });
  } catch (error) {
    console.error("Recipe generation error:", error);
    return NextResponse.json({ recipes: buildFallbackRecipes(ingredients, {}) });
  }
}
