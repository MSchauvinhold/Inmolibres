import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clienteSchema, actualizarPipelineSchema } from "@/lib/validations/client";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  try {
    const cliente = await db.cliente.findUnique({
      where: { id },
      include: {
        agente: { select: { id: true, nombre: true } },
        propiedades: {
          include: {
            propiedad: { select: { id: true, titulo: true, slug: true, tipo: true, operacion: true } },
          },
        },
        visitas: {
          orderBy: { fechaHora: "desc" },
          take: 10,
          include: {
            propiedad: { select: { id: true, titulo: true } },
            agente: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    if (cliente.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    if (rol === "AGENTE" && cliente.agenteId !== userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({ data: cliente });
  } catch {
    return NextResponse.json({ error: "Error al obtener cliente" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const fullParsed = clienteSchema.safeParse(body);
  const pipelineParsed = actualizarPipelineSchema.safeParse(body);

  if (!fullParsed.success && !pipelineParsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: fullParsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await db.cliente.findUnique({
      where: { id },
      select: { inmobiliariaId: true, agenteId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    if (rol === "AGENTE" && existing.agenteId !== userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    if (fullParsed.success) {
      const { propiedadIds, agenteId, email, ...clienteData } = fullParsed.data;

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

      const cliente = await db.$transaction(async (tx) => {
        const updated = await tx.cliente.update({
          where: { id },
          data: {
            ...clienteData,
            email: email === "" ? null : email,
            agenteId: agenteId === "" ? null : (agenteId ?? null),
            ultimaActividad: new Date(),
          },
        });

        await tx.propiedadCliente.deleteMany({ where: { clienteId: id } });
        if (propiedadIds?.length) {
          await tx.propiedadCliente.createMany({
            data: propiedadIds.map((pid) => ({ propiedadId: pid, clienteId: id })),
          });
        }

        return updated;
      });

      return NextResponse.json({ data: cliente });
    }

    const cliente = await db.cliente.update({
      where: { id },
      data: {
        estadoPipeline: pipelineParsed.data!.estadoPipeline,
        notas: pipelineParsed.data!.notas,
        ultimaActividad: new Date(),
      },
    });

    return NextResponse.json({ data: cliente });
  } catch {
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, rol } = session;

  if (rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar clientes" }, { status: 403 });
  }

  try {
    const existing = await db.cliente.findUnique({
      where: { id },
      select: { inmobiliariaId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    await db.cliente.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }
}
