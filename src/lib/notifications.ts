import { db } from "@/lib/db";
import type { TipoNotificacion, Rol } from "@prisma/client";
import { formatDate, formatHora, formatFechaCalendario } from "@/lib/utils";

type CreateNotificacionInput = {
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  url?: string;
  referenciaId?: string;
};

// ─── Core: create a single notification ──────────────────────────────────────

export async function createNotificacion(input: CreateNotificacionInput) {
  return db.notificacion.create({ data: input });
}

// ─── Notify all users of an inmobiliaria ─────────────────────────────────────

export async function notifyInmobiliaria(
  inmobiliariaId: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  url?: string,
  rolesTarget?: Rol[],
  referenciaId?: string
) {
  const where = {
    inmobiliariaId,
    activo: true,
    ...(rolesTarget?.length ? { rol: { in: rolesTarget } } : {}),
  };

  const usuarios = await db.usuario.findMany({
    where,
    select: { id: true },
  });

  if (usuarios.length === 0) return;

  await db.notificacion.createMany({
    data: usuarios.map((u) => ({
      usuarioId: u.id,
      tipo,
      titulo,
      mensaje,
      url,
      referenciaId,
    })),
  });
}

// ─── Notify admin only ────────────────────────────────────────────────────────

export async function notifyAdmin(
  inmobiliariaId: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  url?: string
) {
  return notifyInmobiliaria(inmobiliariaId, tipo, titulo, mensaje, url, ["ADMIN"]);
}

// ─── Notify a specific agent ──────────────────────────────────────────────────

export async function notifyAgente(
  agenteId: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  url?: string
) {
  return createNotificacion({ usuarioId: agenteId, tipo, titulo, mensaje, url });
}

// ─── Limpieza automática ─────────────────────────────────────────────────────

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Cuánto viven las notificaciones. Sin esto se acumulaban para siempre.
 * - Leídas: 30 días.
 * - Cualquiera (aunque no se haya leído): 90 días.
 * - Avisos de visita próxima: 1 día — se crean como mucho 2 horas antes de la
 *   visita, así que al día siguiente ya no sirven para nada.
 */
export const RETENCION_NOTIFICACIONES = {
  leidasDias: 30,
  maximoDias: 90,
  visitaProximaDias: 1,
} as const;

/** Borra las notificaciones vencidas según `RETENCION_NOTIFICACIONES`. */
export async function limpiarNotificacionesViejas(ahora = new Date()) {
  const hace = (dias: number) => new Date(ahora.getTime() - dias * DIA_MS);
  const { count } = await db.notificacion.deleteMany({
    where: {
      OR: [
        { leida: true, createdAt: { lt: hace(RETENCION_NOTIFICACIONES.leidasDias) } },
        { createdAt: { lt: hace(RETENCION_NOTIFICACIONES.maximoDias) } },
        { tipo: "VISITA_PROXIMA", createdAt: { lt: hace(RETENCION_NOTIFICACIONES.visitaProximaDias) } },
      ],
    },
  });
  return count;
}

// ─── Pre-built notification messages ─────────────────────────────────────────

export const NotifMessages = {
  suscripcionDias(nombre: string, dias: number) {
    return {
      titulo: `Suscripción vence en ${dias} día${dias !== 1 ? "s" : ""}`,
      mensaje: `${nombre}, tu suscripción a InmoLibres vence en ${dias} día${dias !== 1 ? "s" : ""}. Renová para mantener tus publicaciones activas.`,
      url: "/configuracion",
    };
  },

  suscripcionVencida(nombre: string) {
    return {
      titulo: "Suscripción vencida",
      mensaje: `${nombre}, tu suscripción venció. Tus propiedades han sido despublicadas. Contactá a InmoLibres para renovar.`,
      url: "/suspendido",
    };
  },

  suscripcionSuspendida(nombre: string) {
    return {
      titulo: "Suscripción suspendida",
      mensaje: `${nombre}, tu suscripción fue suspendida y tus publicaciones fueron pausadas. Contactá a InmoLibres para regularizar tu situación y reactivar el acceso.`,
      url: "/suspendido",
    };
  },

  visitaProxima(titulo: string, fechaHora: Date) {
    // Fecha y hora ABSOLUTAS: la notificación queda guardada, y un "en 1 min"
    // calculado al crearla seguía diciendo lo mismo al día siguiente. El "hace X"
    // ya lo muestra la campanita a partir de createdAt.
    // En hora argentina explícita: el cron corre en UTC.
    const hora = formatHora(fechaHora);
    const diaSemana = formatDate(fechaHora, { weekday: "short", day: undefined, month: undefined, year: undefined });
    const diaMes = formatDate(fechaHora, { day: "numeric", month: "numeric", year: undefined });
    const dia = `${diaSemana} ${diaMes}`; // "vie 18/9"
    return {
      titulo: `Visita el ${dia} a las ${hora} — ${titulo}`,
      mensaje: `Tenés una visita agendada en "${titulo}" el ${dia} a las ${hora}`,
      url: "/visitas",
    };
  },

  contratoPorVencer(titulo: string, fechaFin: Date, dias: number) {
    const tiempoLabel =
      dias >= 60 ? `${Math.round(dias / 30)} meses`
      : dias === 30 ? "1 mes"
      : `${dias} días`;
    return {
      titulo: `Contrato por vencer en ${tiempoLabel} — ${titulo}`,
      mensaje: `El contrato de alquiler de "${titulo}" vence el ${formatFechaCalendario(fechaFin, { day: "numeric", month: "long", year: "numeric" })}.`,
      url: "/alquileres",
    };
  },

  pagoAtrasado(titulo: string) {
    return {
      titulo: "Pago de alquiler atrasado",
      mensaje: `El inquilino de "${titulo}" no ha pagado en la fecha acordada.`,
      url: "/alquileres",
    };
  },

  leadFrio(nombre: string) {
    return {
      titulo: "Lead sin contacto — más de 48hs",
      mensaje: `${nombre} no ha sido contactado en más de 48 horas. Hacé seguimiento.`,
      url: "/clientes",
    };
  },

  consultaNueva(titulo: string, visitante: string) {
    return {
      titulo: "Nueva consulta recibida",
      mensaje: `${visitante} consultó por "${titulo}" desde el marketplace.`,
      url: "/consultas",
    };
  },
} as const;
