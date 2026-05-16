import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clienteSchema } from "@/lib/validations/client";
import { buildPaginationMeta } from "@/lib/utils";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import type { Prisma, EstadoPipeline } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const estadoPipeline = searchParams.get("estadoPipeline") as EstadoPipeline | null;
  const search = searchParams.get("search");
  const agenteId = searchParams.get("agenteId");

  const where: Prisma.ClienteWhereInput = { inmobiliariaId };

  if (rol === "AGENTE") {
    where.agenteId = userId;
  } else if (agenteId) {
    where.agenteId = agenteId;
  }

  if (estadoPipeline) where.estadoPipeline = estadoPipeline;

  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { telefono: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * pageSize;

  try {
    const [total, clientes] = await Promise.all([
      db.cliente.count({ where }),
      db.cliente.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { ultimaActividad: "desc" },
        include: {
          agente: { select: { id: true, nombre: true } },
          propiedades: {
            include: {
              propiedad: { select: { id: true, titulo: true, slug: true } },
            },
          },
          _count: { select: { visitas: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: clientes,
      meta: buildPaginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
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

  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { propiedadIds, agenteId, email, ...clienteData } = parsed.data;

  try {
    if (agenteId && agenteId !== "") {
      const agente = await db.usuario.findUnique({
        where: { id: agenteId },
        select: { inmobiliariaId: true },
      });
      if (!agente || agente.inmobiliariaId !== inmobiliariaId) {
        return NextResponse.json({ error: "Agente no válido para esta inmobiliaria" }, { status: 400 });
      }
    }

    if (propiedadIds?.length) {
      const validProps = await db.propiedad.findMany({
        where: { inmobiliariaId, id: { in: propiedadIds } },
        select: { id: true },
      });
      if (validProps.length !== propiedadIds.length) {
        return NextResponse.json({ error: "Una o más propiedades no pertenecen a esta inmobiliaria" }, { status: 400 });
      }
    }

    const cliente = await db.cliente.create({
      data: {
        ...clienteData,
        email: email === "" ? null : email,
        agenteId: agenteId === "" ? null : (agenteId ?? null),
        inmobiliariaId,
        ...(propiedadIds?.length
          ? {
              propiedades: {
                create: propiedadIds.map((pid) => ({ propiedadId: pid })),
              },
            }
          : {}),
      },
      include: {
        agente: { select: { id: true, nombre: true } },
        propiedades: {
          include: { propiedad: { select: { id: true, titulo: true } } },
        },
      },
    });

    return NextResponse.json({ data: cliente }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}
