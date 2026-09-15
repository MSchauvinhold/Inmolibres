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

  try {
    await db.documentoCliente.delete({ where: { id: docId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/clientes/[id]/documentos/[docId]]", e);
    return NextResponse.json({ error: "Error al eliminar el documento" }, { status: 500 });
  }
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

  let notas: string;
  try {
    ({ notas } = await req.json() as { notas: string });
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  try {
    const updated = await db.documentoCliente.update({
      where: { id: docId },
      data: { notas },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("[PATCH /api/clientes/[id]/documentos/[docId]]", e);
    return NextResponse.json({ error: "Error al actualizar la nota" }, { status: 500 });
  }
}
