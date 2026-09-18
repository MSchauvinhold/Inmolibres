import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, checkPermisoAgente, isNextResponse } from "@/lib/api-auth";
import type { RolContacto } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;

  // El permiso `verClientes` gatea /contactos en el sidebar y en la página; sin
  // esto mismo acá, un AGENTE con el permiso desactivado igual llega por la API.
  const sinPermiso = await checkPermisoAgente(session, "verClientes", "Contactos");
  if (sinPermiso) return sinPermiso;

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

  // El permiso `verClientes` gatea /contactos en el sidebar y en la página; sin
  // esto mismo acá, un AGENTE con el permiso desactivado igual llega por la API.
  const sinPermiso = await checkPermisoAgente(session, "verClientes", "Contactos");
  if (sinPermiso) return sinPermiso;

  const { id } = await params;

  const existing = await db.contacto.findFirst({ where: { id, inmobiliariaId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
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
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (body.nombre !== undefined && !body.nombre.trim()) {
    return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 });
  }
  if (body.fechaNacimiento && isNaN(new Date(body.fechaNacimiento).getTime())) {
    return NextResponse.json({ error: "Fecha de nacimiento inválida" }, { status: 400 });
  }

  try {
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
  } catch (e) {
    console.error("[PATCH /api/contactos/[id]]", e);
    return NextResponse.json({ error: "Error al actualizar el contacto" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;

  // El permiso `verClientes` gatea /contactos en el sidebar y en la página; sin
  // esto mismo acá, un AGENTE con el permiso desactivado igual llega por la API.
  const sinPermiso = await checkPermisoAgente(session, "verClientes", "Contactos");
  if (sinPermiso) return sinPermiso;

  // Mismo criterio que clientes y visitas: eliminar es cosa del ADMIN.
  if (session.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo el administrador puede eliminar contactos" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await db.contacto.findFirst({
    where: { id, inmobiliariaId },
    include: { _count: { select: { contratos: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ContratoPersona cascadea con el contacto: borrarlo dejaría contratos sin su
  // inquilino o garante, en silencio. Se bloquea y se explica por qué.
  if (existing._count.contratos > 0) {
    return NextResponse.json(
      {
        error:
          `No se puede eliminar: el contacto figura en ${existing._count.contratos} contrato(s). ` +
          "Desvinculalo de esos contratos antes de borrarlo.",
      },
      { status: 409 }
    );
  }

  try {
    await db.contacto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/contactos/[id]]", e);
    return NextResponse.json({ error: "Error al eliminar el contacto" }, { status: 500 });
  }
}
