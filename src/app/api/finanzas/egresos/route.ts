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

  let body: {
    concepto: string;
    monto: number;
    moneda: Moneda;
    fecha?: string;
    categoria?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.concepto?.trim()) {
    return NextResponse.json({ error: "El concepto es requerido" }, { status: 400 });
  }
  if (typeof body.monto !== "number" || !Number.isFinite(body.monto) || body.monto <= 0) {
    return NextResponse.json({ error: "Ingresá un monto válido" }, { status: 400 });
  }
  if (body.fecha && isNaN(new Date(body.fecha).getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  try {
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
  } catch (e) {
    console.error("[POST /api/finanzas/egresos]", e);
    return NextResponse.json({ error: "Error al guardar el egreso" }, { status: 500 });
  }
}
