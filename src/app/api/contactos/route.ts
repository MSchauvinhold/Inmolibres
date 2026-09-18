import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, checkPermisoAgente, isNextResponse } from "@/lib/api-auth";
import { telefonosCoinciden } from "@/lib/utils";
import type { RolContacto } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;

  // El permiso `verClientes` gatea /contactos en el sidebar y en la página; sin
  // esto mismo acá, un AGENTE con el permiso desactivado igual llega por la API.
  const sinPermiso = await checkPermisoAgente(session, "verClientes", "Contactos");
  if (sinPermiso) return sinPermiso;

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

  // El permiso `verClientes` gatea /contactos en el sidebar y en la página; sin
  // esto mismo acá, un AGENTE con el permiso desactivado igual llega por la API.
  const sinPermiso = await checkPermisoAgente(session, "verClientes", "Contactos");
  if (sinPermiso) return sinPermiso;

  let body: {
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
    // Un contacto por teléfono dentro de la inmobiliaria (mismo criterio que POST
    // /api/clientes). Un duplicado acá contamina después los vínculos con contratos y
    // boletos. El teléfono es opcional en contactos: sin teléfono no hay con qué comparar.
    if (body.telefono?.trim()) {
      const existentes = await db.contacto.findMany({
        where: { inmobiliariaId, telefono: { not: null } },
        select: { id: true, nombre: true, dni: true, telefono: true, domicilio: true, estadoCivil: true, email: true },
      });
      const duplicado = existentes.find((c) => telefonosCoinciden(c.telefono!, body.telefono!));
      if (duplicado) {
        return NextResponse.json(
          {
            error: `Ya existe un contacto con ese teléfono: ${duplicado.nombre}`,
            existenteId: duplicado.id,
            // Datos mínimos para que el selector del wizard de contratos lo elija directo
            existente: duplicado,
          },
          { status: 409 }
        );
      }
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
  } catch (e) {
    console.error("[POST /api/contactos]", e);
    return NextResponse.json({ error: "Error al crear el contacto" }, { status: 500 });
  }
}
