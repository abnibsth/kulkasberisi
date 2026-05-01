import { NextResponse } from "next/server";
import { getSupabaseServerAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerAdminClient();
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, bucketCount: data?.length ?? 0 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Supabase ping gagal" },
      { status: 500 },
    );
  }
}
