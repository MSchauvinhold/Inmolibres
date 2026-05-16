import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth, isNextResponse } from "@/lib/api-auth";

export async function GET() {
  const session = await requireAuth();
  if (isNextResponse(session)) return session;
  const { userId } = session;

  try {
    const notificaciones = await db.notificacion.findMany({
      where: { usuarioId: userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const noLeidas = await db.notificacion.count({
      where: { usuarioId: userId, leida: false },
    });
    return NextResponse.json({ data: notificaciones, noLeidas });
  } catch {
    return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 });
  }
}

const marcarLeidasSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  const session = await requireAuth();
  if (isNextResponse(session)) return session;
  const { userId } = session;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const parsed = marcarLeidasSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { ids, all } = parsed.data;

  try {
    if (all) {
      await db.notificacion.updateMany({ where: { usuarioId: userId, leida: false }, data: { leida: true } });
    } else if (ids?.length) {
      await db.notificacion.updateMany({ where: { usuarioId: userId, id: { in: ids } }, data: { leida: true } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al marcar notificaciones" }, { status: 500 });
  }
}
