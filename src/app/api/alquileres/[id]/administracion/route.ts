import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { generarOperacionAdministracion } from "@/lib/operaciones";

type Params = { params: Promise<{ id: string }> };

/**
 * Registra el cobro de administración del MES ACTUAL como ingreso real
 * (crea una OperacionCerrada). Evita duplicados: un solo registro por contrato y mes.
 */
export async function POST(_req: Request, { params }: Params) {
  const { id: contratoId } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, userId } = session;

  const contrato = await db.contratoAlquiler.findUnique({
    where: { id: contratoId },
    select: {
      inmobiliariaId: true, propiedadId: true, precioMensual: true,
      moneda: true, administracionPct: true, inquilinoNombre: true,
      propiedad: { select: { titulo: true } },
    },
  });

  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  if (contrato.inmobiliariaId !== inmobiliariaId) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  if (!contrato.administracionPct || contrato.administracionPct <= 0) {
    return NextResponse.json({ error: "Este contrato no tiene administración configurada" }, { status: 400 });
  }

  // Mes actual (referencia para anti-duplicado)
  const ahora = new Date();
  const refMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;

  // ¿Ya se registró la administración de este contrato este mes?
  const yaExiste = await db.operacionCerrada.findFirst({
    where: {
      inmobiliariaId,
      notas: { contains: `adm:${contratoId}:${refMes}` },
    },
    select: { id: true },
  });
  if (yaExiste) {
    return NextResponse.json(
      { error: "Ya registraste la administración de este mes para este contrato" },
      { status: 409 }
    );
  }

  const mesLabel = ahora.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const etiqueta = `${mesLabel} — ${contrato.propiedad?.titulo ?? "Alquiler"} (${contrato.inquilinoNombre})`;

  try {
    const op = await generarOperacionAdministracion({
      inmobiliariaId,
      agenteId: userId,
      contratoId,
      precioMensual: Number(contrato.precioMensual),
      administracionPct: contrato.administracionPct,
      moneda: contrato.moneda,
      propiedadId: contrato.propiedadId,
      etiqueta,
      refMes,
    });
    return NextResponse.json(
      { ok: true, monto: Number(op.comisionTotal), mes: mesLabel },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Error al registrar la administración" }, { status: 500 });
  }
}
