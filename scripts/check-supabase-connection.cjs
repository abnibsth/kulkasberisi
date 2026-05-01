const fs = require("node:fs");
const path = require("node:path");

function loadDotEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const projectRoot = process.cwd();
  const envLocalPath = path.join(projectRoot, ".env.local");
  const envLocal = loadDotEnv(envLocalPath);

  const url = envLocal.SUPABASE_URL || envLocal.NEXT_PUBLIC_SUPABASE_URL || "";
  const secretKey = envLocal.SUPABASE_SECRET_KEY || "";
  const publishableKey = envLocal.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

  const hasUrl = Boolean(url);
  const hasSecret = Boolean(secretKey);
  const hasPublishable = Boolean(publishableKey);

  if (!hasUrl || !hasSecret) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          reason: "missing_env",
          env: {
            hasUrl,
            hasSecret,
            hasPublishable,
            hasNextPublicUrl: Boolean(envLocal.NEXT_PUBLIC_SUPABASE_URL),
            hasSupabaseUrl: Boolean(envLocal.SUPABASE_URL),
          },
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const checks = [];

  const storage = await supabase.storage.listBuckets();
  if (storage.error) {
    checks.push({ name: "storage.listBuckets", ok: false, error: storage.error.message });
  } else {
    checks.push({
      name: "storage.listBuckets",
      ok: true,
      bucketCount: Array.isArray(storage.data) ? storage.data.length : 0,
    });
  }

  const probe = await supabase.from("ingredients").select("id").limit(1);
  if (probe.error) {
    checks.push({ name: "from.ingredients.select", ok: false, error: probe.error.message });
  } else {
    checks.push({ name: "from.ingredients.select", ok: true, rowCount: (probe.data || []).length });
  }

  const anyOk = checks.some((c) => c.ok);
  console.log(
    JSON.stringify(
      {
        ok: anyOk,
        env: {
          hasUrl,
          hasSecret,
          hasPublishable,
          hasNextPublicUrl: Boolean(envLocal.NEXT_PUBLIC_SUPABASE_URL),
          hasSupabaseUrl: Boolean(envLocal.SUPABASE_URL),
        },
        checks,
      },
      null,
      2,
    ),
  );

  process.exit(anyOk ? 0 : 1);
}

main().catch((err) => {
  console.log(
    JSON.stringify(
      {
        ok: false,
        reason: "exception",
        error: err && err.message ? err.message : String(err),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
