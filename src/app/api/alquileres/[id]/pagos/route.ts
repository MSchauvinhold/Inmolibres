import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { pagoRegistroSchema } from "@/lib/validations/rental";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * Verifica que el contrato exista y pertenezca a la inmobiliaria autenticada.
 * Devuelve null si no existe, false si pertenece a otra inmobiliaria.
 */
async function assertOwnership(contratoId: string, inmobiliariaId: string) {
  const contrato = await db.contratoAlquiler.findUnique({
    where: { id: contratoId },
    select: { inmobiliariaId: true },
  });
  if (!contrato) return null;
  if (contrato.inmobiliariaId !== inmobiliariaId) return false;
  return true;
}

/**
 * Decimal → number para serialización JSON segura, y `fecha` (@db.Date) como
 * "YYYY-MM-DD" — mismo formato que usa /alquileres/page.tsx para fechaInicio/fechaFin,
 * que es lo que esperan los helpers de fecha del cliente.
 */
function serializarPago<T extends { monto: Prisma.Decimal; fecha: Date }>(p: T) {
  return { ...p, monto: Number(p.monto), fecha: p.fecha.toISOString().slice(0, 10) };
}

// ─── GET /api/alquileres/[id]/pagos ──────────────────────────────────────────
// Lista todos los pagos de un contrato (solo si es de la misma inmobiliaria).

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: contratoId } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  try {
    const ownership = await assertOwnership(contratoId, inmobiliariaId);
    if (ownership === null) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }
    if (ownership === false) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const pagos = await db.pagoRegistro.findMany({
      where: {
        contratoId,
        inmobiliariaId, // doble filtro: incluso si contratoId fuera manipulado
      },
      orderBy: { fecha: "desc" },
    });

    const data = pagos.map(serializarPago);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
  }
}

// ─── POST /api/alquileres/[id]/pagos ─────────────────────────────────────────
// Registra un nuevo pago para el contrato.

export async function POST(request: NextRequest, { params }: Params) {
  const { id: contratoId } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = pagoRegistroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const ownership = await assertOwnership(contratoId, inmobiliariaId);
    if (ownership === null) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }
    if (ownership === false) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { concepto, monto, moneda, metodoPago, fecha } = parsed.data;

    const pago = await db.pagoRegistro.create({
      data: {
        contratoId,
        inmobiliariaId, // siempre se asigna desde el servidor, nunca del cliente
        concepto,
        monto,
        moneda,
        metodoPago: metodoPago ?? null,
        fecha: fecha ? new Date(fecha) : new Date(),
      },
    });

    return NextResponse.json({ data: serializarPago(pago) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al registrar pago" }, { status: 500 });
  }
}
