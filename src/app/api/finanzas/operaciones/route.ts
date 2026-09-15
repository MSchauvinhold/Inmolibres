import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TipoOperacionFinanciera, Moneda } from "@prisma/client";

// Los campos Decimal de Prisma serializan a string en JSON — hay que convertirlos
// a number explícitamente o el frontend termina sumándolos como texto.
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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const inmobiliariaId = session.user.inmobiliariaId;
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "50");

  const operaciones = await db.operacionCerrada.findMany({
    where: { inmobiliariaId },
    include: { agente: { select: { id: true, nombre: true } } },
    orderBy: { fechaCierre: "desc" },
    take: limit,
  });

  return NextResponse.json({ data: operaciones.map(serializeOperacion) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const inmobiliariaId = session.user.inmobiliariaId;

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
    propiedadId?: string;
    clienteId?: string;
    fechaCierre?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.agenteId) {
    return NextResponse.json({ error: "Seleccioná el agente de la operación" }, { status: 400 });
  }
  if (typeof body.precioOperacion !== "number" || !Number.isFinite(body.precioOperacion) || body.precioOperacion <= 0) {
    return NextResponse.json({ error: "Ingresá un precio de operación válido" }, { status: 400 });
  }
  if (body.fechaCierre && isNaN(new Date(body.fechaCierre).getTime())) {
    return NextResponse.json({ error: "Fecha de cierre inválida" }, { status: 400 });
  }

  try {
    const op = await db.operacionCerrada.create({
      data: {
        inmobiliariaId,
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
        notas: body.notas,
        propiedadId: body.propiedadId,
        clienteId: body.clienteId,
        fechaCierre: body.fechaCierre ? new Date(body.fechaCierre) : undefined,
      },
      include: { agente: { select: { id: true, nombre: true } } },
    });

    return NextResponse.json({ data: serializeOperacion(op) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/finanzas/operaciones]", e);
    return NextResponse.json({ error: "Error al guardar la operación" }, { status: 500 });
  }
}
