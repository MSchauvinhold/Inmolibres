import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Moneda } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const inmobiliariaId = session.user.inmobiliariaId;
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes");
  const categoria = searchParams.get("categoria");

  const where: Record<string, unknown> = { inmobiliariaId };

  if (mes) {
    const [year, month] = mes.split("-").map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);
    where.fecha = { gte: inicio, lt: fin };
  }

  if (categoria) where.categoria = categoria;

  const egresos = await db.egresoInmobiliaria.findMany({
    where,
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json({ data: egresos });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const inmobiliariaId = session.user.inmobiliariaId;

  const body = await req.json() as {
    concepto: string;
    monto: number;
    moneda: Moneda;
    fecha?: string;
    categoria?: string;
  };

  const egreso = await db.egresoInmobiliaria.create({
    data: {
      inmobiliariaId,
      concepto: body.concepto,
      monto: body.monto,
      moneda: body.moneda ?? "ARS",
      fecha: body.fecha ? new Date(body.fecha) : undefined,
      categoria: body.categoria,
    },
  });

  return NextResponse.json({ data: egreso }, { status: 201 });
}
