import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contratoSchema } from "@/lib/validations/rental";
import { buildPaginationMeta } from "@/lib/utils";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { obtenerIndiceActual } from "@/lib/indices";
import type { Prisma, EstadoPago } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId } = session;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const estadoPago = searchParams.get("estadoPago") as EstadoPago | null;
  const soloActivos = searchParams.get("soloActivos") !== "false";

  const where: Prisma.ContratoAlquilerWhereInput = { inmobiliariaId };

  if (estadoPago) where.estadoPago = estadoPago;
  if (soloActivos) where.fechaFin = { gte: new Date() };

  const skip = (page - 1) * pageSize;

  try {
    const [total, contratos] = await Promise.all([
      db.contratoAlquiler.count({ where }),
      db.contratoAlquiler.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { fechaFin: "asc" },
        include: {
          propiedad: {
            select: {
              id: true,
              titulo: true,
              direccion: true,
              slug: true,
              tipo: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: contratos,
      meta: buildPaginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener alquileres" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, rol } = session;

  if (rol !== "ADMIN" && rol !== "AGENTE") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = contratoSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[POST /api/alquileres] Zod errors:", JSON.stringify(parsed.error.flatten(), null, 2));
    console.error("[POST /api/alquileres] Body recibido:", JSON.stringify(body, null, 2));
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const propiedad = await db.propiedad.findUnique({
      where: { id: parsed.data.propiedadId },
      select: { inmobiliariaId: true },
    });

    if (!propiedad || propiedad.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    // Si tiene ajuste activo, guardar el índice base de hoy para futuros cálculos
    let indiceBase: number | null = null;
    if (parsed.data.ajusteActivo) {
      const idx = await obtenerIndiceActual(parsed.data.ajusteIndice);
      indiceBase = idx?.valor ?? null;
    }

    // Extraer campos que NO van directo al modelo (son solo meta-datos del request)
    const { inquilinoContactoId, garanteContactoId, ...contratoData } = parsed.data;

    const contrato = await db.$transaction(async (tx) => {
      const created = await tx.contratoAlquiler.create({
        data: {
          ...contratoData,
          precioMensual: contratoData.precioMensual,
          fechaInicio: new Date(contratoData.fechaInicio),
          fechaFin: new Date(contratoData.fechaFin),
          inmobiliariaId,
          precioOriginal: contratoData.precioMensual,
          indiceUltimoAjuste: indiceBase,
        },
        include: {
          propiedad: { select: { id: true, titulo: true, direccion: true } },
        },
      });

      await tx.propiedad.update({
        where: { id: contratoData.propiedadId },
        data: { estado: "ALQUILADA" },
      });

      // Vincular contactos al contrato (para acceso desde el módulo de Contactos)
      const personas: { contratoId: string; contactoId: string; rol: string }[] = [];
      if (inquilinoContactoId) personas.push({ contratoId: created.id, contactoId: inquilinoContactoId, rol: "INQUILINO" });
      if (garanteContactoId)   personas.push({ contratoId: created.id, contactoId: garanteContactoId,   rol: "GARANTE" });
      if (personas.length > 0) {
        await tx.contratoPersona.createMany({ data: personas, skipDuplicates: true });
      }

      return created;
    });

    return NextResponse.json({ data: contrato }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear contrato de alquiler" }, { status: 500 });
  }
}
