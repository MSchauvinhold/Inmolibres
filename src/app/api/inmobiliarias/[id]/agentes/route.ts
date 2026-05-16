import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function requireAdmin(inmobiliariaId: string) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (
    session.user.rol !== "ADMIN" ||
    session.user.inmobiliariaId !== inmobiliariaId
  ) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  return session;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const check = await requireAdmin(id);
  if (check instanceof NextResponse) return check;

  let body: { nombre?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { nombre, email, password } = body;
  if (!nombre || !email || !password) {
    return NextResponse.json({ error: "nombre, email y password son requeridos" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Contraseña mínimo 8 caracteres" }, { status: 400 });
  }

  const agentCount = await db.usuario.count({
    where: { inmobiliariaId: id, rol: "AGENTE", activo: true },
  });
  if (agentCount >= 3) {
    return NextResponse.json({ error: "Límite de 3 agentes por inmobiliaria" }, { status: 409 });
  }

  const existing = await db.usuario.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const agente = await db.usuario.create({
    data: {
      inmobiliariaId: id,
      email,
      nombre,
      passwordHash: await bcrypt.hash(password, 12),
      rol: "AGENTE",
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  });

  return NextResponse.json({ data: agente }, { status: 201 });
}
