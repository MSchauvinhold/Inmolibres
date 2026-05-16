import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN" || session.user.inmobiliariaId !== id) {
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

  const updated = await db.inmobiliaria.update({
    where: { id },
    data: { whatsapp: body.whatsapp.trim() },
    select: { id: true, whatsapp: true },
  });

  return NextResponse.json({ data: updated });
}
