import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { Resend } from "resend";

// Inicialización lazy para que no falle en build time si la variable no está
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@inmolibres.com";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Rate limiting en memoria: ip → [timestamps]
const rateMap = new Map<string, number[]>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateMap.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) return true;
  rateMap.set(ip, [...hits, now]);
  return false;
}

const RESPUESTA_GENERICA = NextResponse.json(
  { ok: true, message: "Si el email existe, recibirás las instrucciones en tu correo." },
  { status: 200 }
);

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intentá de nuevo en 15 minutos." },
      { status: 429 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return RESPUESTA_GENERICA;
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return RESPUESTA_GENERICA;

  // Buscar usuario — nunca revelar si existe o no
  const usuario = await db.usuario.findUnique({
    where: { email },
    select: { id: true, nombre: true, email: true, rol: true },
  });

  if (!usuario) return RESPUESTA_GENERICA;

  // SUPERADMIN no puede recuperar contraseña por este flujo (gestión manual)
  if (usuario.rol === "SUPERADMIN") return RESPUESTA_GENERICA;

  // Generar token crudo y hasheado
  const tokenCrudo = crypto.randomBytes(32).toString("hex");
  const tokenHasheado = await bcrypt.hash(tokenCrudo, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  // Invalidar tokens anteriores no usados del usuario
  await db.passwordResetToken.updateMany({
    where: { usuarioId: usuario.id, used: false },
    data: { used: true },
  });

  // Guardar nuevo token hasheado
  await db.passwordResetToken.create({
    data: {
      usuarioId: usuario.id,
      token: tokenHasheado,
      expiresAt,
    },
  });

  const resetUrl = `${APP_URL}/reset-password?token=${tokenCrudo}&uid=${usuario.id}`;

  // Enviar email
  await getResend().emails.send({
    from: FROM,
    to: usuario.email,
    subject: "Restablecer contraseña — InmoLibres",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #14110E; font-size: 24px; margin: 0 0 8px;">InmoLibres</h2>
        <p style="color: #3A332C; margin: 0 0 16px;">Hola ${usuario.nombre},</p>
        <p style="color: #3A332C; margin: 0 0 20px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        </p>
        <a href="${resetUrl}" style="
          display: inline-block;
          background: #C1694F;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin: 0 0 20px;
        ">Restablecer contraseña</a>
        <p style="color: #6F665C; font-size: 14px; margin: 0 0 8px;">
          Este enlace expira en 1 hora. Si no solicitaste este cambio, ignorá este email.
        </p>
        <p style="color: #9CA3AF; font-size: 12px; margin: 0; word-break: break-all;">
          Si el botón no funciona, copiá este enlace: ${resetUrl}
        </p>
      </div>
    `,
  });

  return RESPUESTA_GENERICA;
}
