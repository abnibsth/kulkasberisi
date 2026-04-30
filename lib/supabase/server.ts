import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase env belum di-set: SUPABASE_URL (atau NEXT_PUBLIC_SUPABASE_URL) dan SUPABASE_SECRET_KEY");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getSupabaseUserIdFromRequest(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (!token) return null;

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
