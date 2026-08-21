import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** Elimina una carga manual de índice (para corregir un error de tipeo). */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await params;

  const existente = await db.indiceManual.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await db.indiceManual.delete({ where: { id } });

  return NextResponse.json({ data: { ok: true } });
}
