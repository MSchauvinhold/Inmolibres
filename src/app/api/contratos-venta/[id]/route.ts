import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

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
