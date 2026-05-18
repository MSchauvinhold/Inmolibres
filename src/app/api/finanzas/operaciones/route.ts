import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TipoOperacionFinanciera, Moneda } from "@prisma/client";

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

  return NextResponse.json({ data: operaciones });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const inmobiliariaId = session.user.inmobiliariaId;

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
    propiedadId?: string;
    clienteId?: string;
    fechaCierre?: string;
  };

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

  return NextResponse.json({ data: op }, { status: 201 });
}
