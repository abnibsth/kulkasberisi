import { NextResponse, type NextRequest } from "next/server";

function getTokenFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return req.cookies.get("kb_access_token")?.value ?? null;
}

async function isAdminFromRequest(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) return false;

  const token = getTokenFromRequest(req);
  if (!token) return false;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return false;
  const user = (await res.json().catch(() => null)) as { user_metadata?: { role?: string } } | null;
  return user?.user_metadata?.role === "ADMIN";
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const token = getTokenFromRequest(req);
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    const ok = await isAdminFromRequest(req);
    if (!ok) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  if (req.nextUrl.pathname.startsWith("/api/admin/")) {
    const ok = await isAdminFromRequest(req);
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
