import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, checkPermisoAgente, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;

  // El permiso `verClientes` gatea /contactos en el sidebar y en la página; sin
  // esto mismo acá, un AGENTE con el permiso desactivado igual llega por la API.
  const sinPermiso = await checkPermisoAgente(session, "verClientes", "Contactos");
  if (sinPermiso) return sinPermiso;

  const { id: contactoId, docId } = await params;

  // Verify contacto belongs to this inmobiliaria
  const contacto = await db.contacto.findFirst({ where: { id: contactoId, inmobiliariaId } });
  if (!contacto) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await db.documentoContacto.findFirst({
    where: {
      id: docId,
      OR: [{ contactoId }, { garante: { contactoId } }],
    },
  });
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  try {
    await db.documentoContacto.delete({ where: { id: docId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/contactos/[id]/documentos/[docId]]", e);
    return NextResponse.json({ error: "Error al eliminar el documento" }, { status: 500 });
  }
}
