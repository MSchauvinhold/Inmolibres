import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string; pagoId: string }> };

// ─── DELETE /api/alquileres/[id]/pagos/[pagoId] ───────────────────────────────
// Elimina un registro de pago.
// Seguridad: verifica que el pago pertenezca a la inmobiliaria autenticada
// usando el índice inmobiliariaId del PagoRegistro (no solo el contratoId).

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: contratoId, pagoId } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  try {
    // findFirst con ambos filtros: el pago debe pertenecer al contrato
    // Y a la inmobiliaria autenticada. Cualquier discrepancia → 404.
    const pago = await db.pagoRegistro.findFirst({
      where: {
        id: pagoId,
        contratoId,
        inmobiliariaId, // multi-tenancy: filtramos por inmobiliaria en la misma query
      },
      select: { id: true },
    });

    if (!pago) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    await db.pagoRegistro.delete({ where: { id: pagoId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar pago" }, { status: 500 });
  }
}
