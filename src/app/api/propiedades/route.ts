import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propiedadFormSchema } from "@/lib/validations/property";
import { generateUniqueSlug, buildPaginationMeta } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import type { Prisma, TipoPropiedad, TipoOperacion, EstadoPropiedad, Moneda } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Try to get the authenticated user's inmobiliariaId for CRM mode
  const session = await auth();
  const inmobiliariaId = session?.user?.inmobiliariaId ?? null;

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const tipo = searchParams.get("tipo") as TipoPropiedad | null;
  const operacion = searchParams.get("operacion") as TipoOperacion | null;
  const estado = searchParams.get("estado") as EstadoPropiedad | null;
  const moneda = searchParams.get("moneda") as Moneda | null;
  const precioMin = searchParams.get("precioMin");
  const precioMax = searchParams.get("precioMax");
  const search = searchParams.get("search");
  const qInmobiliariaId = searchParams.get("inmobiliariaId");

  const where: Prisma.PropiedadWhereInput = {};

  if (inmobiliariaId) {
    // CRM: show all properties (including unpublished) for this inmobiliaria
    where.inmobiliariaId = inmobiliariaId;
  } else {
    // Marketplace: only show published properties from active inmobiliarias
    where.publicada = true;
    where.inmobiliaria = { estado: { in: ["ACTIVA", "PRUEBA"] } };
    if (qInmobiliariaId) where.inmobiliariaId = qInmobiliariaId;
  }

  if (tipo) where.tipo = tipo;
  if (operacion) where.operacion = operacion;
  if (estado) where.estado = estado;
  if (moneda) where.moneda = moneda;

  if (precioMin || precioMax) {
    where.precio = {};
    if (precioMin) (where.precio as Prisma.DecimalFilter).gte = parseFloat(precioMin);
    if (precioMax) (where.precio as Prisma.DecimalFilter).lte = parseFloat(precioMax);
  }

  if (search) {
    where.OR = [
      { titulo: { contains: search, mode: "insensitive" } },
      { direccion: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * pageSize;

  try {
    const [total, propiedades] = await Promise.all([
      db.propiedad.count({ where }),
      db.propiedad.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          atributos: true,
          fotos: { orderBy: { orden: "asc" } },
          agente: { select: { id: true, nombre: true } },
          inmobiliaria: { select: { id: true, nombre: true, whatsapp: true } },
          _count: { select: { visitas: true, clientesInteresados: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: propiedades,
      meta: buildPaginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener propiedades" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  if (rol !== "ADMIN" && rol !== "AGENTE") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = propiedadFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { atributos, fotos, ...propData } = parsed.data;
  const slug = generateUniqueSlug(propData.titulo);

  try {
    const propiedad = await db.propiedad.create({
      data: {
        ...propData,
        precio: propData.precio,
        inmobiliariaId,
        agenteId: userId,
        slug,
        ...(atributos
          ? { atributos: { create: atributos } }
          : {}),
        ...(fotos?.length
          ? { fotos: { create: fotos } }
          : {}),
      },
      include: {
        atributos: true,
        fotos: { orderBy: { orden: "asc" } },
      },
    });

    return NextResponse.json({ data: propiedad }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear propiedad" }, { status: 500 });
  }
}
