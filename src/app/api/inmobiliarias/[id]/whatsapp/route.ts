import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  if (session.inmobiliariaId !== id || session.rol !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  let body: { whatsapp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.whatsapp?.trim()) {
    return NextResponse.json({ error: "WhatsApp requerido" }, { status: 400 });
  }

  try {
    const updated = await db.inmobiliaria.update({
      where: { id },
      data: { whatsapp: body.whatsapp.trim() },
      select: { id: true, whatsapp: true },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("[PUT /api/inmobiliarias/[id]/whatsapp]", e);
    return NextResponse.json({ error: "Error al actualizar el WhatsApp" }, { status: 500 });
  }
}
