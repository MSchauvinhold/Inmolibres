import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actualizarTasacionSchema } from "@/lib/validations/tasacion";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
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

  const parsed = actualizarTasacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await db.tasacion.findUnique({ where: { id }, select: { inmobiliariaId: true, agenteId: true } });
    if (!existing) {
      return NextResponse.json({ error: "Tasación no encontrada" }, { status: 404 });
    }
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    if (rol === "AGENTE" && existing.agenteId !== userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { clienteId, agenteId, clienteTelefono, fechaTasacion, ...resto } = parsed.data;

    if (clienteId) {
      const cliente = await db.cliente.findUnique({ where: { id: clienteId }, select: { inmobiliariaId: true } });
      if (!cliente || cliente.inmobiliariaId !== inmobiliariaId) {
        return NextResponse.json({ error: "Cliente no válido para esta inmobiliaria" }, { status: 400 });
      }
    }

    const tasacion = await db.tasacion.update({
      where: { id },
      data: {
        ...resto,
        ...(clienteTelefono !== undefined ? { clienteTelefono: clienteTelefono || null } : {}),
        ...(fechaTasacion !== undefined ? { fechaTasacion: fechaTasacion ? new Date(fechaTasacion) : null } : {}),
        ...(clienteId !== undefined ? { clienteId: clienteId || null } : {}),
        ...(agenteId !== undefined && rol !== "AGENTE" ? { agenteId: agenteId || null } : {}),
      },
      include: {
        agente: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({ data: tasacion });
  } catch (e) {
    console.error("[PATCH /api/tasaciones/[id]]", e);
    return NextResponse.json({ error: "Error al actualizar la tasación" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  try {
    const existing = await db.tasacion.findUnique({ where: { id }, select: { inmobiliariaId: true, agenteId: true } });
    if (!existing) {
      return NextResponse.json({ error: "Tasación no encontrada" }, { status: 404 });
    }
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    if (rol === "AGENTE" && existing.agenteId !== userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    await db.tasacion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/tasaciones/[id]]", e);
    return NextResponse.json({ error: "Error al eliminar la tasación" }, { status: 500 });
  }
}
