import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * SUPERADMIN blanquea o define manualmente la contraseña de cualquier usuario
 * (ADMIN, AGENTE o PARTICULAR de cualquier inmobiliaria). Uso de soporte:
 * el usuario quedó trabado, no recibe el email de recuperación, etc.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await params;

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { password } = body;
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Contraseña mínimo 8 caracteres" }, { status: 400 });
  }
  if (!/[A-Z]/.test(password)) {
    return NextResponse.json({ error: "Debe tener al menos una mayúscula" }, { status: 400 });
  }
  if (!/[0-9]/.test(password)) {
    return NextResponse.json({ error: "Debe tener al menos un número" }, { status: 400 });
  }

  const usuario = await db.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true },
  });
  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.$transaction([
    db.usuario.update({ where: { id }, data: { passwordHash } }),
    // Invalidar cualquier token de recuperación pendiente — el reset manual reemplaza el flujo por email
    db.passwordResetToken.updateMany({
      where: { usuarioId: id, used: false },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ ok: true, nombre: usuario.nombre, email: usuario.email });
}
