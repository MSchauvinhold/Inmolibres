import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  notifyInmobiliaria,
  notifyAgente,
  NotifMessages,
} from "@/lib/notifications";
import { logSystemEvent } from "@/lib/system-log";

// Vercel sends GET to cron paths with Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    suscripcion7d: 0,
    suscripcion5d: 0,
    suscripcion2d: 0,
    suscripcion24h: 0,
    suscripcionVencida: 0,
    visitasProximas: 0,
    contratosPorVencer: 0,
    pagosAtrasados: 0,
    leadsFrios: 0,
  };

  const now = new Date();

  // ─── Day boundaries (midnight-aligned) ───────────────────────────────────────
  const hoy = new Date(now);
  hoy.setHours(0, 0, 0, 0);

  const enXDias = (x: number) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + x);
    return d;
  };

  // ─── 1. Suscripción — 7 días ──────────────────────────────────────────────────
  const inmo7d = await db.inmobiliaria.findMany({
    where: {
      estado: { in: ["ACTIVA", "PRUEBA"] },
      fechaVencimiento: { gte: enXDias(7), lt: enXDias(8) },
    },
    select: { id: true, nombre: true },
  });

  for (const inmo of inmo7d) {
    try {
      const notif = NotifMessages.suscripcionDias(inmo.nombre, 7);
      await notifyInmobiliaria(inmo.id, "SUSCRIPCION_7_DIAS", notif.titulo, notif.mensaje, notif.url);
      results.suscripcion7d++;
    } catch (e) {
      console.error("[cron/alertas] suscripcion7d", inmo.id, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló suscripcion7d para ${inmo.id}`, e);
    }
  }

  // ─── 2. Suscripción — 5 días ──────────────────────────────────────────────────
  const inmo5d = await db.inmobiliaria.findMany({
    where: {
      estado: { in: ["ACTIVA", "PRUEBA"] },
      fechaVencimiento: { gte: enXDias(5), lt: enXDias(6) },
    },
    select: { id: true, nombre: true },
  });

  for (const inmo of inmo5d) {
    try {
      const notif = NotifMessages.suscripcionDias(inmo.nombre, 5);
      await notifyInmobiliaria(inmo.id, "SUSCRIPCION_5_DIAS", notif.titulo, notif.mensaje, notif.url);
      results.suscripcion5d++;
    } catch (e) {
      console.error("[cron/alertas] suscripcion5d", inmo.id, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló suscripcion5d para ${inmo.id}`, e);
    }
  }

  // ─── 3. Suscripción — 2 días ──────────────────────────────────────────────────
  const inmo2d = await db.inmobiliaria.findMany({
    where: {
      estado: { in: ["ACTIVA", "PRUEBA"] },
      fechaVencimiento: { gte: enXDias(2), lt: enXDias(3) },
    },
    select: { id: true, nombre: true },
  });

  for (const inmo of inmo2d) {
    try {
      const notif = NotifMessages.suscripcionDias(inmo.nombre, 2);
      await notifyInmobiliaria(inmo.id, "SUSCRIPCION_2_DIAS", notif.titulo, notif.mensaje, notif.url);
      results.suscripcion2d++;
    } catch (e) {
      console.error("[cron/alertas] suscripcion2d", inmo.id, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló suscripcion2d para ${inmo.id}`, e);
    }
  }

  // ─── 4. Suscripción — 24 horas ────────────────────────────────────────────────
  const inmo24h = await db.inmobiliaria.findMany({
    where: {
      estado: { in: ["ACTIVA", "PRUEBA"] },
      fechaVencimiento: { gte: enXDias(1), lt: enXDias(2) },
    },
    select: { id: true, nombre: true },
  });

  for (const inmo of inmo24h) {
    try {
      const notif = NotifMessages.suscripcionDias(inmo.nombre, 1);
      await notifyInmobiliaria(inmo.id, "SUSCRIPCION_24_HORAS", notif.titulo, notif.mensaje, notif.url);
      results.suscripcion24h++;
    } catch (e) {
      console.error("[cron/alertas] suscripcion24h", inmo.id, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló suscripcion24h para ${inmo.id}`, e);
    }
  }

  // ─── 5. Suscripción vencida — suspender ───────────────────────────────────────
  const inmoVencidas = await db.inmobiliaria.findMany({
    where: {
      estado: { in: ["ACTIVA", "PRUEBA"] },
      fechaVencimiento: { lt: hoy },
    },
    select: { id: true, nombre: true },
  });

  for (const inmo of inmoVencidas) {
    try {
      await db.$transaction([
        db.inmobiliaria.update({
          where: { id: inmo.id },
          data: { estado: "SUSPENDIDA" },
        }),
        db.propiedad.updateMany({
          where: { inmobiliariaId: inmo.id },
          data: { publicada: false },
        }),
      ]);

      const notif = NotifMessages.suscripcionVencida(inmo.nombre);
      await notifyInmobiliaria(inmo.id, "SUSCRIPCION_VENCIDA", notif.titulo, notif.mensaje, notif.url);
      results.suscripcionVencida++;
    } catch (e) {
      console.error("[cron/alertas] suscripcionVencida", inmo.id, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló suscripcionVencida para ${inmo.id}`, e);
    }
  }

  // ─── 6. Visitas próximas (next 2h, not yet alerted) ──────────────────────────
  const en2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const visitasProximas = await db.visita.findMany({
    where: {
      estado: "PENDIENTE",
      alertaEnviada: false,
      fechaHora: { gte: now, lte: en2h },
    },
    include: {
      propiedad: { select: { titulo: true } },
    },
  });

  for (const visita of visitasProximas) {
    try {
      const notif = NotifMessages.visitaProxima(visita.propiedad.titulo, visita.fechaHora);
      await notifyAgente(visita.agenteId, "VISITA_PROXIMA", notif.titulo, notif.mensaje, notif.url);
      await db.visita.update({ where: { id: visita.id }, data: { alertaEnviada: true } });
      results.visitasProximas++;
    } catch (e) {
      console.error("[cron/alertas] visitasProximas", visita.id, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló visitasProximas para ${visita.id}`, e);
    }
  }

  // ─── 7. Contratos por vencer (30 días) ────────────────────────────────────────
  const en30d = enXDias(30);

  const contratosPorVencer = await db.contratoAlquiler.findMany({
    where: {
      fechaFin: { gte: hoy, lte: en30d },
    },
    include: {
      propiedad: { select: { titulo: true } },
      inmobiliaria: { select: { id: true } },
    },
  });

  for (const contrato of contratosPorVencer) {
    try {
      const diasRestantes = Math.ceil(
        (contrato.fechaFin.getTime() - hoy.getTime()) / 86_400_000
      );
      // Notificar a los 90, 60, 30, 15, 7, 3 y 1 días
      if ([90, 60, 30, 15, 7, 3, 1].includes(diasRestantes)) {
        const notif = NotifMessages.contratoPorVencer(
          contrato.propiedad.titulo,
          contrato.fechaFin,
          diasRestantes
        );
        await notifyInmobiliaria(
          contrato.inmobiliaria.id,
          "CONTRATO_POR_VENCER",
          notif.titulo,
          notif.mensaje,
          notif.url
        );
        results.contratosPorVencer++;
      }
    } catch (e) {
      console.error("[cron/alertas] contratosPorVencer", contrato.id, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló contratosPorVencer para ${contrato.id}`, e);
    }
  }

  // ─── 8. Pagos atrasados ────────────────────────────────────────────────────────
  // A payment is late when: contrato is active, estadoPago is AL_DIA,
  // and today's day-of-month is past the diaVencimientoPago
  const diaHoy = hoy.getDate();

  const contratosAtrasados = await db.contratoAlquiler.findMany({
    where: {
      estadoPago: "AL_DIA",
      fechaInicio: { lte: hoy },
      fechaFin: { gte: hoy },
      diaVencimientoPago: { lt: diaHoy },
    },
    include: {
      propiedad: { select: { titulo: true } },
      inmobiliaria: { select: { id: true } },
    },
  });

  for (const contrato of contratosAtrasados) {
    try {
      await db.contratoAlquiler.update({
        where: { id: contrato.id },
        data: { estadoPago: "ATRASADO" },
      });

      const notif = NotifMessages.pagoAtrasado(contrato.propiedad.titulo);
      await notifyInmobiliaria(
        contrato.inmobiliaria.id,
        "PAGO_ATRASADO",
        notif.titulo,
        notif.mensaje,
        notif.url
      );
      results.pagosAtrasados++;
    } catch (e) {
      console.error("[cron/alertas] pagosAtrasados", contrato.id, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló pagosAtrasados para ${contrato.id}`, e);
    }
  }

  // ─── 9. Leads fríos (sin actividad +48h) ─────────────────────────────────────
  const hace48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const leadsFrios = await db.cliente.findMany({
    where: {
      estadoPipeline: { in: ["NUEVO", "CONTACTADO"] },
      ultimaActividad: { lt: hace48h },
      agenteId: { not: null },
      inmobiliaria: { estado: { in: ["ACTIVA", "PRUEBA"] } },
    },
    select: {
      nombre: true,
      agenteId: true,
    },
  });

  for (const lead of leadsFrios) {
    if (!lead.agenteId) continue;
    try {
      const notif = NotifMessages.leadFrio(lead.nombre);
      await notifyAgente(lead.agenteId, "LEAD_FRIO", notif.titulo, notif.mensaje, notif.url);
      results.leadsFrios++;
    } catch (e) {
      console.error("[cron/alertas] leadsFrios", lead.agenteId, e);

      await logSystemEvent("ERROR", "cron/alertas", `Falló leadsFrios para ${lead.agenteId}`, e);
    }
  }

  // Log de "corrida OK" siempre, para que el panel de Monitoreo distinga
  // "no había nada que alertar" de "el cron dejó de correr".
  const totalAlertas = Object.values(results).reduce((a, b) => a + b, 0);
  await logSystemEvent(
    "INFO",
    "cron/alertas",
    `Corrida OK: ${totalAlertas} alerta(s) generada(s).`,
    results
  );

  return NextResponse.json({ ok: true, executedAt: now.toISOString(), results });
}
