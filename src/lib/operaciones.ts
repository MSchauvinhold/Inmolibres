/**
 * operaciones.ts
 * Genera automáticamente la operación financiera (OperacionCerrada) cuando se
 * cierra un contrato — así el módulo de Finanzas se nutre solo, sin recargar
 * los datos a mano.
 *
 * Las funciones NO lanzan: si algo falla, loguean y siguen, para que un problema
 * en Finanzas nunca rompa la creación del contrato.
 */

import { db } from "@/lib/db";
import type { Moneda } from "@prisma/client";

// Lee la config de comisiones de la inmobiliaria (con defaults sensatos)
async function getComisionConfig(inmobiliariaId: string) {
  const cfg = await db.configuracionInmobiliaria.findUnique({
    where: { inmobiliariaId },
    select: { comisionAgentePct: true, comisionAlquilerMeses: true, ivaIncluido: true },
  });
  return {
    agentePct:     cfg?.comisionAgentePct     ?? 30,
    alquilerMeses: cfg?.comisionAlquilerMeses ?? 1,
    ivaIncluido:   cfg?.ivaIncluido           ?? false,
  };
}

// ─── Compraventa ──────────────────────────────────────────────────────────────

export async function generarOperacionVenta(p: {
  inmobiliariaId: string;
  agenteId: string;
  precioVenta: number;
  moneda: Moneda;
  comisionVendedorPct: number;
  comisionCompradorPct: number;
  propiedadId?: string | null;
  notas?: string;
}): Promise<void> {
  try {
    const { agentePct, ivaIncluido } = await getComisionConfig(p.inmobiliariaId);

    const comVend = p.precioVenta * (p.comisionVendedorPct / 100);
    const comComp = p.precioVenta * (p.comisionCompradorPct / 100);
    const subtotal = comVend + comComp;
    const iva = ivaIncluido ? subtotal * 0.21 : 0;
    const comisionTotal = subtotal + iva;
    const comisionAgente = comisionTotal * (agentePct / 100);
    const comisionInmob = comisionTotal - comisionAgente;

    await db.operacionCerrada.create({
      data: {
        inmobiliariaId: p.inmobiliariaId,
        agenteId: p.agenteId,
        tipo: "VENTA",
        precioOperacion: p.precioVenta,
        moneda: p.moneda,
        comisionVendedorPct: p.comisionVendedorPct,
        comisionCompradorPct: p.comisionCompradorPct,
        comisionTotal,
        comisionInmob,
        comisionAgente,
        ivaComision: iva,
        propiedadId: p.propiedadId ?? undefined,
        notas: p.notas ?? "Generado automáticamente desde el boleto de compraventa.",
      },
    });
  } catch (e) {
    console.error("[generarOperacionVenta]", e);
  }
}

// ─── Administración mensual ───────────────────────────────────────────────────
// Registra el cobro de administración de UN mes como ingreso real.
// La llama el endpoint cuando el usuario hace clic en "Registrar cobro".
// Devuelve la operación creada (a diferencia de las otras, acá SÍ propaga errores).

export async function generarOperacionAdministracion(p: {
  inmobiliariaId: string;
  agenteId: string;
  contratoId: string;
  precioMensual: number;
  administracionPct: number;
  moneda: Moneda;
  propiedadId?: string | null;
  etiqueta: string;   // ej: "junio 2026 — Casa X (Juan Pérez)"
  refMes: string;     // ej: "2026-06" (para anti-duplicado)
}) {
  const fee = p.precioMensual * (p.administracionPct / 100);
  return db.operacionCerrada.create({
    data: {
      inmobiliariaId: p.inmobiliariaId,
      agenteId: p.agenteId,
      tipo: "ALQUILER",
      precioOperacion: p.precioMensual,
      moneda: p.moneda,
      comisionVendedorPct: 0,
      comisionCompradorPct: 0,
      comisionTotal: fee,
      comisionInmob: fee,       // la administración es ingreso pleno de la inmobiliaria
      comisionAgente: 0,
      ivaComision: 0,
      propiedadId: p.propiedadId ?? undefined,
      notas: `Administración ${p.etiqueta}. adm:${p.contratoId}:${p.refMes}`,
    },
  });
}

// ─── Alquiler ─────────────────────────────────────────────────────────────────
// La comisión del alquiler se calcula como N meses de canon (config.comisionAlquilerMeses).

export async function generarOperacionAlquiler(p: {
  inmobiliariaId: string;
  agenteId: string;
  precioMensual: number;
  moneda: Moneda;
  propiedadId?: string | null;
  notas?: string;
}): Promise<void> {
  try {
    const { agentePct, alquilerMeses, ivaIncluido } = await getComisionConfig(p.inmobiliariaId);

    // Si la inmobiliaria no cobra comisión inicial (0 meses), no se genera operación.
    if (!alquilerMeses || alquilerMeses <= 0) return;

    const subtotal = p.precioMensual * alquilerMeses;
    const iva = ivaIncluido ? subtotal * 0.21 : 0;
    const comisionTotal = subtotal + iva;
    const comisionAgente = comisionTotal * (agentePct / 100);
    const comisionInmob = comisionTotal - comisionAgente;

    await db.operacionCerrada.create({
      data: {
        inmobiliariaId: p.inmobiliariaId,
        agenteId: p.agenteId,
        tipo: "ALQUILER",
        precioOperacion: p.precioMensual,
        moneda: p.moneda,
        comisionVendedorPct: 0,
        comisionCompradorPct: 0,
        comisionTotal,
        comisionInmob,
        comisionAgente,
        ivaComision: iva,
        propiedadId: p.propiedadId ?? undefined,
        notas: p.notas ?? `Generado automáticamente desde contrato de alquiler (${alquilerMeses} ${alquilerMeses === 1 ? "mes" : "meses"} de comisión).`,
      },
    });
  } catch (e) {
    console.error("[generarOperacionAlquiler]", e);
  }
}
