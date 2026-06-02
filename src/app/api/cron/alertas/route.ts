import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  notifyInmobiliaria,
  notifyAgente,
  NotifMessages,
} from "@/lib/notifications";

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
    const notif = NotifMessages.suscripcionDias(inmo.nombre, 7);
    await notifyInmobiliaria(inmo.id, "SUSCRIPCION_7_DIAS", notif.titulo, notif.mensaje, notif.url);
    results.suscripcion7d++;
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
    const notif = NotifMessages.suscripcionDias(inmo.nombre, 5);
    await notifyInmobiliaria(inmo.id, "SUSCRIPCION_5_DIAS", notif.titulo, notif.mensaje, notif.url);
    results.suscripcion5d++;
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
    const notif = NotifMessages.suscripcionDias(inmo.nombre, 2);
    await notifyInmobiliaria(inmo.id, "SUSCRIPCION_2_DIAS", notif.titulo, notif.mensaje, notif.url);
    results.suscripcion2d++;
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
    const notif = NotifMessages.suscripcionDias(inmo.nombre, 1);
    await notifyInmobiliaria(inmo.id, "SUSCRIPCION_24_HORAS", notif.titulo, notif.mensaje, notif.url);
    results.suscripcion24h++;
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
    const notif = NotifMessages.visitaProxima(visita.propiedad.titulo, visita.fechaHora);
    await notifyAgente(visita.agenteId, "VISITA_PROXIMA", notif.titulo, notif.mensaje, notif.url);
    await db.visita.update({ where: { id: visita.id }, data: { alertaEnviada: true } });
    results.visitasProximas++;
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
    const notif = NotifMessages.leadFrio(lead.nombre);
    await notifyAgente(lead.agenteId, "LEAD_FRIO", notif.titulo, notif.mensaje, notif.url);
    results.leadsFrios++;
  }

  return NextResponse.json({ ok: true, executedAt: now.toISOString(), results });
}
