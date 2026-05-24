import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const inmobiliariaId = session.inmobiliariaId;
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

  await db.documentoContacto.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
