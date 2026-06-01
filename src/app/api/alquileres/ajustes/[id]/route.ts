import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

// PUT — CONFIRMAR el ajuste: aplica el nuevo precio al contrato.
export async function PUT(_request: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;
  const { id } = await params;

  const ajuste = await db.ajusteAlquiler.findUnique({
    where: { id },
    include: { contrato: { select: { inmobiliariaId: true } } },
  });

  if (!ajuste || ajuste.contrato.inmobiliariaId !== inmobiliariaId) {
    return NextResponse.json({ error: "Ajuste no encontrado" }, { status: 404 });
  }
  if (ajuste.aplicado) {
    return NextResponse.json({ error: "Este ajuste ya fue aplicado" }, { status: 400 });
  }

  // Aplicar: nuevo precio al contrato + actualizar base del índice, marcar ajuste aplicado
  await db.$transaction([
    db.contratoAlquiler.update({
      where: { id: ajuste.contratoId },
      data: {
        precioMensual: ajuste.precioNuevo,
        fechaUltimoAjuste: ajuste.fechaAjuste,
        indiceUltimoAjuste: ajuste.indiceFin,
      },
    }),
    db.ajusteAlquiler.update({
      where: { id },
      data: { aplicado: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

// DELETE — RECHAZAR el ajuste: lo descarta sin aplicarlo.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;
  const { id } = await params;

  const ajuste = await db.ajusteAlquiler.findUnique({
    where: { id },
    include: { contrato: { select: { inmobiliariaId: true } } },
  });

  if (!ajuste || ajuste.contrato.inmobiliariaId !== inmobiliariaId) {
    return NextResponse.json({ error: "Ajuste no encontrado" }, { status: 404 });
  }
  if (ajuste.aplicado) {
    return NextResponse.json({ error: "No se puede rechazar un ajuste ya aplicado" }, { status: 400 });
  }

  await db.ajusteAlquiler.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
