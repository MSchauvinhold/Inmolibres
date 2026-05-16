import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { propiedadFormSchema } from "@/lib/validations/property";
import { assertSameTenant } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const inmobiliariaId = session?.user?.inmobiliariaId ?? null;

  try {
    const propiedad = await db.propiedad.findUnique({
      where: { id },
      include: {
        atributos: true,
        fotos: { orderBy: { orden: "asc" } },
        agente: { select: { id: true, nombre: true } },
        inmobiliaria: { select: { id: true, nombre: true, whatsapp: true, email: true } },
        _count: { select: { visitas: true, clientesInteresados: true, consultas: true } },
      },
    });

    if (!propiedad) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    // Marketplace: only return published
    if (!inmobiliariaId && !propiedad.publicada) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    // CRM: verify tenant
    if (inmobiliariaId && propiedad.inmobiliariaId !== inmobiliariaId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({ data: propiedad });
  } catch {
    return NextResponse.json({ error: "Error al obtener propiedad" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, rol } = session;

  if (rol !== "ADMIN" && rol !== "AGENTE") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = propiedadFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await db.propiedad.findUnique({
      where: { id },
      select: { inmobiliariaId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    assertSameTenant(existing.inmobiliariaId, inmobiliariaId, rol);

    const { atributos, fotos, ...propData } = parsed.data;

    const propiedad = await db.$transaction(async (tx) => {
      const updated = await tx.propiedad.update({
        where: { id },
        data: { ...propData, precio: propData.precio },
      });

      if (atributos !== undefined) {
        await tx.propiedadAtributos.upsert({
          where: { propiedadId: id },
          create: { propiedadId: id, ...atributos },
          update: atributos,
        });
      }

      if (fotos !== undefined) {
        await tx.fotoPropiedad.deleteMany({ where: { propiedadId: id } });
        if (fotos.length > 0) {
          await tx.fotoPropiedad.createMany({
            data: fotos.map((f) => ({ ...f, propiedadId: id })),
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ data: propiedad });
  } catch (err) {
    if (err instanceof Error && err.message.includes("tenant mismatch")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error al actualizar propiedad" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  const { inmobiliariaId, rol } = session;

  if (rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo el administrador puede eliminar propiedades" },
      { status: 403 }
    );
  }

  try {
    const existing = await db.propiedad.findUnique({
      where: { id },
      select: { inmobiliariaId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    assertSameTenant(existing.inmobiliariaId, inmobiliariaId, rol);

    await db.$transaction([
      db.visita.deleteMany({ where: { propiedadId: id } }),
      db.contratoAlquiler.deleteMany({ where: { propiedadId: id } }),
      db.consulta.deleteMany({ where: { propiedadId: id } }),
      db.propiedad.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("tenant mismatch")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error al eliminar propiedad" }, { status: 500 });
  }
}
