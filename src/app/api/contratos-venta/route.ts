import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
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

  const { inmobiliariaId } = session;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { fechaEscritura, sena, ...rest } = parsed.data;

  try {
    const venta = await db.contratoVenta.create({
      data: {
        ...rest,
        inmobiliariaId,
        sena: sena ?? null,
        fechaEscritura: fechaEscritura ? new Date(fechaEscritura) : null,
      },
    });

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
