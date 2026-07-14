"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, User, ShieldCheck, ChevronRight, LogOut, MessageSquare, Users } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/crm/Logo";


const navItems = [
  { href: "/admin",                  label: "Panel",           icon: LayoutDashboard },
  { href: "/admin/inmobiliarias",    label: "Inmobiliarias",   icon: Building2 },
  { href: "/admin/usuarios",         label: "Usuarios",        icon: Users },
  { href: "/admin/particulares",     label: "Particulares",    icon: User },
  { href: "/admin/consultas-kai",    label: "Consultas Kai",   icon: MessageSquare },
];

interface AdminSidebarProps {
  email: string;
  className?: string;
}

export function AdminSidebar({ email, className }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn("flex flex-col w-64 h-full shrink-0", className)}
      style={{ background: "var(--antracita-900, #14110E)", color: "var(--crema-100, #F5EFE5)" }}
    >
      {/* Logo */}
      <div
        className="flex flex-col px-5 py-5 gap-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Logo variant="lockup" size={20} onDark />
        <span
          className="inline-flex items-center gap-1 self-start text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "var(--terracota-500, #C1694F)",
            color: "#fff",
            letterSpacing: "0.08em",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          <ShieldCheck style={{ width: 9, height: 9 }} />
          SUPERADMIN
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all", active ? "text-white" : "text-crema-300")}
              style={{
                background: active ? "rgba(193,105,79,0.18)" : "transparent",
                borderLeft: active ? "3px solid var(--terracota-500, #C1694F)" : "3px solid transparent",
                paddingLeft: active ? "calc(12px - 2px)" : "12px",
                color: active ? "white" : "rgba(255,255,255,0.6)",
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ opacity: active ? 1 : 0.7 }} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div
        className="px-3 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "var(--terracota-600, #A85737)" }}
          >
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">SuperAdmin</p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{email}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = "/login";
          }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-colors"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
