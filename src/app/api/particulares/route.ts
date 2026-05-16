import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";

export async function GET() {
  const check = await requireSuperAdmin();
  if (isNextResponse(check)) return check;

  const particulares = await db.usuario.findMany({
    where: { rol: "PARTICULAR" },
    select: {
      id: true,
      nombre: true,
      email: true,
      activo: true,
      createdAt: true,
      _count: { select: { propiedades: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: particulares });
}

export async function POST(request: NextRequest) {
  const check = await requireSuperAdmin();
  if (isNextResponse(check)) return check;

  let body: { nombre?: string; email?: string; password?: string; whatsapp?: string };
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
    return NextResponse.json({ error: "La contraseña debe tener mínimo 8 caracteres" }, { status: 400 });
  }

  const existing = await db.usuario.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const usuario = await db.usuario.create({
    data: {
      nombre,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      rol: "PARTICULAR",
    },
    select: { id: true, nombre: true, email: true, activo: true, createdAt: true },
  });

  return NextResponse.json({ data: usuario }, { status: 201 });
}
