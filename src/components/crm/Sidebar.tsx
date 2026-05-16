"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, CalendarCheck,
  FileText, MessageSquare, Settings, LogOut, ChevronRight, Calculator,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

const navItems = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/propiedades",   label: "Propiedades",  icon: Building2 },
  { href: "/clientes",      label: "Clientes",     icon: Users },
  { href: "/visitas",       label: "Visitas",      icon: CalendarCheck },
  { href: "/alquileres",    label: "Alquileres",   icon: FileText },
  { href: "/consultas",     label: "Consultas",    icon: MessageSquare },
  { href: "/calculadoras",  label: "Calculadoras", icon: Calculator },
  { href: "/configuracion", label: "Configuración",icon: Settings },
];

interface SidebarProps {
  user: SessionUser;
  className?: string;
}

export function Sidebar({ user, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col w-64 h-full shrink-0",
        "bg-[#F0EDE8] text-[var(--sidebar-text)]",
        "border-r border-[#DDD5C8]",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#DDD5C8]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-primary)" }}>
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight text-[#1C1917]">InmoLibres</p>
          {user.inmobiliariaNombre && (
            <p className="text-xs leading-tight truncate max-w-[140px]" style={{ color: "#5C5650" }}>
              {user.inmobiliariaNombre}
            </p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "sidebar-item group",
                active && "active"
              )}
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
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "var(--brand-primary)" }}>
            {user.nombre?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#1C1917] truncate">{user.nombre}</p>
            <p className="text-[10px] truncate" style={{ color: "#9C9590" }}>{user.rol}</p>
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
