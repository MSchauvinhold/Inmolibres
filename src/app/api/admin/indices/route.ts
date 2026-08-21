import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";
import { obtenerIndiceActual } from "@/lib/indices";

const TIPOS_VALIDOS = ["ICL", "IPC"] as const;

/**
 * Historial de cargas manuales de índices + valor actual de la fuente oficial,
 * para que el SuperAdmin vea si necesita cargar un valor de emergencia.
 */
export async function GET() {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  const [historial, icl, ipc] = await Promise.all([
    db.indiceManual.findMany({ orderBy: { fecha: "desc" }, take: 50 }),
    obtenerIndiceActual("ICL"),
    obtenerIndiceActual("IPC"),
  ]);

  return NextResponse.json({
    data: {
      historial: historial.map((h) => ({
        id: h.id,
        tipo: h.tipo,
        valor: h.valor,
        fecha: h.fecha.toISOString().slice(0, 10),
        createdAt: h.createdAt.toISOString(),
      })),
      actual: { icl, ipc },
    },
  });
}

/** Carga un valor manual de índice (ICL o IPC) para una fecha dada. */
export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  let body: { tipo?: string; valor?: number; fecha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const tipo = body.tipo;
  if (!tipo || !TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])) {
    return NextResponse.json({ error: "Tipo inválido (ICL o IPC)" }, { status: 400 });
  }

  const valor = Number(body.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  if (!body.fecha) {
    return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
  }
  const fecha = new Date(`${body.fecha}T00:00:00.000Z`);
  if (isNaN(fecha.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const creado = await db.indiceManual.create({
    data: { tipo, valor, fecha },
  });

  return NextResponse.json(
    { data: { id: creado.id, tipo: creado.tipo, valor: creado.valor, fecha: creado.fecha.toISOString().slice(0, 10) } },
    { status: 201 }
  );
}
