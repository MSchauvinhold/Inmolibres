import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { id } = await params;

  const existente = await db.operacionCerrada.findFirst({
    where: { id, inmobiliariaId: session.user.inmobiliariaId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json() as {
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

  const notaEdicion = `[Editado manualmente el ${new Date().toLocaleDateString("es-AR")}]`;
  const notasBase = (body.notas ?? existente.notas ?? "").replace(/^\[Editado manualmente[^\]]*\]\s*/, "");

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
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { id } = await params;

  const existente = await db.operacionCerrada.findFirst({
    where: { id, inmobiliariaId: session.user.inmobiliariaId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.operacionCerrada.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
