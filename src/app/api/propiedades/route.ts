import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propiedadFormSchema } from "@/lib/validations/property";
import { generateUniqueSlug, buildPaginationMeta } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { requireCrmAuth, isNextResponse } from "@/lib/api-auth";
import { toPlanKey, LIMITES_PLAN } from "@/lib/planes";
import type { Prisma, TipoPropiedad, TipoOperacion, EstadoPropiedad, Moneda } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Try to get the authenticated user's session for CRM mode
  const session = await auth();
  const inmobiliariaId = session?.user?.inmobiliariaId ?? null;
  const userRol = session?.user?.rol ?? null;
  const userId = session?.user?.id ?? null;
  const isParticular = userRol === "PARTICULAR";

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

  if (isParticular && userId) {
    // PARTICULAR CRM: show only their own propiedades
    where.agenteId = userId;
  } else if (inmobiliariaId) {
    // ADMIN/AGENTE CRM: show all properties for their inmobiliaria
    where.inmobiliariaId = inmobiliariaId;
  } else {
    // Marketplace: published properties from active inmobiliarias OR particulares
    where.publicada = true;
    where.OR = [
      { inmobiliaria: { estado: { in: ["ACTIVA", "PRUEBA"] } } },
      { inmobiliariaId: null },
    ];
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
  const session = await requireCrmAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol, plan } = session;
  const isParticular = rol === "PARTICULAR";

  if (!isParticular && rol !== "ADMIN" && rol !== "AGENTE") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Verificar límite de propiedades según plan
  const planKey = toPlanKey(plan);
  const maxPropiedades = LIMITES_PLAN[planKey].maxPropiedades;

  if (isParticular) {
    const total = await db.propiedad.count({ where: { agenteId: userId } });
    const limite = LIMITES_PLAN.BASICO.maxPropiedades;
    if (total >= limite) {
      return NextResponse.json(
        { error: `Límite de ${limite} propiedades alcanzado en tu plan. Actualizá a un plan superior.` },
        { status: 403 }
      );
    }
  } else if (maxPropiedades !== null && inmobiliariaId) {
    const total = await db.propiedad.count({ where: { inmobiliariaId } });
    if (total >= maxPropiedades) {
      return NextResponse.json(
        { error: `Límite de ${maxPropiedades} propiedades alcanzado en tu plan. Actualizá a un plan superior.` },
        { status: 403 }
      );
    }
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
        inmobiliariaId: isParticular ? null : inmobiliariaId!,
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
