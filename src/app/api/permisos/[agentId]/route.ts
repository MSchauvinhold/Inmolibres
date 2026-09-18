import { NextResponse } from "next/server";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;

  const { agentId } = await params;

  const agente = await db.usuario.findFirst({
    where: { id: agentId, inmobiliariaId: session.inmobiliariaId, rol: "AGENTE" },
  });
  if (!agente) return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });

  let permisos = await db.permisosAgente.findUnique({ where: { usuarioId: agentId } });
  if (!permisos) {
    permisos = await db.permisosAgente.create({ data: { usuarioId: agentId } });
  }

  return NextResponse.json({ data: permisos });
}

export async function PUT(req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  if (session.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { agentId } = await params;

  const agente = await db.usuario.findFirst({
    where: { id: agentId, inmobiliariaId: session.inmobiliariaId, rol: "AGENTE" },
  });
  if (!agente) return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });

  let body: Record<string, boolean>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const allowed = [
    "verPropiedades", "editarPropiedades", "verClientes", "editarClientes",
    "verVisitas", "editarVisitas", "verAlquileres", "editarAlquileres",
    "verConsultas", "verCalculadoras", "verFinanzas", "verDocumentos", "verReportes",
    "verTasaciones",
  ];
  const data: Record<string, boolean> = {};
  for (const key of allowed) {
    if (key in body && typeof body[key] === "boolean") data[key] = body[key];
  }

  try {
    const permisos = await db.permisosAgente.upsert({
      where: { usuarioId: agentId },
      create: { usuarioId: agentId, ...data },
      update: data,
    });

    return NextResponse.json({ data: permisos });
  } catch (e) {
    console.error("[PUT /api/permisos/[agentId]]", e);
    return NextResponse.json({ error: "Error al guardar los permisos" }, { status: 500 });
  }
}
