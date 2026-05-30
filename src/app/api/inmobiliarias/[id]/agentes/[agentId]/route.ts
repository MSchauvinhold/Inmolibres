import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { puedeAgregarAgente, toPlanKey } from "@/lib/planes";

type Params = { params: Promise<{ id: string; agentId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id, agentId } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN" || session.user.inmobiliariaId !== id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  let body: { activo?: boolean; comisionPersonalPct?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const agente = await db.usuario.findUnique({ where: { id: agentId } });
  if (!agente || agente.inmobiliariaId !== id || agente.rol !== "AGENTE") {
    return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
  }

  // Si se está reactivando un agente, verificar el límite del plan
  if (body.activo === true && !agente.activo) {
    const inmo = await db.inmobiliaria.findUnique({
      where: { id },
      select: { plan: true },
    });
    const planKey = toPlanKey(inmo?.plan);
    const activosActuales = await db.usuario.count({
      where: { inmobiliariaId: id, rol: "AGENTE", activo: true },
    });
    if (!puedeAgregarAgente(planKey, activosActuales)) {
      return NextResponse.json(
        { error: `Tu plan ${planKey} permite máximo ${activosActuales} agente(s) activos. Actualizá el plan para agregar más.` },
        { status: 409 }
      );
    }
  }

  const updateData: { activo?: boolean; comisionPersonalPct?: number | null } = {};
  if (body.activo !== undefined) updateData.activo = body.activo;
  if ("comisionPersonalPct" in body) updateData.comisionPersonalPct = body.comisionPersonalPct;

  const updated = await db.usuario.update({
    where: { id: agentId },
    data: updateData,
    select: { id: true, nombre: true, activo: true, comisionPersonalPct: true },
  });

  return NextResponse.json({ data: updated });
}
