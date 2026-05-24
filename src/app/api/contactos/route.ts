import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import type { RolContacto } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const rol = searchParams.get("rol") as RolContacto | null;

  const contactos = await db.contacto.findMany({
    where: {
      inmobiliariaId,
      ...(rol ? { roles: { has: rol } } : {}),
      ...(q ? {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { dni: { contains: q } },
          { telefono: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      garante: { select: { id: true } },
      _count: { select: { documentos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: contactos });
}

export async function POST(req: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;

  const body = await req.json() as {
    roles: RolContacto[];
    nombre: string;
    dni?: string;
    fechaNacimiento?: string;
    domicilio?: string;
    telefono?: string;
    email?: string;
    estadoCivil?: string;
    ocupacion?: string;
    notas?: string;
  };

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const contacto = await db.contacto.create({
    data: {
      inmobiliariaId,
      roles: body.roles ?? [],
      nombre: body.nombre.trim(),
      dni: body.dni?.trim() || null,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      domicilio: body.domicilio?.trim() || null,
      telefono: body.telefono?.trim() || null,
      email: body.email?.trim() || null,
      estadoCivil: body.estadoCivil?.trim() || null,
      ocupacion: body.ocupacion?.trim() || null,
      notas: body.notas?.trim() || null,
    },
  });

  return NextResponse.json({ data: contacto }, { status: 201 });
}
