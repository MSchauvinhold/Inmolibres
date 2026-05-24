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

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const inmobiliaria = await db.inmobiliaria.update({
    where: { id: session.user.inmobiliariaId },
    data: { logoUrl: body.data.logoUrl },
    select: { logoUrl: true },
  });

  return NextResponse.json({ data: inmobiliaria });
}
