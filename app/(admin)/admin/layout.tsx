"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/browser";
import { LogOut, Menu, X, Shield } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ok" | "forbidden">("loading");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) { if (!cancelled) setStatus("forbidden"); return; }
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        if (!cancelled) router.replace(`/login?next=${encodeURIComponent(pathname || "/admin")}`);
        return;
      }
      const role = ((session.user.user_metadata as { role?: string } | null) ?? null)?.role ?? "USER";
      if (!cancelled) setStatus(role === "ADMIN" ? "ok" : "forbidden");
    })();
    return () => { cancelled = true; };
  }, [pathname, router]);

  async function signOut() {
    const supabase = getSupabaseBrowserClientOrNull();
    await supabase?.auth.signOut();
    router.push("/login");
  }

  if (status === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center font-display" style={{ background: "#141210" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(196,181,253,0.3)", borderTopColor: "#c4b5fd" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Memuat panel admin...</p>
        </div>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 font-display" style={{ background: "#141210" }}>
        <div className="max-w-sm w-full p-8 rounded-3xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Shield className="h-6 w-6" style={{ color: "#f87171" }} strokeWidth={1.5} />
          </div>
          <div className="text-lg font-bold mb-2" style={{ color: "#ffffff" }}>Akses Ditolak</div>
          <div className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>Akun ini tidak memiliki izin admin.</div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push("/dashboard")}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
              Dashboard
            </button>
            <button onClick={signOut}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex font-display antialiased" style={{ background: "#FEFCF8" }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Sidebar — mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <AdminSidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="sticky top-0 z-30" style={{ background: "rgba(254,252,248,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 rounded-xl transition-colors hover:bg-black/5" onClick={() => setSidebarOpen(v => !v)}
                style={{ color: "#5a5550" }}>
                {sidebarOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
              </button>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)" }}>
                  <Shield className="h-3 w-3" style={{ color: "#8b5cf6" }} strokeWidth={1.5} />
                </div>
                <span className="font-semibold text-sm" style={{ color: "#141210" }}>Admin Panel</span>
              </div>
            </div>

            <button onClick={signOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#dc2626" }}>
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
