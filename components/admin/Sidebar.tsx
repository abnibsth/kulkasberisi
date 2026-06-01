"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutGrid, MessageSquareQuote, Shield, Users } from "lucide-react";

const NAV = [
  { href: "/admin",           label: "Dashboard", icon: LayoutGrid,          exact: true  },
  { href: "/admin/users",     label: "Users",     icon: Users,               exact: false },
  { href: "/admin/reviews",   label: "Reviews",   icon: MessageSquareQuote,  exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3,           exact: false },
] as const;

const navActive   = { background: "rgba(212,233,226,0.18)", border: "1px solid rgba(212,233,226,0.25)", color: "#d4e9e2" } as React.CSSProperties;
const navInactive = { background: "transparent", border: "1px solid transparent", color: "rgba(255,255,255,0.50)" } as React.CSSProperties;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen flex flex-col font-display" style={{ background: "#1E3932", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="h-9 w-9 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(212,233,226,0.15)", border: "1px solid rgba(212,233,226,0.22)" }}>
          <Shield className="h-4.5 w-4.5" style={{ color: "#d4e9e2" }} strokeWidth={1.5} />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight" style={{ color: "#ffffff" }}>Admin Panel</div>
          <div className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.3)" }}>Kulkas Berisi</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150"
              style={active ? navActive : navInactive}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "#d4e9e2" }} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>v1.0 · Kulkas Berisi Admin</div>
      </div>
    </aside>
  );
}
