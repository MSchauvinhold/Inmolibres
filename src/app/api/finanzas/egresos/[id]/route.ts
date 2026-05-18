import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { id } = await params;

  const egreso = await db.egresoInmobiliaria.findFirst({
    where: { id, inmobiliariaId: session.user.inmobiliariaId },
  });
  if (!egreso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.egresoInmobiliaria.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
