"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, LayoutGrid, MessageSquareQuote, Shield, Users, Utensils } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/recipes", label: "Recipes", icon: Utensils, exact: false },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-full md:w-64 min-h-screen bg-white text-gray-900 flex flex-col border-r">
      <div className="px-5 py-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-gray-900">Admin Panel</div>
            <div className="text-xs text-muted-foreground leading-tight">Kulkas Berisi</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-gray-600 hover:bg-muted hover:text-gray-900",
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-primary-foreground" : "text-gray-500")} />
              <span>{item.label}</span>
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/80" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-200">
        <div className="text-xs text-muted-foreground">v1.0 · Kulkas Berisi</div>
      </div>
    </aside>
  );
}
