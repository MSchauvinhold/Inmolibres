import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { agentId } = await params;

  const agente = await db.usuario.findFirst({
    where: { id: agentId, inmobiliariaId: session.user.inmobiliariaId, rol: "AGENTE" },
  });
  if (!agente) return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });

  let permisos = await db.permisosAgente.findUnique({ where: { usuarioId: agentId } });
  if (!permisos) {
    permisos = await db.permisosAgente.create({ data: { usuarioId: agentId } });
  }

  return NextResponse.json({ data: permisos });
}

export async function PUT(req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { agentId } = await params;

  const agente = await db.usuario.findFirst({
    where: { id: agentId, inmobiliariaId: session.user.inmobiliariaId, rol: "AGENTE" },
  });
  if (!agente) return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });

  const body = await req.json() as Record<string, boolean>;

  const allowed = [
    "verPropiedades", "editarPropiedades", "verClientes", "editarClientes",
    "verVisitas", "editarVisitas", "verAlquileres", "editarAlquileres",
    "verConsultas", "verCalculadoras", "verFinanzas", "verDocumentos", "verReportes",
  ];
  const data: Record<string, boolean> = {};
  for (const key of allowed) {
    if (key in body && typeof body[key] === "boolean") data[key] = body[key];
  }

  const permisos = await db.permisosAgente.upsert({
    where: { usuarioId: agentId },
    create: { usuarioId: agentId, ...data },
    update: data,
  });

  return NextResponse.json({ data: permisos });
}
