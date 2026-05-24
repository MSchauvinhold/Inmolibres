import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import type { RolContacto } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;
  const { id } = await params;

  const contacto = await db.contacto.findFirst({
    where: { id, inmobiliariaId },
    include: {
      garante: { include: { documentos: { orderBy: { createdAt: "asc" } } } },
      documentos: { orderBy: { createdAt: "asc" } },
      contratos: {
        include: {
          contrato: {
            include: { propiedad: { select: { titulo: true, direccion: true } } },
          },
        },
      },
    },
  });

  if (!contacto) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: contacto });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;
  const { id } = await params;

  const existing = await db.contacto.findFirst({ where: { id, inmobiliariaId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    roles?: RolContacto[];
    nombre?: string;
    dni?: string;
    fechaNacimiento?: string | null;
    domicilio?: string;
    telefono?: string;
    email?: string;
    estadoCivil?: string;
    ocupacion?: string;
    notas?: string;
  };

  const updated = await db.contacto.update({
    where: { id },
    data: {
      ...(body.roles !== undefined && { roles: body.roles }),
      ...(body.nombre !== undefined && { nombre: body.nombre.trim() }),
      ...(body.dni !== undefined && { dni: body.dni?.trim() || null }),
      ...(body.fechaNacimiento !== undefined && {
        fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      }),
      ...(body.domicilio !== undefined && { domicilio: body.domicilio?.trim() || null }),
      ...(body.telefono !== undefined && { telefono: body.telefono?.trim() || null }),
      ...(body.email !== undefined && { email: body.email?.trim() || null }),
      ...(body.estadoCivil !== undefined && { estadoCivil: body.estadoCivil?.trim() || null }),
      ...(body.ocupacion !== undefined && { ocupacion: body.ocupacion?.trim() || null }),
      ...(body.notas !== undefined && { notas: body.notas?.trim() || null }),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;
  const { id } = await params;

  const existing = await db.contacto.findFirst({ where: { id, inmobiliariaId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.contacto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
