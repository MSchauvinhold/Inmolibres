import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCrmAuth, isNextResponse } from "@/lib/api-auth";
import type { Prisma } from "@prisma/client";

// Acciones sobre uno o varios prospectos del tablero:
// - archivar / desarchivar: solo prospectos CERRADOS. Salen del tablero pero no se
//   borran (siguen contando en reportes y se pueden ver con "Ver archivados").
// - eliminar: solo prospectos PERDIDOS, y solo el ADMIN (o el particular con los suyos).
const loteSchema = z.object({
  accion: z.enum(["archivar", "desarchivar", "eliminar"]),
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(request: NextRequest) {
  const session = await requireCrmAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const parsed = loteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { accion, ids } = parsed.data;

  // Mismo alcance que la página de Prospectos: el particular ve los suyos, el agente
  // los asignados a él y el admin todos los de su inmobiliaria.
  let alcance: Prisma.ClienteWhereInput;
  if (rol === "PARTICULAR") {
    alcance = { agenteId: userId, inmobiliariaId: null };
  } else if (inmobiliariaId) {
    alcance = { inmobiliariaId, ...(rol === "AGENTE" ? { agenteId: userId } : {}) };
  } else {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    if (accion === "eliminar") {
      if (rol !== "ADMIN" && rol !== "PARTICULAR") {
        return NextResponse.json({ error: "Solo el administrador puede eliminar prospectos" }, { status: 403 });
      }
      const borrables = await db.cliente.findMany({
        where: { ...alcance, id: { in: ids }, estadoPipeline: "PERDIDO" },
        select: { id: true },
      });
      const idsOk = borrables.map((c) => c.id);
      if (idsOk.length === 0) {
        return NextResponse.json({ error: "Solo se pueden eliminar prospectos perdidos" }, { status: 400 });
      }
      // Igual que DELETE /api/clientes/[id]: las visitas (FK RESTRICT) se van con el
      // prospecto y las tasaciones sobreviven desvinculadas.
      const [, , eliminados] = await db.$transaction([
        db.visita.deleteMany({ where: { clienteId: { in: idsOk } } }),
        db.tasacion.updateMany({ where: { clienteId: { in: idsOk } }, data: { clienteId: null } }),
        db.cliente.deleteMany({ where: { id: { in: idsOk } } }),
      ]);
      return NextResponse.json({ data: { count: eliminados.count, ids: idsOk } });
    }

    const where: Prisma.ClienteWhereInput = { ...alcance, id: { in: ids }, estadoPipeline: "CERRADO" };
    const afectados = await db.cliente.findMany({ where, select: { id: true } });
    const res = await db.cliente.updateMany({
      where: { id: { in: afectados.map((c) => c.id) } },
      data: { archivadoAt: accion === "archivar" ? new Date() : null },
    });
    if (res.count === 0) {
      return NextResponse.json({ error: "Solo se pueden archivar prospectos cerrados" }, { status: 400 });
    }
    return NextResponse.json({ data: { count: res.count, ids: afectados.map((c) => c.id) } });
  } catch (e) {
    console.error("[POST /api/clientes/lote]", e);
    return NextResponse.json({ error: "Error al procesar los prospectos" }, { status: 500 });
  }
}
