import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visitaSchema, actualizarVisitaSchema } from "@/lib/validations/visit";
import { notifyAgente, NotifMessages } from "@/lib/notifications";
import { buildPaginationMeta } from "@/lib/utils";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import type { Prisma, EstadoVisita } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const estado = searchParams.get("estado") as EstadoVisita | null;
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");
  const agenteId = searchParams.get("agenteId");

  const where: Prisma.VisitaWhereInput = { inmobiliariaId };

  if (rol === "AGENTE") {
    where.agenteId = userId;
  } else if (agenteId) {
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
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

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
    const visita = await db.visita.create({
      data: {
        ...parsed.data,
        fechaHora: new Date(parsed.data.fechaHora),
        inmobiliariaId,
      },
      include: {
        propiedad: { select: { id: true, titulo: true } },
        cliente: { select: { id: true, nombre: true } },
        agente: { select: { id: true, nombre: true } },
      },
    });

    const notif = NotifMessages.visitaProxima(
      visita.propiedad.titulo,
      visita.fechaHora
    );
    await notifyAgente(
      visita.agenteId,
      "VISITA_PROXIMA",
      notif.titulo,
      notif.mensaje,
      notif.url
    );

    return NextResponse.json({ data: visita }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear visita" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
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
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    if (rol === "AGENTE" && existing.agenteId !== userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const visita = await db.visita.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ data: visita });
  } catch {
    return NextResponse.json({ error: "Error al actualizar visita" }, { status: 500 });
  }
}
