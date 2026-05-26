import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visitaSchema, actualizarVisitaSchema } from "@/lib/validations/visit";
import { notifyAgente, NotifMessages } from "@/lib/notifications";
import { buildPaginationMeta } from "@/lib/utils";
import { requireCrmAuth, isNextResponse } from "@/lib/api-auth";
import type { Prisma, EstadoVisita } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireCrmAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const estado = searchParams.get("estado") as EstadoVisita | null;
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");
  const agenteId = searchParams.get("agenteId");

  const where: Prisma.VisitaWhereInput = rol === "PARTICULAR"
    ? { agenteId: userId }
    : { inmobiliariaId: inmobiliariaId! };

  if (rol === "AGENTE") {
    where.agenteId = userId;
  } else if (rol !== "PARTICULAR" && agenteId) {
    where.agenteId = agenteId;
  }

  if (estado) where.estado = estado;

  if (fechaDesde || fechaHasta) {
    where.fechaHora = {};
    if (fechaDesde) (where.fechaHora as Prisma.DateTimeFilter).gte = new Date(fechaDesde);
    if (fechaHasta) (where.fechaHora as Prisma.DateTimeFilter).lte = new Date(fechaHasta);
  }

  const skip = (page - 1) * pageSize;

  try {
    const [total, visitas] = await Promise.all([
      db.visita.count({ where }),
      db.visita.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { fechaHora: "asc" },
        include: {
          propiedad: { select: { id: true, titulo: true, direccion: true, slug: true } },
          cliente: { select: { id: true, nombre: true, telefono: true } },
          agente: { select: { id: true, nombre: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: visitas,
      meta: buildPaginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener visitas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireCrmAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;
  const isParticular = rol === "PARTICULAR";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = visitaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // SEGURIDAD: verificar que propiedadId pertenezca a la inmobiliaria autenticada
    // Para PARTICULAR se permite cualquier propiedad pública; para CRM se restringe al tenant
    const propiedad = await db.propiedad.findFirst({
      where: {
        id: parsed.data.propiedadId,
        ...(isParticular ? {} : { inmobiliariaId: inmobiliariaId! }),
      },
      select: { id: true },
    });
    if (!propiedad) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    // SEGURIDAD: verificar que clienteId pertenezca al tenant (solo para CRM, no PARTICULAR)
    if (!isParticular && parsed.data.clienteId) {
      const cliente = await db.cliente.findFirst({
        where: { id: parsed.data.clienteId, inmobiliariaId: inmobiliariaId! },
        select: { id: true },
      });
      if (!cliente) {
        return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
      }
    }

    // SEGURIDAD: para PARTICULAR, forzar agenteId = propio userId (evita suplantación)
    const agenteIdFinal = isParticular ? userId : parsed.data.agenteId;

    const visita = await db.visita.create({
      data: {
        ...parsed.data,
        agenteId: agenteIdFinal,
        fechaHora: new Date(parsed.data.fechaHora),
        inmobiliariaId: isParticular ? null : inmobiliariaId!,
      },
      include: {
        propiedad: { select: { id: true, titulo: true } },
        cliente: { select: { id: true, nombre: true } },
        agente: { select: { id: true, nombre: true } },
      },
    });

    // Solo notificar de inmediato si la visita es en las próximas 2 horas
    // (el cron /api/cron/alertas se encarga del resto)
    const ahora = new Date();
    const en2h = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    if (visita.fechaHora >= ahora && visita.fechaHora <= en2h) {
      const notif = NotifMessages.visitaProxima(
        visita.propiedad.titulo,
        visita.fechaHora
      );
      await notifyAgente(visita.agenteId, "VISITA_PROXIMA", notif.titulo, notif.mensaje, notif.url);
      await db.visita.update({ where: { id: visita.id }, data: { alertaEnviada: true } });
    }

    return NextResponse.json({ data: visita }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear visita" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireCrmAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Se requiere 'id' en query string" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = actualizarVisitaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await db.visita.findUnique({
      where: { id },
      select: { inmobiliariaId: true, agenteId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    }
    if (rol === "PARTICULAR") {
      if (existing.agenteId !== userId) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
    } else {
      if (existing.inmobiliariaId !== inmobiliariaId) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
      if (rol === "AGENTE" && existing.agenteId !== userId) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
    }

    const updateData = {
      ...(parsed.data.estado !== undefined ? { estado: parsed.data.estado } : {}),
      ...(parsed.data.notasPost !== undefined ? { notasPost: parsed.data.notasPost } : {}),
      ...(parsed.data.fechaHora !== undefined ? { fechaHora: new Date(parsed.data.fechaHora), alertaEnviada: false } : {}),
    };

    const visita = await db.visita.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: visita });
  } catch {
    return NextResponse.json({ error: "Error al actualizar visita" }, { status: 500 });
  }
}
