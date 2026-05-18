import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Moneda, TipoPropiedad, TipoOperacion, EstadoPropiedad, EstadoPipeline, OrigenLead, EstadoInmobiliaria } from "@prisma/client";

// ─── Tailwind Class Merger ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Money Formatting ────────────────────────────────────────────────────────

export function formatMonto(valor: number, moneda: "ARS" | "USD"): string {
  const numero = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
  return moneda === "USD" ? `US$ ${numero}` : `$ ${numero}`;
}

// ─── Price Formatting ─────────────────────────────────────────────────────────

export function formatPrice(
  price: number | string,
  moneda: Moneda = "USD",
  options?: { compact?: boolean }
): string {
  const num = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(num)) return "-";

  const symbol = moneda === "USD" ? "U$S" : "$";

  if (options?.compact && num >= 1_000_000) {
    return `${symbol} ${(num / 1_000_000).toFixed(1)}M`;
  }

  if (options?.compact && num >= 1_000) {
    return `${symbol} ${(num / 1_000).toFixed(0)}k`;
  }

  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

  return `${symbol} ${formatted}`;
}

export function formatPricePerM2(
  price: number | string,
  superficie: number,
  moneda: Moneda = "USD"
): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num) || superficie === 0) return "-";
  return formatPrice(num / superficie, moneda) + "/m²";
}

// ─── Slug Generation ──────────────────────────────────────────────────────────

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function generateUniqueSlug(base: string, suffix?: string): string {
  const slug = generateSlug(base);
  if (suffix) return `${slug}-${suffix}`;
  return `${slug}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  return formatDate(d);
}

export function getDaysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

export function getDaysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

// ─── Label Helpers ────────────────────────────────────────────────────────────

export const TIPO_PROPIEDAD_LABELS: Record<TipoPropiedad, string> = {
  CASA: "Casa",
  DEPARTAMENTO: "Departamento",
  LOCAL: "Local",
  GALPON: "Galpón",
  TERRENO: "Terreno",
  OFICINA: "Oficina",
};

export const TIPO_OPERACION_LABELS: Record<TipoOperacion, string> = {
  VENTA: "Venta",
  ALQUILER: "Alquiler",
  ALQUILER_TEMPORARIO: "Alquiler Temporario",
};

export const ESTADO_PROPIEDAD_LABELS: Record<EstadoPropiedad, string> = {
  DISPONIBLE: "Disponible",
  RESERVADA: "Reservada",
  ALQUILADA: "Alquilada",
  VENDIDA: "Vendida",
};

export const ESTADO_PIPELINE_LABELS: Record<EstadoPipeline, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  VISITA_AGENDADA: "Visita Agendada",
  SEGUNDA_VISITA: "2da Visita",
  CERRADO: "Cerrado",
  PERDIDO: "Perdido",
};

export const ORIGEN_LEAD_LABELS: Record<OrigenLead, string> = {
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  CONSULTA_LOCAL: "Consulta Local",
  REFERIDO: "Referido",
  PORTAL: "Portal",
  OTRO: "Otro",
};

export const ESTADO_INMOBILIARIA_LABELS: Record<EstadoInmobiliaria, string> = {
  ACTIVA: "Activa",
  INACTIVA: "Inactiva",
  PRUEBA: "En Prueba",
  SUSPENDIDA: "Suspendida",
};

// ─── WhatsApp Link Builder ────────────────────────────────────────────────────

export function buildWhatsAppLink(phone: string, message?: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const number = cleaned.startsWith("54") ? cleaned : `54${cleaned}`;
  const encoded = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${encoded}`;
}

// ─── Color Helpers for Status Badges ─────────────────────────────────────────

export const PIPELINE_COLORS: Record<EstadoPipeline, string> = {
  NUEVO: "bg-blue-100 text-blue-800",
  CONTACTADO: "bg-purple-100 text-purple-800",
  VISITA_AGENDADA: "bg-amber-100 text-amber-800",
  SEGUNDA_VISITA: "bg-orange-100 text-orange-800",
  CERRADO: "bg-green-100 text-green-800",
  PERDIDO: "bg-red-100 text-red-800",
};

export const ESTADO_PROPIEDAD_COLORS: Record<EstadoPropiedad, string> = {
  DISPONIBLE: "bg-green-100 text-green-800",
  RESERVADA: "bg-amber-100 text-amber-800",
  ALQUILADA: "bg-blue-100 text-blue-800",
  VENDIDA: "bg-gray-100 text-gray-600",
};

export const ESTADO_INMOBILIARIA_COLORS: Record<EstadoInmobiliaria, string> = {
  ACTIVA: "bg-green-100 text-green-800",
  INACTIVA: "bg-gray-100 text-gray-600",
  PRUEBA: "bg-blue-100 text-blue-800",
  SUSPENDIDA: "bg-red-100 text-red-800",
};

// ─── Area Formatting ──────────────────────────────────────────────────────────

export function formatArea(m2: number): string {
  return `${new Intl.NumberFormat("es-AR").format(m2)} m²`;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number
) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── Tenant Guard ─────────────────────────────────────────────────────────────

export function assertSameTenant(
  resourceInmobiliariaId: string,
  sessionInmobiliariaId: string | null | undefined,
  userRol: string
) {
  if (userRol === "SUPERADMIN") return;
  if (resourceInmobiliariaId !== sessionInmobiliariaId) {
    throw new Error("Acceso denegado: tenant mismatch");
  }
}
