import { NextResponse } from "next/server";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  if (session.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { id } = await params;

  const egreso = await db.egresoInmobiliaria.findFirst({
    where: { id, inmobiliariaId: session.inmobiliariaId },
  });
  if (!egreso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  try {
    await db.egresoInmobiliaria.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/finanzas/egresos/[id]]", e);
    return NextResponse.json({ error: "Error al eliminar el egreso" }, { status: 500 });
  }
}
