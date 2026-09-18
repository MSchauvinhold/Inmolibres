import { NextResponse } from "next/server";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { Moneda } from "@prisma/client";

export async function GET(req: Request) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;

  const { inmobiliariaId } = session;
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
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  if (session.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { inmobiliariaId } = session;

  let body: {
    concepto: string;
    monto: number;
    moneda: Moneda;
    fecha?: string;
    categoria?: string;
    propiedadId?: string | null;
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
    // Gasto de mantenimiento cargado desde la ficha de una propiedad
    if (body.propiedadId) {
      const propiedad = await db.propiedad.findUnique({ where: { id: body.propiedadId }, select: { inmobiliariaId: true } });
      if (!propiedad || propiedad.inmobiliariaId !== inmobiliariaId) {
        return NextResponse.json({ error: "Propiedad no válida para esta inmobiliaria" }, { status: 400 });
      }
    }

    const egreso = await db.egresoInmobiliaria.create({
      data: {
        inmobiliariaId,
        concepto: body.concepto,
        monto: body.monto,
        moneda: body.moneda ?? "ARS",
        fecha: body.fecha ? new Date(body.fecha) : undefined,
        categoria: body.categoria,
        propiedadId: body.propiedadId || null,
      },
    });

    return NextResponse.json({ data: egreso }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/finanzas/egresos]", e);
    return NextResponse.json({ error: "Error al guardar el egreso" }, { status: 500 });
  }
}
