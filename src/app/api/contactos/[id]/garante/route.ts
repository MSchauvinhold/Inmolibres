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

  let body: {
    nombre: string;
    dni?: string;
    fechaNacimiento?: string;
    domicilio?: string;
    telefono?: string;
    relacionConContacto?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  if (body.fechaNacimiento && isNaN(new Date(body.fechaNacimiento).getTime())) {
    return NextResponse.json({ error: "Fecha de nacimiento inválida" }, { status: 400 });
  }

  try {
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
  } catch (e) {
    console.error("[POST /api/contactos/[id]/garante]", e);
    return NextResponse.json({ error: "Error al guardar el garante" }, { status: 500 });
  }
}
