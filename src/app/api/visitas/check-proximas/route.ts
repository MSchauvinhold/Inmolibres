import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { notifyAgente, NotifMessages } from "@/lib/notifications";

/**
 * Chequeo en vivo de visitas próximas.
 * Lo llama el cliente periódicamente (mientras el usuario tiene la app abierta)
 * para cubrir el hueco del cron, que en plan Hobby solo corre 1 vez al día.
 *
 * Busca visitas PENDIENTES de la inmobiliaria dentro de las próximas 2 horas
 * que todavía no fueron alertadas, crea la notificación al agente y marca
 * alertaEnviada=true para no duplicar.
 */
export async function POST() {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  const now  = new Date();
  const en2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const visitas = await db.visita.findMany({
    where: {
      inmobiliariaId,
      estado: "PENDIENTE",
      alertaEnviada: false,
      fechaHora: { gte: now, lte: en2h },
    },
    include: { propiedad: { select: { titulo: true } } },
  });

  let creadas = 0;
  for (const visita of visitas) {
    const notif = NotifMessages.visitaProxima(visita.propiedad.titulo, visita.fechaHora);
    await notifyAgente(visita.agenteId, "VISITA_PROXIMA", notif.titulo, notif.mensaje, notif.url);
    await db.visita.update({ where: { id: visita.id }, data: { alertaEnviada: true } });
    creadas++;
  }

  return NextResponse.json({ ok: true, creadas });
}
