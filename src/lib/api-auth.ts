import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export interface ApiSession {
  userId: string;
  rol: string;
  inmobiliariaId: string | null;
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
  };
}

export async function requireInmobiliariaAuth(): Promise<ApiSession & { inmobiliariaId: string } | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!result.inmobiliariaId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return result as ApiSession & { inmobiliariaId: string };
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
