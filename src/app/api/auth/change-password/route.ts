import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { actual?: string; nueva?: string; confirmar?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { actual, nueva, confirmar } = body;

  // Validaciones servidor
  if (!actual || !nueva || !confirmar) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }
  if (nueva !== confirmar) {
    return NextResponse.json({ error: "Las contraseñas nuevas no coinciden" }, { status: 400 });
  }
  if (nueva.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }
  if (!/[A-Z]/.test(nueva)) {
    return NextResponse.json({ error: "La contraseña debe tener al menos una mayúscula" }, { status: 400 });
  }
  if (!/[0-9]/.test(nueva)) {
    return NextResponse.json({ error: "La contraseña debe tener al menos un número" }, { status: 400 });
  }

  // Verificar contraseña actual
  const usuario = await db.usuario.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const esCorrecta = await bcrypt.compare(actual, usuario.passwordHash);
  if (!esCorrecta) {
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
  }

  const nuevoHash = await bcrypt.hash(nueva, 12);

  await db.usuario.update({
    where: { id: session.user.id },
    data: { passwordHash: nuevoHash },
  });

  return NextResponse.json({ ok: true });
}
