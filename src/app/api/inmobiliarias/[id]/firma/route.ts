import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;

  // Solo el ADMIN de esa inmobiliaria puede cambiar la firma
  if (session.inmobiliariaId !== id) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  if (session.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede modificar la firma" }, { status: 403 });
  }

  let body: { firmaUrl?: string };
  try {
    body = await request.json() as { firmaUrl?: string };
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (typeof body.firmaUrl !== "string" || !body.firmaUrl.startsWith("http")) {
    return NextResponse.json({ error: "URL de firma inválida" }, { status: 400 });
  }

  try {
    await db.inmobiliaria.update({
      where: { id },
      data: { firmaUrl: body.firmaUrl },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PUT /firma]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
