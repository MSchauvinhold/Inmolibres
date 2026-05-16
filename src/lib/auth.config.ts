import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "@auth/core/jwt";
import type { Rol, EstadoInmobiliaria } from "@prisma/client";

// Edge-compatible auth config — no Node.js-only imports (no Prisma, no bcrypt).
// Used by proxy.ts (Edge Runtime) AND extended by auth.ts (Node.js Runtime).
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    jwt({ token, user }: { token: JWT; user?: unknown }): JWT {
      if (user) {
        const u = user as {
          id?: string;
          nombre: string;
          rol: Rol;
          inmobiliariaId: string | null;
          inmobiliariaEstado: EstadoInmobiliaria | null;
          inmobiliariaNombre: string | null;
        };
        token.id = u.id ?? "";
        token.nombre = u.nombre;
        token.rol = u.rol;
        token.inmobiliariaId = u.inmobiliariaId ?? null;
        token.inmobiliariaEstado = u.inmobiliariaEstado ?? null;
        token.inmobiliariaNombre = u.inmobiliariaNombre ?? null;
      }
      return token;
    },
    session({ session, token }: { session: Session; token: JWT }): Session {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          nombre: token.nombre as string,
          rol: token.rol as Rol,
          inmobiliariaId: (token.inmobiliariaId ?? null) as string | null,
          inmobiliariaEstado: (token.inmobiliariaEstado ?? null) as EstadoInmobiliaria | null,
          inmobiliariaNombre: (token.inmobiliariaNombre ?? null) as string | null,
        },
      };
    },
  },
  providers: [],
} satisfies NextAuthConfig;
