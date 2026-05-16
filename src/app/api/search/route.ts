import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ propiedades: [], clientes: [], contratos: [] });

  const contains = { contains: q, mode: "insensitive" as const };

  try {
    const [propiedades, clientes, contratos] = await Promise.all([
      db.propiedad.findMany({
        where: {
          inmobiliariaId,
          OR: [{ titulo: contains }, { direccion: contains }],
        },
        select: { id: true, titulo: true, direccion: true, tipo: true, operacion: true },
        take: 5,
      }),
      db.cliente.findMany({
        where: {
          inmobiliariaId,
          OR: [{ nombre: contains }, { telefono: contains }],
        },
        select: { id: true, nombre: true, telefono: true, estadoPipeline: true },
        take: 5,
      }),
      db.contratoAlquiler.findMany({
        where: {
          inmobiliariaId,
          OR: [
            { inquilinoNombre: contains },
            { propiedad: { titulo: contains } },
          ],
        },
        select: { id: true, inquilinoNombre: true, propiedad: { select: { titulo: true } } },
        take: 5,
      }),
    ]);

    return NextResponse.json({ propiedades, clientes, contratos });
  } catch {
    return NextResponse.json({ error: "Error en búsqueda" }, { status: 500 });
  }
}
