import { createClient } from "@supabase/supabase-js";

async function findUserIdByEmail(supabase: any, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const u = (data.users ?? []).find((x: any) => (x.email ?? "").toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if ((data.users ?? []).length < 200) break;
  }
  return null;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Coba service_role key dulu (JWT panjang), fallback ke SUPABASE_SECRET_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Env kurang: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (service_role key dari Supabase Dashboard → Settings → API)");
  }

  const email = process.env.ADMIN_EMAIL || "admin@kulkasberisi.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const existingId = await findUserIdByEmail(supabase, email);
  if (existingId) {
    const { data: userData } = await supabase.auth.admin.getUserById(existingId);
    const prevMeta = (userData.user?.user_metadata as Record<string, unknown> | null) ?? {};
    // Update metadata DAN reset password sekaligus
    const { error } = await supabase.auth.admin.updateUserById(existingId, {
      password,
      user_metadata: { ...prevMeta, role: "ADMIN", name: prevMeta.name ?? "Super Admin" },
    });
    if (error) throw new Error(error.message);
    console.log(`✅ Admin user updated: ${email} (password reset, role=ADMIN)`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "ADMIN", name: "Super Admin" },
  });
  if (error) throw new Error(error.message);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.stack ?? e.message : String(e);
  process.stderr.write(msg + "\n");
  process.exit(1);
});
