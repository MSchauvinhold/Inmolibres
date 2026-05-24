import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import type { TipoDocumento } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;
  const { id: contactoId } = await params;

  const contacto = await db.contacto.findFirst({ where: { id: contactoId, inmobiliariaId } });
  if (!contacto) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    garanteId?: string;
    tipo: TipoDocumento;
    label?: string;
    url: string;
    esImagen?: boolean;
  };

  if (!body.url || !body.tipo) {
    return NextResponse.json({ error: "url y tipo son requeridos" }, { status: 400 });
  }

  // If garanteId provided, verify it belongs to this contacto
  if (body.garanteId) {
    const garante = await db.garante.findFirst({ where: { id: body.garanteId, contactoId } });
    if (!garante) return NextResponse.json({ error: "Garante no encontrado" }, { status: 404 });
  }

  const doc = await db.documentoContacto.create({
    data: {
      contactoId: body.garanteId ? null : contactoId,
      garanteId: body.garanteId ?? null,
      tipo: body.tipo,
      label: body.label?.trim() || null,
      url: body.url,
      esImagen: body.esImagen ?? false,
    },
  });

  return NextResponse.json({ data: doc }, { status: 201 });
}
