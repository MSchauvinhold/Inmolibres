import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { generarOperacionVenta } from "@/lib/operaciones";
import { z } from "zod";

const createSchema = z.object({
  propiedadDireccion:   z.string().min(1),
  propiedadDescripcion: z.string().optional(),
  matriculaInmueble:    z.string().optional(),
  vendedorNombre:       z.string().min(1),
  vendedorDni:          z.string().min(1),
  vendedorDomicilio:    z.string().optional(),
  vendedorEstadoCivil:  z.string().default("soltero"),
  vendedorConyuge:      z.string().optional(),
  compradorNombre:      z.string().min(1),
  compradorDni:         z.string().min(1),
  compradorDomicilio:   z.string().optional(),
  compradorEstadoCivil: z.string().default("soltero"),
  compradorConyuge:     z.string().optional(),
  precioVenta:          z.number().positive(),
  moneda:               z.enum(["ARS", "USD"]).default("USD"),
  sena:                 z.number().nonnegative().optional(),
  comisionVendedorPct:  z.number().min(0).max(100).default(3),
  comisionCompradorPct: z.number().min(0).max(100).default(3),
  formaPago:            z.string().default("Contado"),
  escribanoNombre:      z.string().optional(),
  escribanoRegistro:    z.string().optional(),
  fechaEscritura:       z.string().optional(),
  clausulas:            z.string().optional(),
  tipoFirma:            z.enum(["DIGITAL", "MANUAL"]).optional().default("MANUAL"),
  // Si es false, no se genera la operación de comisión en Finanzas al crear la venta
  registrarEnFinanzas:  z.boolean().optional().default(true),
  // Propiedad del sistema elegida en el wizard (opcional) y estado a dejarle: el wizard
  // sugiere RESERVADA pero el agente decide; null/ausente = no tocar el estado.
  propiedadId:          z.string().optional().nullable(),
  estadoPropiedad:      z.enum(["RESERVADA", "ALQUILADA", "VENDIDA"]).optional().nullable(),
});

export async function GET() {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;

  const { inmobiliariaId } = session;

  const ventas = await db.contratoVenta.findMany({
    where: { inmobiliariaId },
    orderBy: { createdAt: "desc" },
  });

  const serialized = ventas.map((v) => ({
    ...v,
    precioVenta: Number(v.precioVenta),
    sena: v.sena !== null ? Number(v.sena) : null,
    fechaEscritura: v.fechaEscritura ? v.fechaEscritura.toISOString().slice(0, 10) : null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }));

  return NextResponse.json({ data: serialized });
}

export async function POST(req: Request) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;

  const { inmobiliariaId, userId } = session;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { fechaEscritura, sena, registrarEnFinanzas, propiedadId, estadoPropiedad, ...rest } = parsed.data;

  try {
    if (propiedadId) {
      const propiedad = await db.propiedad.findUnique({ where: { id: propiedadId }, select: { inmobiliariaId: true } });
      if (!propiedad || propiedad.inmobiliariaId !== inmobiliariaId) {
        return NextResponse.json({ error: "Propiedad no válida para esta inmobiliaria" }, { status: 400 });
      }
    }

    const venta = await db.$transaction(async (tx) => {
      const created = await tx.contratoVenta.create({
        data: {
          ...rest,
          inmobiliariaId,
          propiedadId: propiedadId || null,
          sena: sena ?? null,
          fechaEscritura: fechaEscritura ? new Date(fechaEscritura) : null,
        },
      });
      // No toca `publicada`: una propiedad reservada/vendida sigue en el portal con etiqueta
      if (propiedadId && estadoPropiedad) {
        await tx.propiedad.update({ where: { id: propiedadId }, data: { estado: estadoPropiedad } });
      }
      return created;
    });

    // Generar la operación financiera automáticamente (no bloquea si falla) —
    // salvo que el usuario haya destildado "Registrar en Finanzas" en el wizard.
    if (registrarEnFinanzas) {
      await generarOperacionVenta({
        inmobiliariaId,
        agenteId: userId,
        precioVenta: Number(venta.precioVenta),
        moneda: venta.moneda,
        comisionVendedorPct: venta.comisionVendedorPct,
        comisionCompradorPct: venta.comisionCompradorPct,
        contratoId: venta.id,
      });
    }

    return NextResponse.json({
      data: {
        ...venta,
        precioVenta: Number(venta.precioVenta),
        sena: venta.sena !== null ? Number(venta.sena) : null,
        fechaEscritura: venta.fechaEscritura ? venta.fechaEscritura.toISOString().slice(0, 10) : null,
        createdAt: venta.createdAt.toISOString(),
        updatedAt: venta.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/contratos-venta]", e);
    return NextResponse.json({ error: "Error al crear boleto" }, { status: 500 });
  }
}
