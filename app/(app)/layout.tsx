"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";
import { useAppStore } from "@/lib/store";
import { LayoutGrid, Package, ChefHat, BarChart3, User, Plus, LogOut, Bell, ScanLine, X } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  isActive: (pathname: string) => boolean;
};

// ── Starbucks sidebar tokens (House Green #1E3932)
const S = {
  sidebar:     { background: "#1E3932", borderRight: "1px solid rgba(255,255,255,0.06)" } as React.CSSProperties,
  sidebarNav:  { color: "rgba(255,255,255,0.55)" } as React.CSSProperties,
  navActive:   { background: "rgba(212,233,226,0.15)", border: "1px solid rgba(212,233,226,0.20)", color: "#d4e9e2" } as React.CSSProperties,
  navInactive: { background: "transparent", border: "1px solid transparent", color: "rgba(255,255,255,0.55)" } as React.CSSProperties,
  mainBg:      { background: "#f2f0eb" } as React.CSSProperties,
  headerBorder:{ borderBottom: "1px solid rgba(0,117,74,0.10)", background: "rgba(242,240,235,0.95)", backdropFilter: "blur(12px)" } as React.CSSProperties,
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { ingredients, loadIngredients, loadSavedRecipes } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const navItems: NavItem[] = useMemo(() => [
    { href: "/dashboard", label: "Dashboard",   icon: LayoutGrid, isActive: (p) => p === "/dashboard" },
    { href: "/bahan",     label: "Bahan Saya",  icon: Package,    isActive: (p) => p.startsWith("/bahan") },
    { href: "/resep",     label: "Resep",        icon: ChefHat,    isActive: (p) => p.startsWith("/resep") || p === "/generator" },
    { href: "/analitik",  label: "Analitik",     icon: BarChart3,  isActive: (p) => p.startsWith("/analitik") },
    { href: "/profil",    label: "Profil",        icon: User,       isActive: (p) => p.startsWith("/profil") },
  ], []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) { if (!cancelled) router.replace("/login"); return; }
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!cancelled && user) {
        const meta = (user.user_metadata as { name?: string } | null) ?? null;
        setEmail(user.email ?? "");
        setName(meta?.name ?? "");
      }
      try { await loadIngredients(); await loadSavedRecipes(); } catch {}
    })();
    return () => { cancelled = true; };
  }, [loadIngredients, loadSavedRecipes, router]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/");
  };

  const pageTitle = useMemo(() => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/bahan")) return "Bahan";
    if (pathname === "/generator") return "Generator Resep";
    if (pathname.startsWith("/resep")) return "Resep";
    if (pathname.startsWith("/analitik")) return "Analitik";
    if (pathname.startsWith("/profil")) return "Profil";
    if (pathname.startsWith("/scanner")) return "Scan Barcode";
    return "Kulkas Berisi";
  }, [pathname]);

  const expiringItems = useMemo(() => {
    const now = new Date();
    const list = ingredients
      .map((i) => {
        if (!i.expiryDate) return null;
        const expiry = new Date(i.expiryDate);
        if (Number.isNaN(expiry.getTime())) return null;
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { id: i.id || `${i.name}-${i.expiryDate}`, name: i.name, category: i.category, days };
      })
      .filter(Boolean) as { id: string; name: string; category: string; days: number }[];
    list.sort((a, b) => a.days - b.days);
    return list;
  }, [ingredients]);

  const expired = useMemo(() => expiringItems.filter((i) => i.days < 0), [expiringItems]);
  const soon    = useMemo(() => expiringItems.filter((i) => i.days >= 0 && i.days <= 2), [expiringItems]);
  const notifCount = expired.length + soon.length;
  const notifBadge = notifCount > 9 ? "9+" : String(notifCount);

  useEffect(() => { setNotifOpen(false); setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && e.target instanceof Node && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [notifOpen]);

  const initials = (name || email || "U").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "U";

  const SidebarContent = () => (
    <div className="h-full flex flex-col p-5">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-2 py-1 mb-6 group">
        <Image src="/logo.png" alt="Kulkas Berisi" width={32} height={32} className="rounded-xl group-hover:scale-105 transition-transform" />
        <div>
          <div className="font-bold text-sm leading-tight" style={{ color: "#ffffff" }}>Kulkas <span style={{ color: "#d4e9e2" }}>Berisi</span></div>
          <div className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>From fridge to table</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150"
              style={active ? S.navActive : S.navInactive}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Quick add */}
      <div className="mt-5">
        <Link href="/bahan/tambah"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "rgba(212,233,226,0.15)", border: "1px solid rgba(212,233,226,0.22)", color: "#d4e9e2" }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Tambah Bahan
        </Link>
      </div>

      {/* Divider */}
      <div className="my-5" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Scanner shortcut */}
      <Link href="/scanner"
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150"
        style={pathname.startsWith("/scanner") ? S.navActive : S.navInactive}
      >
        <ScanLine className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        Scan Barcode
      </Link>

      {/* User card at bottom */}
      <div className="mt-auto pt-5">
        <div className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(212,233,226,0.18)", border: "1px solid rgba(212,233,226,0.25)", color: "#d4e9e2" }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.8)" }}>{name || "User"}</div>
              <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{email || "-"}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(252,165,165,0.9)" }}
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex font-display antialiased" style={S.mainBg}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col" style={S.sidebar}>
        <SidebarContent />
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      <div className={`lg:hidden fixed inset-0 z-50 flex transition-all duration-300 ${sidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
          style={{ background: "rgba(30,57,50,0.55)" }}
          onClick={() => setSidebarOpen(false)}
        />
        {/* Sidebar drawer */}
        <aside
          className={`relative w-72 flex flex-col h-full transition-transform duration-300 ease-[var(--ease-premium)] ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={S.sidebar}
        >
          <SidebarContent />
        </aside>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-40" style={S.headerBorder}>
          <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl transition-colors hover:bg-green-900/5" style={{ color: "#33433d" }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <div>
                <div className="font-bold text-base leading-tight" style={{ color: "#006241", letterSpacing: "-0.01em" }}>{pageTitle}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pathname !== "/scanner" && (
                <Link href="/scanner"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                  style={{ color: "#33433d", border: "1px solid rgba(0,117,74,0.15)" }}
                >
                  <ScanLine className="h-3.5 w-3.5" strokeWidth={1.5} /> Scan
                </Link>
              )}

              {/* Notif bell */}
              <div className="relative" ref={notifRef}>
                <button type="button" onClick={() => setNotifOpen(v => !v)}
                  className="relative flex items-center justify-center h-9 w-9 rounded-xl transition-colors"
                  style={{ border: "1px solid rgba(0,117,74,0.15)", color: "#33433d" }}
                >
                  <Bell className="h-4 w-4" strokeWidth={1.5} />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold leading-4 text-center text-white"
                      style={{ background: "#ef4444" }}>
                      {notifBadge}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl overflow-hidden"
                    style={{ background: "rgba(242,240,235,0.98)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,117,74,0.12)", boxShadow: "0 20px 60px rgba(30,57,50,0.16)" }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(0,117,74,0.08)" }}>
                      <div className="font-semibold text-sm" style={{ color: "#006241", letterSpacing: "-0.01em" }}>Notifikasi</div>
                      <button onClick={() => setNotifOpen(false)} className="rounded-lg p-1 transition-colors" style={{ color: "#33433d" }}>
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
                      {!notifCount ? (
                        <p className="text-sm text-center py-4" style={{ color: "#a09890" }}>Tidak ada bahan mendekati kadaluarsa.</p>
                      ) : (
                        <>
                          {expired.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#ef4444" }}>Expired ({expired.length})</div>
                              {expired.slice(0, 5).map(i => (
                                <div key={i.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.06)" }}>
                                  <div className="text-sm font-medium truncate" style={{ color: "#1E3932" }}>{i.name}</div>
                                  <span className="text-xs shrink-0 font-medium" style={{ color: "#ef4444" }}>Expired</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {soon.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#b45309" }}>Segera Kadaluarsa ({soon.length})</div>
                              {soon.slice(0, 5).map(i => (
                                <div key={i.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl" style={{ background: "rgba(245,158,11,0.06)" }}>
                                  <div className="text-sm font-medium truncate" style={{ color: "#1E3932" }}>{i.name}</div>
                                  <span className="text-xs shrink-0 font-medium" style={{ color: "#b45309" }}>{i.days === 0 ? "Hari ini" : `H-${i.days}`}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Link href="/bahan" onClick={() => setNotifOpen(false)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-colors active:scale-95"
                          style={{ background: "#00754A", color: "#ffffff", borderRadius: "50px" }}>
                          Lihat di Bahan
                        </Link>
                        <button onClick={async () => { try { await loadIngredients(); } catch {} }}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors active:scale-95"
                          style={{ border: "1px solid rgba(0,117,74,0.2)", color: "#00754A", borderRadius: "50px" }}>
                          Refresh
                        </button>
                      </div>
                      {!getSupabaseBrowserClientOrNull() && (
                        <p className="text-xs" style={{ color: "#ef4444" }}>{getSupabaseBrowserConfigError()}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {pathname !== "/generator" && (
                <Link href="/generator"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 text-white"
                  style={{ borderRadius: "50px", background: "#00754A", boxShadow: "0 2px 8px rgba(0,117,74,0.25)", letterSpacing: "-0.01em" }}
                >
                  <ChefHat className="h-3.5 w-3.5" strokeWidth={1.5} /> Generate Resep
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0">
          <div key={pathname} className="max-w-6xl mx-auto px-4 md:px-6 py-6 animate-page-transition">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
