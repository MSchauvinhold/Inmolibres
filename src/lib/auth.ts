import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Rol, EstadoInmobiliaria } from "@prisma/client";
import { authConfig } from "@/lib/auth.config";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// ─── Module Augmentation ──────────────────────────────────────────────────────

declare module "next-auth" {
  interface User {
    id: string;
    nombre: string;
    rol: Rol;
    inmobiliariaId: string | null;
    inmobiliariaEstado: EstadoInmobiliaria | null;
    inmobiliariaNombre: string | null;
    plan: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      nombre: string;
      rol: Rol;
      inmobiliariaId: string | null;
      inmobiliariaEstado: EstadoInmobiliaria | null;
      inmobiliariaNombre: string | null;
      plan: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    nombre: string;
    rol: Rol;
    inmobiliariaId: string | null;
    inmobiliariaEstado: EstadoInmobiliaria | null;
    inmobiliariaNombre: string | null;
    plan: string | null;
  }
}

// ─── Auth Config ──────────────────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials, request) => {
        if (!credentials?.email || !credentials?.password) return null;

        // Freno a la fuerza bruta, mismo criterio que forgot/reset-password: una
        // cuenta concreta aguanta pocos intentos por IP, y una misma IP no puede
        // barrer muchas cuentas distintas. Cuenta todos los intentos, no solo los
        // fallidos — con el volumen de usuarios de esto no molesta a nadie.
        const ip = getClientIp(request);
        const emailKey = String(credentials.email).trim().toLowerCase();
        const VENTANA = 15 * 60 * 1000;
        if (
          isRateLimited(`login:${ip}:${emailKey}`, { limit: 8, windowMs: VENTANA }) ||
          isRateLimited(`login-ip:${ip}`, { limit: 30, windowMs: VENTANA })
        ) {
          return null;
        }

        const usuario = await db.usuario.findUnique({
          where: { email: credentials.email as string },
          include: {
            inmobiliaria: {
              select: { id: true, estado: true, nombre: true, plan: true },
            },
          },
        });

        if (!usuario || !usuario.activo) return null;

        const passwordValida = await bcrypt.compare(
          credentials.password as string,
          usuario.passwordHash
        );

        if (!passwordValida) return null;

        // Plan: PARTICULAR → BASICO, ADMIN/AGENTE → from inmobiliaria, SUPERADMIN → PRO
        const plan = usuario.rol === "PARTICULAR"
          ? "BASICO"
          : usuario.rol === "SUPERADMIN"
          ? "PRO"
          : (usuario.inmobiliaria?.plan ?? "AVANZADO");

        return {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
          inmobiliariaId: usuario.inmobiliariaId,
          inmobiliariaEstado: usuario.inmobiliaria?.estado ?? null,
          inmobiliariaNombre: usuario.inmobiliaria?.nombre ?? null,
          plan,
        };
      },
    }),
  ],
});
