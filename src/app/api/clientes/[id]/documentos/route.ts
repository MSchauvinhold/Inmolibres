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

  const body = await req.json() as {
    tipo: TipoDocumento;
    nombre: string;
    urlCloudinary: string;
    esImagen: boolean;
    notas?: string;
  };

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
}
