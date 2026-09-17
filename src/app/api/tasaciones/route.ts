import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasacionSchema } from "@/lib/validations/tasacion";
import { buildPaginationMeta } from "@/lib/utils";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import type { Prisma, EstadoTasacion } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const estado = searchParams.get("estado") as EstadoTasacion | null;
  const search = searchParams.get("search");
  const agenteId = searchParams.get("agenteId");

  const where: Prisma.TasacionWhereInput = { inmobiliariaId };

  if (rol === "AGENTE") {
    where.agenteId = userId;
  } else if (agenteId) {
    where.agenteId = agenteId;
  }

  if (estado) where.estado = estado;

  if (search) {
    where.OR = [
      { clienteNombre: { contains: search, mode: "insensitive" } },
      { direccion: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * pageSize;

  try {
    const [total, tasaciones] = await Promise.all([
      db.tasacion.count({ where }),
      db.tasacion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          agente: { select: { id: true, nombre: true } },
          cliente: { select: { id: true, nombre: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: tasaciones,
      meta: buildPaginationMeta(total, page, pageSize),
    });
  } catch (e) {
    console.error("[GET /api/tasaciones]", e);
    return NextResponse.json({ error: "Error al obtener las tasaciones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = tasacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { clienteId, propiedadId, agenteId, clienteTelefono, fechaTasacion, ...resto } = parsed.data;

  try {
    if (clienteId) {
      const cliente = await db.cliente.findUnique({ where: { id: clienteId }, select: { inmobiliariaId: true } });
      if (!cliente || cliente.inmobiliariaId !== inmobiliariaId) {
        return NextResponse.json({ error: "Cliente no válido para esta inmobiliaria" }, { status: 400 });
      }
    }

    if (propiedadId) {
      const propiedad = await db.propiedad.findUnique({ where: { id: propiedadId }, select: { inmobiliariaId: true } });
      if (!propiedad || propiedad.inmobiliariaId !== inmobiliariaId) {
        return NextResponse.json({ error: "Propiedad no válida para esta inmobiliaria" }, { status: 400 });
      }
    }

    let agenteFinal: string | null = rol === "AGENTE" ? userId : (agenteId || null);
    if (agenteFinal) {
      const agente = await db.usuario.findUnique({ where: { id: agenteFinal }, select: { inmobiliariaId: true } });
      if (!agente || agente.inmobiliariaId !== inmobiliariaId) agenteFinal = null;
    }

    const tasacion = await db.tasacion.create({
      data: {
        ...resto,
        clienteTelefono: clienteTelefono || null,
        fechaTasacion: fechaTasacion ? new Date(fechaTasacion) : null,
        clienteId: clienteId || null,
        propiedadId: propiedadId || null,
        agenteId: agenteFinal,
        inmobiliariaId: inmobiliariaId!,
      },
      include: {
        agente: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({ data: tasacion }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/tasaciones]", e);
    return NextResponse.json({ error: "Error al crear la tasación" }, { status: 500 });
  }
}
