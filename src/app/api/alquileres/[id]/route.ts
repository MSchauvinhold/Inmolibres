import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actualizarPagoSchema } from "@/lib/validations/rental";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  try {
    const contrato = await db.contratoAlquiler.findUnique({
      where: { id },
      include: {
        propiedad: {
          select: { id: true, titulo: true, direccion: true, slug: true, tipo: true },
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }
    if (contrato.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({ data: contrato });
  } catch {
    return NextResponse.json({ error: "Error al obtener contrato" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = actualizarPagoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await db.contratoAlquiler.findUnique({
      where: { id },
      select: { inmobiliariaId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const contrato = await db.contratoAlquiler.update({
      where: { id },
      data: { estadoPago: parsed.data.estadoPago },
    });

    return NextResponse.json({ data: contrato });
  } catch {
    return NextResponse.json({ error: "Error al actualizar estado de pago" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, rol } = session;

  if (rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo el administrador puede eliminar contratos" },
      { status: 403 }
    );
  }

  try {
    const existing = await db.contratoAlquiler.findUnique({
      where: { id },
      select: { inmobiliariaId: true, propiedadId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    await db.$transaction([
      db.contratoAlquiler.delete({ where: { id } }),
      db.propiedad.updateMany({
        where: {
          id: existing.propiedadId,
          contratos: { none: { fechaFin: { gte: new Date() }, id: { not: id } } },
        },
        data: { estado: "DISPONIBLE" },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar contrato" }, { status: 500 });
  }
}
