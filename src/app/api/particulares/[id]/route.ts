import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireSuperAdmin();
  if (isNextResponse(check)) return check;

  const { id } = await params;
  let body: { activo?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const usuario = await db.usuario.findUnique({ where: { id } });
  if (!usuario || usuario.rol !== "PARTICULAR") {
    return NextResponse.json({ error: "Particular no encontrado" }, { status: 404 });
  }

  const updated = await db.usuario.update({
    where: { id },
    data: { activo: body.activo },
    select: { id: true, nombre: true, activo: true },
  });

  return NextResponse.json({ data: updated });
}
