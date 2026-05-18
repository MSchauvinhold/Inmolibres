import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, docId } = await params;

  const doc = await db.documentoCliente.findFirst({
    where: { id: docId, clienteId: id, inmobiliariaId: session.user.inmobiliariaId },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  await db.documentoCliente.delete({ where: { id: docId } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, docId } = await params;

  const doc = await db.documentoCliente.findFirst({
    where: { id: docId, clienteId: id, inmobiliariaId: session.user.inmobiliariaId },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const { notas } = await req.json() as { notas: string };

  const updated = await db.documentoCliente.update({
    where: { id: docId },
    data: { notas },
  });

  return NextResponse.json({ data: updated });
}
