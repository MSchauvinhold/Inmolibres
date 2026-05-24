"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, CalendarCheck,
  ScrollText, MessageSquare, Settings, LogOut, ChevronRight,
  Calculator, TrendingUp, BookUser,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

interface PermisosAgente {
  verPropiedades: boolean;
  verClientes: boolean;
  verVisitas: boolean;
  verAlquileres: boolean;
  verConsultas: boolean;
  verCalculadoras: boolean;
  verFinanzas: boolean;
}

interface SidebarProps {
  user: SessionUser;
  permisos?: PermisosAgente | null;
  className?: string;
}

const ALL_NAV = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard, permKey: null },
  { href: "/propiedades",   label: "Propiedades",  icon: Building2,       permKey: "verPropiedades" },
  { href: "/contactos",     label: "Contactos",    icon: BookUser,        permKey: "verClientes" },
  { href: "/clientes",      label: "Prospectos",   icon: Users,           permKey: "verClientes" },
  { href: "/visitas",       label: "Visitas",      icon: CalendarCheck,   permKey: "verVisitas" },
  { href: "/alquileres",    label: "Contratos",    icon: ScrollText,      permKey: "verAlquileres" },
  { href: "/consultas",     label: "Mensajes",     icon: MessageSquare,   permKey: "verConsultas" },
  { href: "/calculadoras",  label: "Calculadoras", icon: Calculator,      permKey: "verCalculadoras" },
  { href: "/finanzas",      label: "Finanzas",     icon: TrendingUp,      permKey: "verFinanzas" },
  { href: "/configuracion", label: "Configuración",icon: Settings,        permKey: null },
] as const;

const PARTICULAR_NAV_HREFS = new Set(["/dashboard", "/propiedades", "/contactos", "/clientes", "/visitas", "/consultas"]);

export function Sidebar({ user, permisos, className }: SidebarProps) {
  const pathname = usePathname();
  const isAgente = user.rol === "AGENTE";
  const isParticular = user.rol === "PARTICULAR";

  const navItems = ALL_NAV.filter(({ href, permKey }) => {
    if (isParticular) return PARTICULAR_NAV_HREFS.has(href);
    if (!permKey || !isAgente) return true;
    if (!permisos) return true;
    return permisos[permKey as keyof PermisosAgente] === true;
  });

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
        <div>
          <p className="font-semibold text-sm leading-tight text-[#1C1917]">Inmo<span style={{ color: "#8B4513" }}>Libres</span></p>
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
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "var(--brand-primary)" }}>
            {user.nombre?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#1C1917] truncate">{user.nombre}</p>
            <p className="text-[10px] truncate" style={{ color: "#9C9590" }}>{user.rol}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = "/login";
          }}
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
