import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actualizarVisitaSchema } from "@/lib/validations/visit";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  try {
    const visita = await db.visita.findUnique({
      where: { id },
      include: {
        propiedad: { select: { id: true, titulo: true, direccion: true, slug: true } },
        cliente: { select: { id: true, nombre: true, telefono: true, email: true } },
        agente: { select: { id: true, nombre: true } },
      },
    });

    if (!visita) {
      return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    }
    if (visita.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    if (rol === "AGENTE" && visita.agenteId !== userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({ data: visita });
  } catch {
    return NextResponse.json({ error: "Error al obtener visita" }, { status: 500 });
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

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, rol } = session;

  if (rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo el administrador puede eliminar visitas" },
      { status: 403 }
    );
  }

  try {
    const existing = await db.visita.findUnique({
      where: { id },
      select: { inmobiliariaId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    }
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    await db.visita.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar visita" }, { status: 500 });
  }
}
