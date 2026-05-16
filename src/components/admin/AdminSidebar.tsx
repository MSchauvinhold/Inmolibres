"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, User, ShieldCheck, ChevronRight, LogOut, MessageSquare } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";



const navItems = [
  { href: "/admin",                  label: "Panel",           icon: LayoutDashboard },
  { href: "/admin/inmobiliarias",    label: "Inmobiliarias",   icon: Building2 },
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
    <aside className={cn("flex flex-col w-64 h-full shrink-0 bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]", className)}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#DDD5C8]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--brand-primary)" }}
        >
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight text-[#1C1917]">InmoLibres</p>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
            style={{
              background: "rgba(139, 69, 19, 0.1)",
              color: "#8B4513",
              border: "1px solid rgba(139, 69, 19, 0.25)",
            }}
          >
            <ShieldCheck style={{ width: 9, height: 9 }} />
            SuperAdmin
          </span>
        </div>
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
              className={cn("sidebar-item group", active && "active")}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-80" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[#DDD5C8]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "var(--brand-primary)" }}
          >
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#1C1917] truncate">SuperAdmin</p>
            <p className="text-[10px] truncate" style={{ color: "#9C9590" }}>{email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-item w-full text-xs"
          style={{ color: "#5C5650" }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
