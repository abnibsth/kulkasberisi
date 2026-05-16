"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClientOrNull, getSupabaseBrowserConfigError } from "@/lib/supabase/browser";
import { useAppStore } from "@/lib/store";
import {
  LayoutGrid,
  Package,
  ChefHat,
  BarChart3,
  User,
  Plus,
  LogOut,
  Bell,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const { ingredients, loadIngredients, loadSavedRecipes } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const navItems: NavItem[] = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, isActive: (p) => p === "/dashboard" },
      { href: "/bahan", label: "Bahan Saya", icon: Package, isActive: (p) => p.startsWith("/bahan") },
      { href: "/resep", label: "Resep", icon: ChefHat, isActive: (p) => p.startsWith("/resep") || p === "/generator" },
      { href: "/analitik", label: "Analitik", icon: BarChart3, isActive: (p) => p.startsWith("/analitik") },
      { href: "/profil", label: "Profil", icon: User, isActive: (p) => p.startsWith("/profil") },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClientOrNull();
      if (!supabase) {
        if (!cancelled) router.replace("/login");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!cancelled && user) {
        const meta = (user.user_metadata as { name?: string } | null) ?? null;
        setEmail(user.email ?? "");
        setName(meta?.name ?? "");
      }
      try {
        await loadIngredients();
        await loadSavedRecipes();
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
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
        const diffTime = expiry.getTime() - now.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { id: i.id || `${i.name}-${i.expiryDate}`, name: i.name, category: i.category, days };
      })
      .filter(Boolean) as { id: string; name: string; category: string; days: number }[];
    list.sort((a, b) => a.days - b.days);
    return list;
  }, [ingredients]);

  const expired = useMemo(() => expiringItems.filter((i) => i.days < 0), [expiringItems]);
  const soon = useMemo(() => expiringItems.filter((i) => i.days >= 0 && i.days <= 2), [expiringItems]);
  const notifCount = expired.length + soon.length;
  const notifBadge = notifCount > 9 ? "9+" : String(notifCount);

  useEffect(() => {
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = notifRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [notifOpen]);

  return (
    <div className="min-h-screen bg-muted/20 flex">
      <aside className="w-72 shrink-0 border-r bg-background">
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
              <Image src="/logo.png" alt="KulkasBerisi Logo" width={40} height={40} className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate">KulkasBerisi</div>
              <div className="text-xs text-muted-foreground truncate">Dari Kulkas ke Meja Makan</div>
            </div>
          </div>

          <nav className="mt-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const active = item.isActive(pathname);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 ${active ? "" : "text-muted-foreground"}`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6">
            <Link href="/bahan/tambah">
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Bahan
              </Button>
            </Link>
          </div>

          <div className="mt-auto pt-4">
            <div className="rounded-xl border bg-background p-3">
              <div className="text-sm font-semibold truncate">{name || "User"}</div>
              <div className="text-xs text-muted-foreground truncate">{email || "-"}</div>
              <Button variant="outline" className="w-full mt-3" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b bg-background">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold truncate">{pageTitle}</div>
              <div className="text-xs text-muted-foreground truncate">
                {pathname}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pathname !== "/scanner" && (
                <Link href="/scanner">
                  <Button variant="outline">Scan</Button>
                </Link>
              )}
              <div className="relative" ref={notifRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const sb = getSupabaseBrowserClientOrNull();
                    if (!sb) return;
                    setNotifOpen((v) => !v);
                  }}
                  aria-label="Notifikasi kadaluarsa"
                >
                  <Bell className="h-4 w-4" />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] leading-5 text-center">
                      {notifBadge}
                    </span>
                  )}
                </Button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[360px] z-50">
                    <Card className="shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base">Notifikasi</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setNotifOpen(false)}>
                            Tutup
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {!notifCount ? (
                          <div className="text-sm text-muted-foreground">Tidak ada bahan yang mendekati kadaluarsa.</div>
                        ) : (
                          <div className="space-y-4">
                            {expired.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-destructive">Expired ({expired.length})</div>
                                <div className="space-y-2">
                                  {expired.slice(0, 5).map((i) => (
                                    <div key={i.id} className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{i.name}</div>
                                        <div className="text-xs text-muted-foreground capitalize">{i.category}</div>
                                      </div>
                                      <div className="text-xs text-destructive shrink-0">Expired</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {soon.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-amber-700">Mau kadaluarsa ({soon.length})</div>
                                <div className="space-y-2">
                                  {soon.slice(0, 5).map((i) => (
                                    <div key={i.id} className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{i.name}</div>
                                        <div className="text-xs text-muted-foreground capitalize">{i.category}</div>
                                      </div>
                                      <div className="text-xs text-amber-700 shrink-0">
                                        {i.days === 0 ? "Hari ini" : `H-${i.days}`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Link href="/bahan" className="flex-1" onClick={() => setNotifOpen(false)}>
                            <Button variant="secondary" className="w-full">
                              Lihat di Bahan
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={async () => {
                              const sb = getSupabaseBrowserClientOrNull();
                              if (!sb) {
                                setNotifOpen(false);
                                return;
                              }
                              try {
                                await loadIngredients();
                              } catch {
                              }
                            }}
                          >
                            Refresh
                          </Button>
                        </div>
                        {!getSupabaseBrowserClientOrNull() && (
                          <div className="text-xs text-destructive">{getSupabaseBrowserConfigError()}</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
              {pathname !== "/generator" && (
                <Link href="/generator">
                  <Button variant="secondary">Generate Resep</Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <div className="container mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
