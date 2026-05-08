import { NextRequest, NextResponse } from "next/server";
import Firecrawl from "@mendable/firecrawl-js";

export const runtime = "nodejs";

type ScrapeBody = {
  url?: string;
  formats?: Array<"markdown" | "html" | "links" | "rawHtml" | "summary">;
};

function isHttpUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FIRECRAWL_API_KEY belum diset" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as ScrapeBody | null;
  const url = body?.url?.trim() ?? "";
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
  }

  const formats = (Array.isArray(body?.formats) && body!.formats!.length ? body!.formats! : ["markdown"]) as any;

  const firecrawl = new Firecrawl({ apiKey });
  const result = await firecrawl.scrape(url, { formats });

  // Jangan pernah expose apiKey ke client; hanya return data hasil scrape.
  return NextResponse.json(result);
}

