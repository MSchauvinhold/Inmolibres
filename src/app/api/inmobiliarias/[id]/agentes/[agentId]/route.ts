import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string; agentId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id, agentId } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN" || session.user.inmobiliariaId !== id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  let body: { activo?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const agente = await db.usuario.findUnique({ where: { id: agentId } });
  if (!agente || agente.inmobiliariaId !== id || agente.rol !== "AGENTE") {
    return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
  }

  const updated = await db.usuario.update({
    where: { id: agentId },
    data: { activo: body.activo },
    select: { id: true, nombre: true, activo: true },
  });

  return NextResponse.json({ data: updated });
}
