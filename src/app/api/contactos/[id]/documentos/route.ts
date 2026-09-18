import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, checkPermisoAgente, isNextResponse } from "@/lib/api-auth";
import type { TipoDocumento } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;

  // El permiso `verClientes` gatea /contactos en el sidebar y en la página; sin
  // esto mismo acá, un AGENTE con el permiso desactivado igual llega por la API.
  const sinPermiso = await checkPermisoAgente(session, "verClientes", "Contactos");
  if (sinPermiso) return sinPermiso;

  const { id: contactoId } = await params;

  const contacto = await db.contacto.findFirst({ where: { id: contactoId, inmobiliariaId } });
  if (!contacto) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    garanteId?: string;
    tipo: TipoDocumento;
    label?: string;
    url: string;
    esImagen?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.url || !body.tipo) {
    return NextResponse.json({ error: "url y tipo son requeridos" }, { status: 400 });
  }

  // If garanteId provided, verify it belongs to this contacto
  if (body.garanteId) {
    const garante = await db.garante.findFirst({ where: { id: body.garanteId, contactoId } });
    if (!garante) return NextResponse.json({ error: "Garante no encontrado" }, { status: 404 });
  }

  // Resolver el propietario del documento: garante o contacto (nunca ambos null)
  const finalContactoId = body.garanteId ? null : contactoId;
  const finalGaranteId  = body.garanteId ?? null;

  // Guarda defensiva: un documento siempre debe pertenecer a un contacto o garante
  if (!finalContactoId && !finalGaranteId) {
    return NextResponse.json(
      { error: "El documento debe pertenecer a un contacto o garante" },
      { status: 400 }
    );
  }

  try {
    const doc = await db.documentoContacto.create({
      data: {
        contactoId: finalContactoId,
        garanteId: finalGaranteId,
        tipo: body.tipo,
        label: body.label?.trim() || null,
        url: body.url,
        esImagen: body.esImagen ?? false,
      },
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/contactos/[id]/documentos]", e);
    return NextResponse.json({ error: "Error al guardar el documento" }, { status: 500 });
  }
}
