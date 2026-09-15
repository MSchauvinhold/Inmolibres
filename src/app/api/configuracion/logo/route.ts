import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  logoUrl: z.string().url().nullable(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

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
      where: { id: session.user.inmobiliariaId },
      data: { logoUrl: body.data.logoUrl },
      select: { logoUrl: true },
    });

    return NextResponse.json({ data: inmobiliaria });
  } catch (e) {
    console.error("[PUT /api/configuracion/logo]", e);
    return NextResponse.json({ error: "Error al guardar el logo" }, { status: 500 });
  }
}
