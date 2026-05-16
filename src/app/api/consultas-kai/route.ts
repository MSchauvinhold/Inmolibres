import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";

const schema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  telefono: z.string().min(6, "Teléfono requerido"),
  mensaje: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { nombre, telefono, mensaje } = parsed.data;

  try {
    await db.consulta.create({
      data: {
        propiedadId: null,
        inmobiliariaId: null,
        nombreVisitante: nombre,
        telefono,
        mensaje: mensaje?.trim() || "Consulta general desde Kai Chat",
        origen: "KAI_CHAT",
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al guardar consulta" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (session?.user?.rol !== "SUPERADMIN")
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const consultas = await db.consulta.findMany({
      where: { origen: "KAI_CHAT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombreVisitante: true,
        telefono: true,
        mensaje: true,
        leida: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ data: consultas });
  } catch {
    return NextResponse.json({ error: "Error al obtener consultas" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (session?.user?.rol !== "SUPERADMIN")
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { id } = await request.json() as { id: string };
    await db.consulta.update({ where: { id }, data: { leida: true } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
