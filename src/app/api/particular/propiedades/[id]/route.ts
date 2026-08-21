import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma, type Moneda } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const MONEDAS_VALIDAS: Moneda[] = ["ARS", "USD"];

/** Devuelve los datos editables de la propiedad para precargar el formulario. */
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.rol !== "PARTICULAR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const propiedad = await db.propiedad.findUnique({
    where: { id },
    select: {
      id: true, agenteId: true, titulo: true, precio: true, moneda: true,
      descripcion: true, publicada: true, direccion: true, slug: true,
    },
  });
  if (!propiedad || propiedad.agenteId !== session.user.id) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    data: { ...propiedad, precio: Number(propiedad.precio) },
  });
}

/**
 * Autogestión rápida para el Dueño Particular: editar precio/descripción y
 * pausar/reactivar (publicada) su propia propiedad, sin pasar por el wizard
 * completo del CRM ni depender de WhatsApp para cada cambio menor.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.rol !== "PARTICULAR") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const existente = await db.propiedad.findUnique({
    where: { id },
    select: { agenteId: true },
  });
  if (!existente || existente.agenteId !== session.user.id) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  let body: { titulo?: string; precio?: number; moneda?: string; descripcion?: string | null; publicada?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const data: Prisma.PropiedadUpdateInput = {};

  if (body.titulo !== undefined) {
    if (typeof body.titulo !== "string" || !body.titulo.trim()) {
      return NextResponse.json({ error: "Título inválido" }, { status: 400 });
    }
    if (body.titulo.trim().length > 200) {
      return NextResponse.json({ error: "El título no puede superar los 200 caracteres" }, { status: 400 });
    }
    data.titulo = body.titulo.trim();
  }

  if (body.precio !== undefined) {
    if (typeof body.precio !== "number" || !Number.isFinite(body.precio) || body.precio <= 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }
    data.precio = body.precio;
  }

  if (body.moneda !== undefined) {
    if (!MONEDAS_VALIDAS.includes(body.moneda as Moneda)) {
      return NextResponse.json({ error: "Moneda inválida" }, { status: 400 });
    }
    data.moneda = body.moneda as Moneda;
  }

  if (body.descripcion !== undefined) {
    if (typeof body.descripcion === "string" && body.descripcion.length > 2000) {
      return NextResponse.json({ error: "La descripción no puede superar los 2000 caracteres" }, { status: 400 });
    }
    data.descripcion = body.descripcion;
  }

  if (body.publicada !== undefined) {
    if (typeof body.publicada !== "boolean") {
      return NextResponse.json({ error: "Valor inválido para publicada" }, { status: 400 });
    }
    data.publicada = body.publicada;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const propiedad = await db.propiedad.update({ where: { id }, data });

  return NextResponse.json({
    data: {
      id: propiedad.id,
      titulo: propiedad.titulo,
      precio: Number(propiedad.precio),
      moneda: propiedad.moneda,
      descripcion: propiedad.descripcion,
      publicada: propiedad.publicada,
    },
  });
}
