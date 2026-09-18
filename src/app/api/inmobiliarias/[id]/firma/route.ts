import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { firmaSchema } from "@/lib/validations/configuracion";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // La firma se renderiza como <img src> en el contrato: solo URL http(s).
  const parsed = firmaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await db.inmobiliaria.update({
      where: { id },
      data: { firmaUrl: parsed.data.firmaUrl },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PUT /firma]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
