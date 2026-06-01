import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

// GET — lista ajustes de la inmobiliaria. ?estado=pendiente | aplicado
export async function GET(request: Request) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  const url = new URL(request.url);
  const estado = url.searchParams.get("estado"); // "pendiente" | "aplicado" | null(todos)
  const contratoId = url.searchParams.get("contratoId"); // historial de un contrato

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
    aplicado: a.aplicado,
    inquilinoNombre: a.contrato.inquilinoNombre,
    inquilinoTel: a.contrato.inquilinoTel,
    propiedadTitulo: a.contrato.propiedad.titulo,
    propiedadDireccion: a.contrato.propiedad.direccion,
  }));

  return NextResponse.json({ data });
}
