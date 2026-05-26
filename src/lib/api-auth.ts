import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export interface ApiSession {
  userId: string;
  rol: string;
  inmobiliariaId: string | null;
  inmobiliariaEstado: string | null;
  plan: string | null;
}

export async function requireAuth(): Promise<ApiSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return {
    userId: session.user.id,
    rol: session.user.rol,
    inmobiliariaId: session.user.inmobiliariaId,
    inmobiliariaEstado: session.user.inmobiliariaEstado ?? null,
    plan: session.user.plan ?? null,
  };
}

export async function requireInmobiliariaAuth(): Promise<ApiSession & { inmobiliariaId: string } | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!result.inmobiliariaId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Bloquear inmobiliarias suspendidas a nivel de API
  if (result.inmobiliariaEstado === "SUSPENDIDA") {
    return NextResponse.json({ error: "Inmobiliaria suspendida" }, { status: 403 });
  }
  return result as ApiSession & { inmobiliariaId: string };
}

// Allows ADMIN, AGENTE, PARTICULAR (inmobiliariaId may be null for PARTICULAR)
export async function requireCrmAuth(): Promise<ApiSession | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!["ADMIN", "AGENTE", "PARTICULAR"].includes(result.rol)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  // Bloquear inmobiliarias suspendidas (PARTICULAR no tiene inmobiliaria, no aplica)
  if (result.inmobiliariaEstado === "SUSPENDIDA") {
    return NextResponse.json({ error: "Inmobiliaria suspendida" }, { status: 403 });
  }
  return result;
}

/** Verifica que el usuario tiene plan PRO — para módulos exclusivos */
export async function requirePlanPro(): Promise<ApiSession | NextResponse> {
  const result = await requireInmobiliariaAuth();
  if (result instanceof NextResponse) return result;
  if (result.plan !== "PRO") {
    return NextResponse.json(
      { error: "Módulo disponible solo en plan Pro. Actualizá tu plan." },
      { status: 403 }
    );
  }
  return result;
}

export async function requireSuperAdmin(): Promise<ApiSession | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  return result;
}

export function isNextResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse;
}
