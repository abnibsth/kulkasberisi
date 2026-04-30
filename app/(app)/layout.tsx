"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  LayoutGrid,
  Package,
  ChefHat,
  BarChart3,
  User,
  Plus,
  LogOut,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");

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
      const supabase = getSupabaseBrowserClient();
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
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
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

  return (
    <div className="min-h-screen bg-muted/20 flex">
      <aside className="w-72 shrink-0 border-r bg-background">
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
              K
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
