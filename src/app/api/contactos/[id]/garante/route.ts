import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;
  const { id: contactoId } = await params;

  const contacto = await db.contacto.findFirst({ where: { id: contactoId, inmobiliariaId } });
  if (!contacto) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    nombre: string;
    dni?: string;
    fechaNacimiento?: string;
    domicilio?: string;
    telefono?: string;
    relacionConContacto?: string;
  };

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const garante = await db.garante.upsert({
    where: { contactoId },
    create: {
      contactoId,
      nombre: body.nombre.trim(),
      dni: body.dni?.trim() || null,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      domicilio: body.domicilio?.trim() || null,
      telefono: body.telefono?.trim() || null,
      relacionConContacto: body.relacionConContacto?.trim() || null,
    },
    update: {
      nombre: body.nombre.trim(),
      dni: body.dni?.trim() || null,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      domicilio: body.domicilio?.trim() || null,
      telefono: body.telefono?.trim() || null,
      relacionConContacto: body.relacionConContacto?.trim() || null,
    },
  });

  return NextResponse.json({ data: garante });
}
