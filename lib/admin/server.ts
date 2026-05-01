import { getSupabaseServerAdminClient } from "@/lib/supabase/server";

type AdminContext = {
  userId: string;
  email?: string;
};

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  return token || null;
}

function getRateLimitKey(request: Request, token: string | null) {
  const xf = request.headers.get("x-forwarded-for");
  const ip = xf ? xf.split(",")[0]?.trim() : "";
  return token ? `t:${token.slice(0, 24)}` : ip ? `ip:${ip}` : "unknown";
}

const g = globalThis as unknown as {
  __KB_ADMIN_RL__?: Map<string, { count: number; resetAt: number }>;
};

const RATE_LIMIT_STATE: Map<string, { count: number; resetAt: number }> = g.__KB_ADMIN_RL__ ?? new Map();
g.__KB_ADMIN_RL__ = RATE_LIMIT_STATE;

export function enforceAdminRateLimit(request: Request) {
  const limit = Math.max(1, Number(process.env.RATE_LIMIT_ADMIN ?? "100") || 100);
  const token = getBearerToken(request);
  const key = getRateLimitKey(request, token);
  const now = Date.now();
  const windowMs = 60_000;
  const entry = RATE_LIMIT_STATE.get(key);
  if (!entry || entry.resetAt <= now) {
    RATE_LIMIT_STATE.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (entry.count >= limit) {
    const err = new Error("Rate limit exceeded");
    (err as Error & { status?: number }).status = 429;
    throw err;
  }
  entry.count += 1;
  RATE_LIMIT_STATE.set(key, entry);
}

export async function requireAdmin(request: Request): Promise<AdminContext> {
  const token = getBearerToken(request);
  if (!token) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  const supabase = getSupabaseServerAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  const meta = (data.user.user_metadata as { role?: string } | null) ?? null;
  if (meta?.role !== "ADMIN") {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  return { userId: data.user.id, email: data.user.email ?? undefined };
}

export async function writeAdminAuditLog(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: unknown;
}) {
  const supabase = getSupabaseServerAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    details: params.details ?? null,
  });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("audit_logs")) return;
    if (msg.includes("does not exist") && msg.includes("audit_logs")) return;
    throw new Error(error.message);
  }
}
