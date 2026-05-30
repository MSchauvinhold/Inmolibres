"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, CalendarCheck,
  ScrollText, MessageSquare, Settings, LogOut,
  Calculator, TrendingUp, BookUser, Lock,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { toPlanKey, tieneAcceso, nombrePlan } from "@/lib/planes";
import type { SessionUser } from "@/types";
import type { LucideIcon } from "lucide-react";

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

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permKey: string | null;
  /** Módulo requerido (de planes.ts). null = disponible en todos los planes */
  modulo: string | null;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operaciones",
    items: [
      { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard, permKey: null,             modulo: null },
      { href: "/propiedades", label: "Propiedades", icon: Building2,       permKey: "verPropiedades", modulo: "propiedades" },
      { href: "/contactos",   label: "Contactos",   icon: BookUser,        permKey: "verClientes",    modulo: "contactos" },
      { href: "/clientes",    label: "Prospectos",  icon: Users,           permKey: "verClientes",    modulo: "clientes" },
      { href: "/visitas",     label: "Visitas",     icon: CalendarCheck,   permKey: "verVisitas",     modulo: "visitas" },
    ],
  },
  {
    label: "Legal",
    items: [
      { href: "/alquileres",  label: "Contratos",   icon: ScrollText,      permKey: "verAlquileres",  modulo: "contratos" },
    ],
  },
  {
    label: "Comunicación",
    items: [
      { href: "/consultas",   label: "Mensajes",    icon: MessageSquare,   permKey: "verConsultas",   modulo: "consultas" },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/finanzas",    label: "Finanzas",    icon: TrendingUp,      permKey: "verFinanzas",     modulo: "finanzas" },
      { href: "/calculadoras",label: "Calculadoras",icon: Calculator,      permKey: "verCalculadoras", modulo: "calculadoras" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracion",label: "Configuración", icon: Settings,    permKey: null,              modulo: null },
    ],
  },
];

export function Sidebar({ user, permisos, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAgente = user.rol === "AGENTE";
  const plan = toPlanKey(user.plan ?? null);

  /** Un ítem está bloqueado si su módulo no está incluido en el plan actual */
  const isLocked = (item: NavItem) => {
    if (!item.modulo) return false;
    return !tieneAcceso(plan, item.modulo);
  };

  const isItemVisible = (item: NavItem) => {
    if (!item.permKey || !isAgente) return true;
    if (!permisos) return true;
    return permisos[item.permKey as keyof PermisosAgente] === true;
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const initial = user.nombre?.[0]?.toUpperCase() ?? "U";

  const planLabel = nombrePlan(user.plan ?? "AVANZADO");

  return (
    <aside
      className={cn(
        "flex flex-col w-64 h-full shrink-0",
        "border-r",
        className
      )}
      style={{ background: "var(--crema-100, #F5EFE5)", borderColor: "var(--border, #E8DFD0)" }}
    >
      {/* Logo + agencia */}
      <div
        className="px-4 py-4 border-b"
        style={{ borderColor: "var(--border, #E8DFD0)" }}
      >
        <Logo variant="compact" size={20} showSubtitle />
        {user.inmobiliariaNombre && (
          <div className="mt-3 flex flex-col gap-0.5">
            <span
              className="text-[12.5px] font-semibold leading-tight truncate max-w-[180px]"
              style={{ color: "var(--antracita-900, #14110E)" }}
            >
              {user.inmobiliariaNombre}
            </span>
            <span
              className="uppercase tracking-wider text-[10px]"
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                color: plan === "PRO" ? "var(--dorado-500, #C9A55C)" : "var(--antracita-300, #6F665C)",
                letterSpacing: "0.08em",
              }}
            >
              Plan {planLabel}
            </span>
          </div>
        )}
      </div>

      {/* Navegación agrupada */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <div
                className="px-2 pb-1 text-[10px] uppercase font-semibold tracking-[0.12em]"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  color: "var(--antracita-300, #6F665C)",
                }}
              >
                {group.label}
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  const locked = isLocked(item);
                  const Icon = item.icon;

                  if (locked) {
                    // Módulo bloqueado: visible pero con candado, redirige a /upgrade
                    return (
                      <button
                        key={item.href}
                        onClick={() => router.push("/upgrade")}
                        title="Disponible en plan Pro"
                        className="sidebar-item w-full text-left group"
                        style={{ opacity: 0.45, cursor: "pointer" }}
                      >
                        <Icon
                          className="w-[15px] h-[15px] shrink-0"
                          style={{ color: "var(--antracita-300, #6F665C)" }}
                        />
                        <span className="flex-1 text-[13px]">{item.label}</span>
                        <Lock
                          className="w-3 h-3 shrink-0"
                          style={{ color: "var(--antracita-300)" }}
                        />
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn("sidebar-item group", active && "active")}
                    >
                      <Icon
                        className="w-[15px] h-[15px] shrink-0"
                        style={{
                          color: active
                            ? "var(--terracota-500, #C1694F)"
                            : "var(--antracita-300, #6F665C)",
                        }}
                      />
                      <span className="flex-1 text-[13px]">{item.label}</span>
                      {item.badge && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[17px] text-center"
                          style={{
                            background: "var(--terracota-500, #C1694F)",
                            color: "#fff",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bloque de usuario */}
      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: "var(--border, #E8DFD0)" }}
      >
        <div
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1"
          style={{ background: "rgba(193,105,79,0.06)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "var(--antracita-700, #221E19)" }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[12.5px] font-semibold truncate leading-tight"
              style={{ color: "var(--antracita-900, #14110E)" }}
            >
              {user.nombre}
            </p>
            <p
              className="text-[10px] uppercase tracking-wider truncate"
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                color: "var(--antracita-300, #6F665C)",
                letterSpacing: "0.08em",
              }}
            >
              {user.rol}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = "/login";
          }}
          className="sidebar-item w-full text-xs"
          style={{ color: "var(--antracita-500, #3A332C)" }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
