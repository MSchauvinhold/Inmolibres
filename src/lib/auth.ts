import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Rol, EstadoInmobiliaria } from "@prisma/client";
import { authConfig } from "@/lib/auth.config";

// ─── Module Augmentation ──────────────────────────────────────────────────────

declare module "next-auth" {
  interface User {
    id: string;
    nombre: string;
    rol: Rol;
    inmobiliariaId: string | null;
    inmobiliariaEstado: EstadoInmobiliaria | null;
    inmobiliariaNombre: string | null;
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
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const usuario = await db.usuario.findUnique({
          where: { email: credentials.email as string },
          include: {
            inmobiliaria: {
              select: { id: true, estado: true, nombre: true },
            },
          },
        });

        if (!usuario || !usuario.activo) return null;

        const passwordValida = await bcrypt.compare(
          credentials.password as string,
          usuario.passwordHash
        );

        if (!passwordValida) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
          inmobiliariaId: usuario.inmobiliariaId,
          inmobiliariaEstado: usuario.inmobiliaria?.estado ?? null,
          inmobiliariaNombre: usuario.inmobiliaria?.nombre ?? null,
        };
      },
    }),
  ],
});
