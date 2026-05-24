import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCrmAuth, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await requireCrmAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;
  const isParticular = rol === "PARTICULAR";

  try {
    const original = await db.propiedad.findUnique({
      where: { id },
      include: { atributos: true, fotos: { orderBy: { orden: "asc" } } },
    });

    const esPropia = isParticular
      ? original?.agenteId === userId
      : original?.inmobiliariaId === inmobiliariaId;

    if (!original || !esPropia) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    // Slug único global: append -copia, -copia-2, etc.
    let nuevoSlug = `${original.slug}-copia`;
    let intento = 1;
    while (true) {
      const existe = await db.propiedad.findUnique({
        where: { slug: nuevoSlug },
        select: { id: true },
      });
      if (!existe) break;
      intento++;
      nuevoSlug = `${original.slug}-copia-${intento}`;
    }

    const nueva = await db.$transaction(async (tx) => {
      const propiedad = await tx.propiedad.create({
        data: {
          inmobiliariaId: isParticular ? null : inmobiliariaId!,
          titulo: `${original.titulo} (copia)`,
          slug: nuevoSlug,
          tipo: original.tipo,
          operacion: original.operacion,
          precio: original.precio,
          moneda: original.moneda,
          direccion: original.direccion,
          latitud: original.latitud,
          longitud: original.longitud,
          descripcion: original.descripcion,
          videoUrl: original.videoUrl,
          estado: original.estado,
          publicada: false,
          agenteId: original.agenteId,
        },
      });

      if (original.atributos) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, propiedadId: _pid, ...attrs } = original.atributos;
        await tx.propiedadAtributos.create({
          data: { ...attrs, propiedadId: propiedad.id },
        });
      }

      if (original.fotos.length > 0) {
        await tx.fotoPropiedad.createMany({
          data: original.fotos.map((f) => ({
            propiedadId: propiedad.id,
            urlCloudinary: f.urlCloudinary,
            orden: f.orden,
            esPortada: f.esPortada,
          })),
        });
      }

      return propiedad;
    });

    return NextResponse.json({ data: { id: nueva.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al duplicar propiedad" }, { status: 500 });
  }
}
