import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: { token?: string; uid?: string; nueva?: string; confirmar?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { token, uid, nueva, confirmar } = body;

  if (!token || !uid || !nueva || !confirmar) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Validaciones de la contraseña
  if (nueva !== confirmar) {
    return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
  }
  if (nueva.length < 8) {
    return NextResponse.json({ error: "Mínimo 8 caracteres" }, { status: 400 });
  }
  if (!/[A-Z]/.test(nueva)) {
    return NextResponse.json({ error: "Debe tener al menos una mayúscula" }, { status: 400 });
  }
  if (!/[0-9]/.test(nueva)) {
    return NextResponse.json({ error: "Debe tener al menos un número" }, { status: 400 });
  }

  // Buscar tokens válidos del usuario
  const tokens = await db.passwordResetToken.findMany({
    where: {
      usuarioId: uid,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (tokens.length === 0) {
    return NextResponse.json({ error: "El enlace expiró o ya fue utilizado." }, { status: 400 });
  }

  // Verificar cuál token coincide (comparación segura contra hash)
  let tokenValido: (typeof tokens)[number] | null = null;
  for (const t of tokens) {
    const match = await bcrypt.compare(token, t.token);
    if (match) { tokenValido = t; break; }
  }

  if (!tokenValido) {
    return NextResponse.json({ error: "El enlace no es válido." }, { status: 400 });
  }

  const nuevoHash = await bcrypt.hash(nueva, 12);

  // Actualizar contraseña e invalidar token en una transacción
  await db.$transaction([
    db.usuario.update({
      where: { id: uid },
      data: { passwordHash: nuevoHash },
    }),
    db.passwordResetToken.update({
      where: { id: tokenValido.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
