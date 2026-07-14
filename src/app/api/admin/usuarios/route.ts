import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";

/**
 * Lista global de TODOS los usuarios del sistema (todas las inmobiliarias),
 * con el nombre de la inmobiliaria a la que pertenecen. Solo SUPERADMIN.
 */
export async function GET() {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  try {
    const usuarios = await db.usuario.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
        inmobiliaria: {
          select: { id: true, nombre: true, estado: true },
        },
      },
    });

    return NextResponse.json({ data: usuarios });
  } catch {
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}
