"use client";

import { useEffect, type ReactNode } from "react";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";

export default function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) return;

    function setCookie(name: string, value: string, maxAgeSeconds: number) {
      const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
    }

    function clearCookie(name: string) {
      const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    }

    async function sync() {
      const result = await supabase?.auth.getSession();
      const session = result?.data?.session;
      if (!session) {
        clearCookie("kb_access_token");
        clearCookie("kb_role");
        return;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const maxAge = Math.max(60, Math.min(7 * 24 * 60 * 60, (session.expires_at ?? nowSeconds + 3600) - nowSeconds));
      const role = ((session.user.user_metadata as { role?: string } | null) ?? null)?.role ?? "USER";
      setCookie("kb_access_token", session.access_token, maxAge);
      setCookie("kb_role", role, maxAge);
    }

    void sync();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return children;
}
