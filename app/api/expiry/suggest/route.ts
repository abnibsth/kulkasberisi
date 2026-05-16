import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type SuggestRequest = {
  name?: string;
  category?: string;
  purchaseDate?: string;
  notes?: string;
};

type SuggestResponse = {
  expiryDate: string;
  minDays: number;
  maxDays: number;
  suggestedDays: number;
  method: "ai" | "heuristic";
  rationale: string;
};

function toIsoDate(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseBaseDate(purchaseDate?: string) {
  if (!purchaseDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
  const d = new Date(purchaseDate);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function clampDays(minDays: number, maxDays: number, suggestedDays: number) {
  const safeMin = Math.max(1, Math.floor(minDays));
  const safeMax = Math.max(safeMin, Math.floor(maxDays));
  const safeSuggested = Math.min(safeMax, Math.max(safeMin, Math.floor(suggestedDays)));
  return { minDays: safeMin, maxDays: safeMax, suggestedDays: safeSuggested };
}

function heuristicShelfLife(nameRaw: string, categoryRaw: string) {
  const name = nameRaw.toLowerCase().trim();
  const category = categoryRaw.toLowerCase().trim();

  const matchAny = (keywords: string[]) => keywords.some((k) => name.includes(k));

  if (category === "protein") {
    if (matchAny(["telur"])) return { minDays: 14, maxDays: 28, suggestedDays: 21, rationale: "Telur di kulkas biasanya tahan 2–4 minggu." };
    if (matchAny(["ikan", "udang", "seafood", "cumi"])) return { minDays: 1, maxDays: 2, suggestedDays: 1, rationale: "Protein laut cepat rusak di kulkas." };
    if (matchAny(["ayam"])) return { minDays: 1, maxDays: 2, suggestedDays: 2, rationale: "Ayam segar umumnya aman 1–2 hari di kulkas." };
    if (matchAny(["daging", "sapi", "kambing"])) return { minDays: 2, maxDays: 4, suggestedDays: 3, rationale: "Daging merah segar umumnya 2–4 hari di kulkas." };
    return { minDays: 1, maxDays: 3, suggestedDays: 2, rationale: "Protein segar umumnya 1–3 hari di kulkas." };
  }

  if (category === "dairy") {
    if (matchAny(["susu"])) return { minDays: 3, maxDays: 7, suggestedDays: 5, rationale: "Susu setelah dibuka biasanya 3–7 hari di kulkas." };
    if (matchAny(["yogurt", "yoghurt"])) return { minDays: 7, maxDays: 14, suggestedDays: 10, rationale: "Yogurt umumnya 1–2 minggu di kulkas." };
    if (matchAny(["keju"])) return { minDays: 14, maxDays: 28, suggestedDays: 21, rationale: "Keju umumnya lebih awet di kulkas." };
    return { minDays: 5, maxDays: 14, suggestedDays: 7, rationale: "Produk dairy umumnya 5–14 hari di kulkas." };
  }

  if (category === "sayur") {
    if (matchAny(["bayam", "kangkung", "selada", "sawi", "kemangi", "daun"])) return { minDays: 2, maxDays: 4, suggestedDays: 3, rationale: "Sayur daun cepat layu, biasanya 2–4 hari di kulkas." };
    if (matchAny(["wortel", "kentang", "bawang", "kol", "kubis"])) return { minDays: 7, maxDays: 21, suggestedDays: 14, rationale: "Sayur umbi/keras umumnya lebih awet." };
    if (matchAny(["tomat"])) return { minDays: 4, maxDays: 7, suggestedDays: 5, rationale: "Tomat biasanya 4–7 hari (tergantung matang)." };
    return { minDays: 3, maxDays: 7, suggestedDays: 5, rationale: "Sayur segar umumnya 3–7 hari di kulkas." };
  }

  if (category === "buah") {
    if (matchAny(["pisang"])) return { minDays: 2, maxDays: 5, suggestedDays: 3, rationale: "Pisang cepat matang, 2–5 hari (tergantung kematangan)." };
    if (matchAny(["apel", "pir"])) return { minDays: 10, maxDays: 21, suggestedDays: 14, rationale: "Buah seperti apel/pir relatif awet di kulkas." };
    if (matchAny(["jeruk"])) return { minDays: 7, maxDays: 14, suggestedDays: 10, rationale: "Jeruk biasanya 1–2 minggu di kulkas." };
    return { minDays: 4, maxDays: 10, suggestedDays: 7, rationale: "Buah segar umumnya 4–10 hari di kulkas." };
  }

  if (category === "bumbu") {
    if (matchAny(["cabai", "cabe"])) return { minDays: 7, maxDays: 14, suggestedDays: 10, rationale: "Cabai biasanya 1–2 minggu bila disimpan kering." };
    if (matchAny(["bawang"])) return { minDays: 14, maxDays: 30, suggestedDays: 21, rationale: "Bawang relatif awet." };
    return { minDays: 7, maxDays: 30, suggestedDays: 14, rationale: "Bumbu umumnya 1–4 minggu tergantung jenis." };
  }

  if (category === "karbohidrat") {
    if (matchAny(["nasi"])) return { minDays: 1, maxDays: 2, suggestedDays: 1, rationale: "Nasi matang sebaiknya 1–2 hari di kulkas." };
    if (matchAny(["roti"])) return { minDays: 3, maxDays: 7, suggestedDays: 5, rationale: "Roti biasanya 3–7 hari (tergantung jenis)." };
    return { minDays: 2, maxDays: 7, suggestedDays: 4, rationale: "Karbohidrat olahan umumnya 2–7 hari di kulkas." };
  }

  if (category === "minuman") {
    if (matchAny(["jus", "juice"])) return { minDays: 1, maxDays: 3, suggestedDays: 2, rationale: "Jus segar sebaiknya 1–3 hari di kulkas." };
    return { minDays: 3, maxDays: 7, suggestedDays: 5, rationale: "Minuman buatan rumah biasanya 3–7 hari." };
  }

  return { minDays: 3, maxDays: 10, suggestedDays: 7, rationale: "Perkiraan umum 3–10 hari tergantung penyimpanan." };
}

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
        temperature: 0.2,
        maxOutputTokens: 1000,
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

async function aiShelfLife(payload: { name: string; category: string; notes?: string }) {
  const prompt = [
    "Tugas: Prediksi rentang masa simpan bahan makanan di kulkas (Indonesia).",
    "Asumsi: disimpan di kulkas rumah tangga, wadah tertutup, kondisi segar saat dibeli, kecuali disebutkan.",
    "Jawab ringkas dalam JSON valid dengan schema:",
    '{ "minDays": number, "maxDays": number, "suggestedDays": number, "rationale": string }',
    `Bahan: ${payload.name}`,
    `Kategori: ${payload.category}`,
    payload.notes ? `Catatan: ${payload.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const content = await generateWithGemini(prompt, geminiKey, model);
      
      // Bersihkan format markdown (```json ... ```) jika ada
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      }
      
      // Fallback regex jika masih gagal
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      const finalJsonStr = jsonMatch ? jsonMatch[0] : cleanContent;
      
      console.log("Raw Response:", finalJsonStr);
      
      const parsed = JSON.parse(finalJsonStr) as {
        minDays?: number;
        maxDays?: number;
        suggestedDays?: number;
        rationale?: string;
      };
      if (
        typeof parsed.minDays === "number" &&
        typeof parsed.maxDays === "number" &&
        typeof parsed.suggestedDays === "number" &&
        typeof parsed.rationale === "string"
      ) {
        const clamped = clampDays(parsed.minDays, parsed.maxDays, parsed.suggestedDays);
        return { ...clamped, rationale: parsed.rationale };
      }
    } catch (e: any) {
      console.error("Gemini expiry prediction error:", e);
      throw e; // Throw so the POST route can catch it and return 500
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;

  const openai = new OpenAI({ apiKey: openaiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: "Anda ahli keamanan pangan. Jawab dalam bahasa Indonesia." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 300,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content) as { minDays?: number; maxDays?: number; suggestedDays?: number; rationale?: string };
  if (
    typeof parsed.minDays !== "number" ||
    typeof parsed.maxDays !== "number" ||
    typeof parsed.suggestedDays !== "number" ||
    typeof parsed.rationale !== "string"
  ) {
    return null;
  }

  const clamped = clampDays(parsed.minDays, parsed.maxDays, parsed.suggestedDays);
  return { ...clamped, rationale: parsed.rationale };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as SuggestRequest | null;
    const name = body?.name?.trim() ?? "";
    const category = body?.category?.trim() ?? "lainnya";

    if (!name) {
      return NextResponse.json({ error: "Nama bahan wajib diisi" }, { status: 400 });
    }

    const baseDate = parseBaseDate(body?.purchaseDate);
    const heuristic = heuristicShelfLife(name, category);

    const ai = await aiShelfLife({ name, category, notes: body?.notes });
    const chosen = ai ?? heuristic;
    const clamped = clampDays(chosen.minDays, chosen.maxDays, chosen.suggestedDays);
    const expiryDate = toIsoDate(addDays(baseDate, clamped.suggestedDays));

    const response: SuggestResponse = {
      expiryDate,
      minDays: clamped.minDays,
      maxDays: clamped.maxDays,
      suggestedDays: clamped.suggestedDays,
      method: ai ? "ai" : "heuristic",
      rationale: chosen.rationale,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("API Expiry Suggest Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses prediksi dengan AI. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
