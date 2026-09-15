import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TipoDocumento } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cliente = await db.cliente.findFirst({
    where: { id, inmobiliariaId: session.user.inmobiliariaId },
  });
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const documentos = await db.documentoCliente.findMany({
    where: { clienteId: id, inmobiliariaId: session.user.inmobiliariaId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: documentos });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const cliente = await db.cliente.findFirst({
    where: { id, inmobiliariaId: session.user.inmobiliariaId },
  });
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  let body: {
    tipo: TipoDocumento;
    nombre: string;
    urlCloudinary: string;
    esImagen: boolean;
    notas?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.tipo || !body.nombre?.trim() || !body.urlCloudinary) {
    return NextResponse.json({ error: "Faltan datos del documento" }, { status: 400 });
  }

  try {
    const doc = await db.documentoCliente.create({
      data: {
        clienteId: id,
        inmobiliariaId: session.user.inmobiliariaId,
        tipo: body.tipo,
        nombre: body.nombre,
        urlCloudinary: body.urlCloudinary,
        esImagen: body.esImagen ?? false,
        notas: body.notas,
      },
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/clientes/[id]/documentos]", e);
    return NextResponse.json({ error: "Error al guardar el documento" }, { status: 500 });
  }
}
