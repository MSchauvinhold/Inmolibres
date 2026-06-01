import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerIndiceActual } from "@/lib/indices";
import { formatPrice } from "@/lib/utils";

function diferenciaEnMeses(desde: Date, hasta: Date): number {
  return (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());
}

// Corre diariamente (0 10 * * *). El código decide qué contratos ajustar HOY.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const resultados: { contratoId: string; precioAnterior: number; precioNuevo: number; porcentaje: number }[] = [];

  // Cache de índices por tipo (1 sola llamada a cada API por ejecución)
  const indiceCache: Record<string, number | null> = {};
  async function indiceDe(tipo: "ICL" | "IPC"): Promise<number | null> {
    if (tipo in indiceCache) return indiceCache[tipo];
    const idx = await obtenerIndiceActual(tipo);
    indiceCache[tipo] = idx?.valor ?? null;
    return indiceCache[tipo];
  }

  const contratos = await db.contratoAlquiler.findMany({
    where: {
      ajusteActivo: true,
      ajusteDia: diaHoy,             // solo los que ajustan este día del mes
      fechaFin: { gt: hoy },         // contrato vigente
    },
    include: {
      propiedad: { select: { titulo: true } },
      inmobiliaria: {
        select: {
          id: true,
          nombre: true,
          usuarios: {
            where: { rol: { in: ["ADMIN", "AGENTE"] }, activo: true },
            select: { id: true },
          },
        },
      },
      historialAjustes: { where: { aplicado: false }, select: { id: true } },
    },
  });

  for (const c of contratos) {
    // Evitar duplicados: si ya hay un ajuste pendiente, saltar
    if (c.historialAjustes.length > 0) continue;

    // ¿Pasaron los meses configurados desde el inicio o el último ajuste?
    const base = c.fechaUltimoAjuste ?? c.fechaInicio;
    const meses = diferenciaEnMeses(new Date(base), hoy);
    if (meses < c.ajusteMeses) continue;

    const tipo = (c.ajusteIndice === "IPC" ? "IPC" : "ICL") as "ICL" | "IPC";
    const indiceActual = await indiceDe(tipo);
    if (indiceActual == null) continue;

    // Si no tiene índice base guardado, lo seteamos ahora y esperamos al próximo ciclo
    const indiceBase = c.indiceUltimoAjuste;
    if (indiceBase == null) {
      await db.contratoAlquiler.update({
        where: { id: c.id },
        data: { indiceUltimoAjuste: indiceActual },
      });
      continue;
    }

    const variacion = (indiceActual - indiceBase) / indiceBase;
    if (variacion <= 0) continue; // sin aumento, no generar ajuste

    const precioActual = Number(c.precioMensual);
    const precioNuevo = Math.round(precioActual * (1 + variacion));
    const porcentaje = variacion * 100;

    // Crear ajuste pendiente (NO aplicado — requiere confirmación humana)
    await db.ajusteAlquiler.create({
      data: {
        contratoId: c.id,
        fechaAjuste: hoy,
        precioAnterior: precioActual,
        precioNuevo,
        moneda: c.moneda,
        indiceInicio: indiceBase,
        indiceFin: indiceActual,
        porcentajeAumento: porcentaje,
        indiceUsado: tipo,
        aplicado: false,
        notificado: true,
      },
    });

    // Notificar a cada usuario de la inmobiliaria
    if (c.inmobiliaria) {
      const msg = `El alquiler de ${c.propiedad.titulo} debe actualizarse: de ${formatPrice(precioActual, c.moneda)} a ${formatPrice(precioNuevo, c.moneda)} (+${porcentaje.toFixed(1)}% por ${tipo}).`;
      await db.notificacion.createMany({
        data: c.inmobiliaria.usuarios.map((u) => ({
          usuarioId: u.id,
          tipo: "AJUSTE_ALQUILER_PENDIENTE" as const,
          titulo: "Ajuste de alquiler pendiente",
          mensaje: msg,
          url: "/alquileres",
        })),
      });
    }

    resultados.push({ contratoId: c.id, precioAnterior: precioActual, precioNuevo, porcentaje });
  }

  return NextResponse.json({ ok: true, procesados: resultados.length, resultados });
}
