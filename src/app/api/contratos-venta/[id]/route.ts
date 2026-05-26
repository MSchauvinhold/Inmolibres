import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actualizarContratoVentaSchema } from "@/lib/validations/rental";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

// ─── PUT /api/contratos-venta/[id] ───────────────────────────────────────────
// Actualiza notas, vendedorTel y/o compradorTel de un boleto de compraventa.

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = actualizarContratoVentaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // findFirst filtra por id + inmobiliariaId en una sola query (multi-tenancy)
    const existing = await db.contratoVenta.findFirst({
      where: { id, inmobiliariaId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    const { notas, vendedorTel, compradorTel } = parsed.data;

    const venta = await db.contratoVenta.update({
      where: { id },
      data: {
        ...(notas !== undefined       && { notas }),
        ...(vendedorTel !== undefined  && { vendedorTel }),
        ...(compradorTel !== undefined && { compradorTel }),
      },
    });

    return NextResponse.json({ data: venta });
  } catch {
    return NextResponse.json({ error: "Error al actualizar contrato" }, { status: 500 });
  }
}

// ─── DELETE /api/contratos-venta/[id] ────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;

  if (session.rol !== "ADMIN") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  const { id } = await params;
  const { inmobiliariaId } = session;

  try {
    const existing = await db.contratoVenta.findFirst({ where: { id, inmobiliariaId } });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await db.contratoVenta.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/contratos-venta]", e);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
