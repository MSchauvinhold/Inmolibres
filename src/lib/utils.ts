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

/**
 * Zona horaria del negocio. Va explícita en todo formateo de instantes: el
 * servidor (Vercel) corre en UTC y el navegador en hora argentina, así que sin
 * esto la misma fecha se ve distinta según dónde se renderice — y entre las 21 y
 * las 24 hs cae en el día siguiente.
 */
export const TZ_AR = "America/Argentina/Buenos_Aires";

/**
 * Node y los navegadores traen versiones distintas de ICU: para el mismo formato
 * uno separa "a. m." con espacio duro (U+00A0 / U+202F) y el otro con espacio
 * común. Se ven iguales pero no lo son, y en un componente cliente eso rompe la
 * hidratación ("server rendered text didn't match").
 */
function espaciosComunes(s: string): string {
  return s.replace(/[\u00A0\u202F]/g, " ");
}

/**
 * Instante (createdAt, hora de una visita, "hoy") → fecha en hora argentina.
 * Para fechas de calendario (vencimientos, inicio/fin de contrato, cierres) usar
 * `formatFechaCalendario`: esas se guardan a las 00:00 UTC.
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return espaciosComunes(d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ_AR,
    ...options,
  }));
}

/**
 * Fecha de calendario (vencimiento de suscripción, inicio/fin de contrato, fecha
 * de cierre…): se carga desde un input date y queda a las 00:00 UTC. Leída en
 * hora argentina caería a las 21:00 del día ANTERIOR, así que se formatea en UTC.
 * Mismo formato por defecto que `formatDate` (DD/MM/AAAA).
 */
export function formatFechaCalendario(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatDate(date, { timeZone: "UTC", ...options });
}

/** Hora de un instante (ej. una visita) en hora argentina: "10:00 a. m." */
export function formatHora(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return espaciosComunes(d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ_AR,
  }));
}

/**
 * Las fechas de operaciones y egresos son fechas de calendario (vienen de inputs
 * date) y se guardan como medianoche UTC. Formatearlas con toLocaleDateString()
 * las convierte a hora local y en Argentina (UTC-3) muestran el día ANTERIOR:
 * un egreso del 01/08 se veía como "31/7". Formateamos en UTC para que se lea
 * la fecha que el usuario cargó.
 */
export function fmtFechaUTC(fechaStr: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(fechaStr).toLocaleDateString("es-AR", { timeZone: "UTC", ...opts });
}

/**
 * Fecha y hora de un instante, en hora argentina. `options` reemplaza el formato
 * por defecto (no se mezcla: `dateStyle`/`timeStyle` no se combinan con `day`…).
 */
export function formatDateTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return espaciosComunes(d.toLocaleString("es-AR", {
    timeZone: TZ_AR,
    ...(options ?? {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
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
  ALQUILER_TEMPORARIO: "Alquiler temporario",
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
  VISITA_AGENDADA: "Visita agendada",
  SEGUNDA_VISITA: "Segunda visita",
  CERRADO: "Cerrado",
  PERDIDO: "Perdido",
};

export const ORIGEN_LEAD_LABELS: Record<OrigenLead, string> = {
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  CONSULTA_LOCAL: "Consulta local",
  REFERIDO: "Referido",
  PORTAL: "Portal",
  OTRO: "Otro",
};

export const ESTADO_VISITA_LABELS: Record<"PENDIENTE" | "REALIZADA" | "CANCELADA", string> = {
  PENDIENTE: "Pendiente",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
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

/**
 * Compara dos teléfonos ignorando formato (espacios, guiones, +54, 0 inicial, etc.)
 * comparando los últimos 8 dígitos — suficiente para identificar el mismo número
 * local sin depender de que el prefijo de país/área se haya cargado igual en
 * ambos lugares. Se usa para cruzar Consultas (sin login) con Clientes/Contactos
 * por teléfono, ya que no hay una relación formal entre esas tablas.
 */
export function telefonosCoinciden(a: string, b: string): boolean {
  const da = a.replace(/\D/g, "");
  const db_ = b.replace(/\D/g, "");
  if (da.length < 6 || db_.length < 6) return da === db_;
  return da.slice(-8) === db_.slice(-8);
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
  resourceInmobiliariaId: string | null,
  sessionInmobiliariaId: string | null | undefined,
  userRol: string
) {
  if (userRol === "SUPERADMIN") return;
  if (resourceInmobiliariaId !== sessionInmobiliariaId) {
    throw new Error("Acceso denegado: tenant mismatch");
  }
}
