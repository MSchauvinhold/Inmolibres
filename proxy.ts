import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode } from "@auth/core/jwt";
import type { Rol, EstadoInmobiliaria } from "@prisma/client";
import { RUTAS_PRO } from "@/lib/planes";

const COOKIE_NAME = "authjs.session-token";

interface JWTPayload {
  id?: string;
  rol?: Rol;
  inmobiliariaId?: string | null;
  inmobiliariaEstado?: EstadoInmobiliaria | null;
  plan?: string | null;
}

async function getJWT(request: NextRequest): Promise<JWTPayload | null> {
  const raw = request.cookies.get(COOKIE_NAME)?.value
    ?? request.cookies.get(`__Secure-${COOKIE_NAME}`)?.value;
  if (!raw) return null;
  try {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
    const payload = await decode({ token: raw, secret, salt: COOKIE_NAME });
    return payload as JWTPayload | null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getJWT(request);

  const isLoggedIn = !!token;
  const userRol = token?.rol;
  const inmobiliariaEstado = token?.inmobiliariaEstado;
  const plan = token?.plan ?? null;

  // ─── /login ────────────────────────────────────────────────────────────────
  if (pathname === "/login") {
    if (isLoggedIn) {
      if (userRol === "SUPERADMIN") return NextResponse.redirect(new URL("/admin", request.url));
      if (userRol === "PARTICULAR") return NextResponse.redirect(new URL("/particular/propiedades", request.url));
      if (userRol === "ADMIN" || userRol === "AGENTE") return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // ─── /admin/* — solo SUPERADMIN ────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", request.url));
    if (userRol !== "SUPERADMIN") return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // ─── /particular/* — solo PARTICULAR (plan BASICO) ─────────────────────────
  if (pathname.startsWith("/particular")) {
    if (!isLoggedIn) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (userRol !== "PARTICULAR") return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  // ─── /upgrade — requiere sesión ────────────────────────────────────────────
  if (pathname.startsWith("/upgrade")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  // ─── CRM routes — ADMIN y AGENTE ───────────────────────────────────────────
  const crmPrefixes = [
    "/dashboard", "/propiedades", "/clientes", "/visitas",
    "/alquileres", "/consultas", "/configuracion", "/finanzas",
    "/contactos", "/calculadoras",
  ];
  if (crmPrefixes.some((p) => pathname.startsWith(p))) {
    if (!isLoggedIn) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (userRol === "SUPERADMIN") return NextResponse.redirect(new URL("/admin", request.url));
    if (userRol === "PARTICULAR") return NextResponse.redirect(new URL("/particular/propiedades", request.url));
    if (userRol !== "ADMIN" && userRol !== "AGENTE") return NextResponse.redirect(new URL("/", request.url));

    // Verificar estado de suscripción
    if (
      inmobiliariaEstado === "SUSPENDIDA" ||
      (inmobiliariaEstado !== "ACTIVA" && inmobiliariaEstado !== "PRUEBA")
    ) {
      return NextResponse.redirect(new URL("/suspendido", request.url));
    }

    // Verificar límites de plan (PRO-only routes)
    if (plan && plan !== "PRO") {
      const esRutaPro = RUTAS_PRO.some((r) => pathname.startsWith(r));
      if (esRutaPro) {
        return NextResponse.redirect(new URL("/upgrade", request.url));
      }
    }

    return NextResponse.next();
  }

  // ─── /suspendido ───────────────────────────────────────────────────────────
  if (pathname === "/suspendido") {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
