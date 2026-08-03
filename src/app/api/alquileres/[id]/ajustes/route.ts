import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { obtenerIndiceActual, obtenerIndiceEnFecha } from "@/lib/indices";
import { formatPrice } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

/**
 * POST — genera MANUALMENTE el ajuste por índice de un contrato, sin esperar al cron.
 *
 * El cron diario (/api/cron/ajustes-alquiler) solo procesa contratos cuyo `ajusteDia`
 * coincide con el día de hoy y que ya cumplieron `ajusteMeses`. Eso hace imposible
 * verificar la función sin esperar meses. Este endpoint corre el mismo cálculo para UN
 * contrato salteando esas dos compuertas, para que un ADMIN pueda adelantar un ajuste
 * (o probar la función antes de confiarle contratos reales).
 *
 * Igual que el cron, el ajuste se crea PENDIENTE: no toca el precio del contrato hasta
 * que alguien lo confirma desde la UI.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, rol } = session;

  if (rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo el administrador puede generar ajustes" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const contrato = await db.contratoAlquiler.findFirst({
    where: { id, inmobiliariaId },
    include: {
      propiedad: { select: { titulo: true } },
      historialAjustes: { where: { aplicado: false }, select: { id: true } },
      inmobiliaria: {
        select: {
          usuarios: {
            where: { rol: { in: ["ADMIN", "AGENTE"] }, activo: true },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }
  if (!contrato.ajusteActivo) {
    return NextResponse.json(
      { error: "Este contrato no tiene el ajuste por índice activado" },
      { status: 400 }
    );
  }
  if (contrato.historialAjustes.length > 0) {
    return NextResponse.json(
      { error: "Ya hay un ajuste pendiente para este contrato. Confirmalo o rechazalo antes de generar otro." },
      { status: 409 }
    );
  }

  const tipo = (contrato.ajusteIndice === "IPC" ? "IPC" : "ICL") as "ICL" | "IPC";
  const indice = await obtenerIndiceActual(tipo);
  if (indice == null) {
    return NextResponse.json(
      { error: `No se pudo obtener el índice ${tipo} en este momento. Intentá de nuevo más tarde.` },
      { status: 503 }
    );
  }
  const indiceActual = indice.valor;

  // Sin índice base guardado (contrato viejo, o ajuste activado después de crearlo):
  // lo reconstruimos con el valor que tenía el índice al INICIO del contrato — no el
  // de hoy. Si usáramos el de hoy, la variación daría 0% y se perdería para siempre
  // toda la inflación acumulada desde que arrancó el alquiler.
  let indiceBase = contrato.indiceUltimoAjuste;
  if (indiceBase == null) {
    const desde = contrato.fechaUltimoAjuste ?? contrato.fechaInicio;
    const idxBase = await obtenerIndiceEnFecha(tipo, new Date(desde));
    if (idxBase == null) {
      return NextResponse.json(
        { error: `No se pudo reconstruir el índice ${tipo} base del contrato. Intentá de nuevo más tarde.` },
        { status: 503 }
      );
    }
    indiceBase = idxBase.valor;
    await db.contratoAlquiler.update({
      where: { id },
      data: { indiceUltimoAjuste: indiceBase },
    });
  }
  const variacion = (indiceActual - indiceBase) / indiceBase;

  if (variacion <= 0) {
    return NextResponse.json({
      ok: true,
      generado: false,
      mensaje: `El índice ${tipo} no subió desde el último ajuste (base ${indiceBase}, actual ${indiceActual}). No corresponde aumento.`,
    });
  }

  const precioActual = Number(contrato.precioMensual);
  const precioNuevo = Math.round(precioActual * (1 + variacion));

  const ajuste = await db.ajusteAlquiler.create({
    data: {
      contratoId: contrato.id,
      fechaAjuste: new Date(),
      precioAnterior: precioActual,
      precioNuevo,
      moneda: contrato.moneda,
      indiceInicio: indiceBase,
      indiceFin: indiceActual,
      porcentajeAumento: variacion * 100,
      indiceUsado: tipo,
      aplicado: false,
      notificado: true,
    },
  });

  // Avisar a la inmobiliaria — mismo comportamiento que el cron diario, para que un
  // ajuste pendiente no quede esperando sin que nadie se entere.
  const usuarios = contrato.inmobiliaria?.usuarios ?? [];
  if (usuarios.length > 0) {
    await db.notificacion.createMany({
      data: usuarios.map((u) => ({
        usuarioId: u.id,
        tipo: "AJUSTE_ALQUILER_PENDIENTE" as const,
        titulo: "Ajuste de alquiler pendiente",
        mensaje: `El alquiler de ${contrato.propiedad.titulo} debe actualizarse: de ${formatPrice(precioActual, contrato.moneda)} a ${formatPrice(precioNuevo, contrato.moneda)} (+${(variacion * 100).toFixed(1)}% por ${tipo}).`,
        url: "/alquileres",
      })),
    });
  }

  return NextResponse.json({
    ok: true,
    generado: true,
    data: {
      id: ajuste.id,
      precioAnterior: Number(ajuste.precioAnterior),
      precioNuevo: Number(ajuste.precioNuevo),
      porcentajeAumento: ajuste.porcentajeAumento,
      indiceUsado: ajuste.indiceUsado,
    },
  });
}
