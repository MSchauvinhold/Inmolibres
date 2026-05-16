import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // auth() needed since /api/consultas is in public prefix list
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const inmobiliariaId = session.user.inmobiliariaId;
  const userRol = session.user.rol;

  if (!inmobiliariaId || (userRol !== "ADMIN" && userRol !== "AGENTE")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const existing = await db.consulta.findUnique({
      where: { id },
      select: { inmobiliariaId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Consulta no encontrada" }, { status: 404 });
    }
    if (existing.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const consulta = await db.consulta.update({
      where: { id },
      data: { leida: true },
    });

    // Mark related notifications as leída for all users
    await db.notificacion.updateMany({
      where: { referenciaId: id, leida: false },
      data: { leida: true },
    });

    return NextResponse.json({ data: consulta });
  } catch {
    return NextResponse.json({ error: "Error al actualizar consulta" }, { status: 500 });
  }
}
