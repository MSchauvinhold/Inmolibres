import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actualizarContratoAlquilerSchema } from "@/lib/validations/rental";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { obtenerIndiceEnFecha } from "@/lib/indices";

type Params = { params: Promise<{ id: string }> };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Verifica ownership: el contrato debe pertenecer a la inmobiliaria del usuario. */
async function getContratoOwnedBy(id: string, inmobiliariaId: string) {
  const contrato = await db.contratoAlquiler.findUnique({
    where: { id },
    select: {
      inmobiliariaId: true, propiedadId: true,
      ajusteActivo: true, indiceUltimoAjuste: true,
      fechaInicio: true, fechaUltimoAjuste: true,
    },
  });
  if (!contrato) return null;
  if (contrato.inmobiliariaId !== inmobiliariaId) return false;
  return contrato;
}

// ─── GET /api/alquileres/[id] ─────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  try {
    const contrato = await db.contratoAlquiler.findUnique({
      where: { id },
      include: {
        propiedad: {
          select: { id: true, titulo: true, direccion: true, slug: true, tipo: true },
        },
        pagos: {
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }
    // Multi-tenancy: solo la inmobiliaria dueña puede ver el contrato
    if (contrato.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({ data: contrato });
  } catch {
    return NextResponse.json({ error: "Error al obtener contrato" }, { status: 500 });
  }
}

// ─── PUT /api/alquileres/[id] ─────────────────────────────────────────────────
// Acepta estadoPago y/o notas.

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = actualizarContratoAlquilerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await getContratoOwnedBy(id, inmobiliariaId);
    if (existing === null) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }
    if (existing === false) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { estadoPago, notas, ajusteActivo, ajusteIndice, ajusteMeses, ajusteDia, administracionPct, contratoFirmadoUrl, fechaFirmado } = parsed.data;

    // Si acá se está activando el ajuste (o cambiando de índice) y todavía no hay base
    // registrada, hay que fijarla ahora — usando el valor del índice al inicio del
    // contrato, no el de hoy. Sin esto el ajuste queda sin base y nunca calcula nada.
    let indiceBaseUpdate: { indiceUltimoAjuste?: number } = {};
    const activandoAjuste = ajusteActivo === true && !existing.ajusteActivo;
    const cambiandoIndice = ajusteIndice !== undefined && ajusteActivo !== false;
    if ((activandoAjuste || cambiandoIndice) && existing.indiceUltimoAjuste == null) {
      const tipo = (ajusteIndice ?? "ICL") as "ICL" | "IPC";
      const desde = existing.fechaUltimoAjuste ?? existing.fechaInicio;
      const idx = await obtenerIndiceEnFecha(tipo, new Date(desde));
      if (idx) indiceBaseUpdate = { indiceUltimoAjuste: idx.valor };
    }

    const contrato = await db.contratoAlquiler.update({
      where: { id },
      data: {
        ...(estadoPago           !== undefined && { estadoPago }),
        ...(notas                !== undefined && { notas }),
        ...(ajusteActivo         !== undefined && { ajusteActivo }),
        ...(ajusteIndice         !== undefined && { ajusteIndice }),
        ...(ajusteMeses          !== undefined && { ajusteMeses }),
        ...(ajusteDia            !== undefined && { ajusteDia }),
        ...(administracionPct    !== undefined && { administracionPct }),
        ...(contratoFirmadoUrl   !== undefined && { contratoFirmadoUrl }),
        ...(fechaFirmado         !== undefined && { fechaFirmado: fechaFirmado ? new Date(fechaFirmado) : null }),
        ...indiceBaseUpdate,
      },
    });

    return NextResponse.json({ data: contrato });
  } catch {
    return NextResponse.json({ error: "Error al actualizar contrato" }, { status: 500 });
  }
}

// ─── DELETE /api/alquileres/[id] ──────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, rol } = session;

  if (rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo el administrador puede eliminar contratos" },
      { status: 403 }
    );
  }

  try {
    const existing = await getContratoOwnedBy(id, inmobiliariaId);
    if (existing === null) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }
    if (existing === false) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    await db.$transaction([
      // Borrar en cascada las operaciones de Finanzas que este contrato generó
      // (comisión inicial + cobros de administración) — si no, quedan huérfanas.
      db.operacionCerrada.deleteMany({ where: { contratoId: id } }),
      db.contratoAlquiler.delete({ where: { id } }),
      db.propiedad.updateMany({
        where: {
          id: existing.propiedadId,
          contratos: { none: { fechaFin: { gte: new Date() }, id: { not: id } } },
        },
        data: { estado: "DISPONIBLE" },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar contrato" }, { status: 500 });
  }
}
