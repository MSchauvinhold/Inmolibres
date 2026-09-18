import { NextResponse } from "next/server";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { TZ_AR } from "@/lib/utils";
import type { TipoOperacionFinanciera, Moneda } from "@prisma/client";

function serializeOperacion<T extends {
  precioOperacion: unknown; comisionTotal: unknown; comisionInmob: unknown;
  comisionAgente: unknown; ivaComision: unknown; gastos: unknown;
}>(op: T) {
  return {
    ...op,
    precioOperacion: Number(op.precioOperacion),
    comisionTotal: Number(op.comisionTotal),
    comisionInmob: Number(op.comisionInmob),
    comisionAgente: Number(op.comisionAgente),
    ivaComision: Number(op.ivaComision),
    gastos: Number(op.gastos),
  };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  if (session.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { id } = await params;

  const existente = await db.operacionCerrada.findFirst({
    where: { id, inmobiliariaId: session.inmobiliariaId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let body: {
    agenteId: string;
    tipo: TipoOperacionFinanciera;
    precioOperacion: number;
    moneda: Moneda;
    comisionVendedorPct: number;
    comisionCompradorPct: number;
    comisionTotal: number;
    comisionInmob: number;
    comisionAgente: number;
    ivaComision: number;
    gastos?: number;
    descripcionGastos?: string;
    notas?: string;
    fechaCierre?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (body.fechaCierre && isNaN(new Date(body.fechaCierre).getTime())) {
    return NextResponse.json({ error: "Fecha de cierre inválida" }, { status: 400 });
  }

  const notaEdicion = `[Editado manualmente el ${new Date().toLocaleDateString("es-AR", { timeZone: TZ_AR })}]`;
  const notasBase = (body.notas ?? existente.notas ?? "").replace(/^\[Editado manualmente[^\]]*\]\s*/, "");

  try {
    const op = await db.operacionCerrada.update({
      where: { id },
      data: {
        agenteId: body.agenteId,
        tipo: body.tipo,
        precioOperacion: body.precioOperacion,
        moneda: body.moneda,
        comisionVendedorPct: body.comisionVendedorPct,
        comisionCompradorPct: body.comisionCompradorPct,
        comisionTotal: body.comisionTotal,
        comisionInmob: body.comisionInmob,
        comisionAgente: body.comisionAgente,
        ivaComision: body.ivaComision ?? 0,
        gastos: body.gastos ?? 0,
        descripcionGastos: body.descripcionGastos,
        notas: `${notaEdicion} ${notasBase}`.trim(),
        fechaCierre: body.fechaCierre ? new Date(body.fechaCierre) : undefined,
      },
      include: { agente: { select: { id: true, nombre: true } } },
    });

    return NextResponse.json({ data: serializeOperacion(op) });
  } catch (e) {
    console.error("[PUT /api/finanzas/operaciones/[id]]", e);
    return NextResponse.json({ error: "Error al actualizar la operación" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  if (session.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { id } = await params;

  const existente = await db.operacionCerrada.findFirst({
    where: { id, inmobiliariaId: session.inmobiliariaId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  try {
    await db.operacionCerrada.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/finanzas/operaciones/[id]]", e);
    return NextResponse.json({ error: "Error al eliminar la operación" }, { status: 500 });
  }
}
