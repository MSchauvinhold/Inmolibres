import { NextResponse } from "next/server";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  logoUrl: z.string().url().nullable(),
});

export async function PUT(req: Request) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  if (session.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const body = schema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const inmobiliaria = await db.inmobiliaria.update({
      where: { id: session.inmobiliariaId },
      data: { logoUrl: body.data.logoUrl },
      select: { logoUrl: true },
    });

    return NextResponse.json({ data: inmobiliaria });
  } catch (e) {
    console.error("[PUT /api/configuracion/logo]", e);
    return NextResponse.json({ error: "Error al guardar el logo" }, { status: 500 });
  }
}
