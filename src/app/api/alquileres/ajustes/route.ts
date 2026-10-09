import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { proximaFechaAjuste } from "@/lib/ajustes";

// GET — lista ajustes de la inmobiliaria. ?estado=pendiente | aplicado
export async function GET(request: Request) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  const url = new URL(request.url);
  const estado = url.searchParams.get("estado"); // "pendiente" | "aplicado" | null(todos)
  const contratoId = url.searchParams.get("contratoId"); // historial de un contrato

  // Próximos ajustes (hasta 35 días): para avisarle al inquilino con un mes de anticipación
  if (estado === "proximos") {
    const hoy = new Date();
    const hoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
    const contratos = await db.contratoAlquiler.findMany({
      where: { inmobiliariaId, ajusteActivo: true, fechaFin: { gt: hoy }, historialAjustes: { none: { aplicado: false } } },
      select: {
        id: true, inquilinoNombre: true, inquilinoTel: true, ajusteIndice: true, ajusteMeses: true, ajusteDia: true,
        fechaInicio: true, fechaUltimoAjuste: true, fechaFin: true, precioMensual: true, moneda: true,
        propiedad: { select: { titulo: true } },
      },
    });
    const data = contratos
      .map((c) => ({ c, fecha: proximaFechaAjuste(c) }))
      .filter(({ c, fecha }) => fecha <= c.fechaFin && fecha.getTime() >= hoyUtc && fecha.getTime() - hoyUtc <= 35 * 86_400_000)
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      .map(({ c, fecha }) => ({
        contratoId: c.id,
        fecha: fecha.toISOString().slice(0, 10),
        indice: c.ajusteIndice ?? "ICL",
        ajusteMeses: c.ajusteMeses,
        precioActual: Number(c.precioMensual),
        moneda: c.moneda,
        inquilinoNombre: c.inquilinoNombre,
        inquilinoTel: c.inquilinoTel,
        propiedadTitulo: c.propiedad.titulo,
      }));
    return NextResponse.json({ data });
  }

  const aplicadoFilter =
    estado === "pendiente" ? { aplicado: false } :
    estado === "aplicado" ? { aplicado: true } : {};

  const ajustes = await db.ajusteAlquiler.findMany({
    where: {
      ...aplicadoFilter,
      ...(contratoId ? { contratoId } : {}),
      contrato: { inmobiliariaId },
    },
    orderBy: { fechaAjuste: "desc" },
    include: {
      contrato: {
        select: {
          id: true,
          inquilinoNombre: true,
          inquilinoTel: true,
          ajusteIndice: true,
          propiedad: { select: { titulo: true, direccion: true } },
        },
      },
    },
  });

  const data = ajustes.map((a) => ({
    id: a.id,
    contratoId: a.contratoId,
    fechaAjuste: a.fechaAjuste.toISOString(),
    precioAnterior: Number(a.precioAnterior),
    precioNuevo: Number(a.precioNuevo),
    moneda: a.moneda,
    indiceInicio: a.indiceInicio,
    indiceFin: a.indiceFin,
    porcentajeAumento: a.porcentajeAumento,
    indiceUsado: a.indiceUsado,
    indiceContrato: a.contrato.ajusteIndice ?? "ICL",
    aplicado: a.aplicado,
    inquilinoNombre: a.contrato.inquilinoNombre,
    inquilinoTel: a.contrato.inquilinoTel,
    propiedadTitulo: a.contrato.propiedad.titulo,
    propiedadDireccion: a.contrato.propiedad.direccion,
  }));

  return NextResponse.json({ data });
}
