import { db } from "@/lib/db";
import type { TipoNotificacion, Rol } from "@prisma/client";

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
    const hora = fechaHora.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      titulo: "Visita en las próximas 2 horas",
      mensaje: `Tenés una visita agendada a "${titulo}" a las ${hora}.`,
      url: "/visitas",
    };
  },

  contratoPorVencer(titulo: string, fechaFin: Date, dias: number) {
    return {
      titulo: `Contrato por vencer — ${dias} días`,
      mensaje: `El contrato de alquiler de "${titulo}" vence el ${fechaFin.toLocaleDateString("es-AR")}.`,
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
