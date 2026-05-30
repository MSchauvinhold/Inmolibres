import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { PropiedadForm, type PropiedadParaEditar } from "@/components/propiedades/PropiedadForm";

export const metadata = { title: "Editar Propiedad" };

export default async function EditarPropiedadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isParticular = session.user.rol === "PARTICULAR";
  if (!isParticular && !session.user.inmobiliariaId) redirect("/login");

  const { id } = await params;

  const propiedad = await db.propiedad.findUnique({
    where: { id },
    include: { atributos: true, fotos: { orderBy: { orden: "asc" } } },
  });

  const esPropia = isParticular
    ? propiedad?.agenteId === session.user.id
    : propiedad?.inmobiliariaId === session.user.inmobiliariaId;

  if (!propiedad || !esPropia) notFound();

  // Serializar: Prisma Decimal → number (no es transferible Server→Client)
  const serialized: PropiedadParaEditar = {
    id: propiedad.id,
    titulo: propiedad.titulo,
    tipo: propiedad.tipo,
    operacion: propiedad.operacion,
    precio: Number(propiedad.precio),
    moneda: propiedad.moneda,
    direccion: propiedad.direccion,
    latitud: propiedad.latitud,
    longitud: propiedad.longitud,
    poligonoJson: (propiedad.poligonoJson as [number, number][] | null) ?? null,
    descripcion: propiedad.descripcion,
    videoUrl: propiedad.videoUrl,
    publicada: propiedad.publicada,
    agenteId: propiedad.agenteId,
    atributos: propiedad.atributos
      ? {
          superficieCubierta: propiedad.atributos.superficieCubierta,
          superficieTotal: propiedad.atributos.superficieTotal,
          habitaciones: propiedad.atributos.habitaciones,
          banos: propiedad.atributos.banos,
          garage: propiedad.atributos.garage,
          pileta: propiedad.atributos.pileta,
          quincho: propiedad.atributos.quincho,
          balcon: propiedad.atributos.balcon,
          amueblado: propiedad.atributos.amueblado,
          cantidadPisos: propiedad.atributos.cantidadPisos,
          numeroPiso: propiedad.atributos.numeroPiso,
          mostrarPrecioPorM2: propiedad.atributos.mostrarPrecioPorM2,
          precioPorDia: propiedad.atributos.precioPorDia != null ? Number(propiedad.atributos.precioPorDia) : null,
          precioSemana: propiedad.atributos.precioSemana != null ? Number(propiedad.atributos.precioSemana) : null,
          precioQuincena: propiedad.atributos.precioQuincena != null ? Number(propiedad.atributos.precioQuincena) : null,
          diasMinimos: propiedad.atributos.diasMinimos,
          diasMaximos: propiedad.atributos.diasMaximos,
          anchoMetros: propiedad.atributos.anchoMetros,
          largoMetros: propiedad.atributos.largoMetros,
          alturaInterna: propiedad.atributos.alturaInterna,
          serviciosAgua: propiedad.atributos.serviciosAgua,
          serviciosLuz: propiedad.atributos.serviciosLuz,
          serviciosGas: propiedad.atributos.serviciosGas,
          serviciosCloaca: propiedad.atributos.serviciosCloaca,
          caracteristicasCustom: propiedad.atributos.caracteristicasCustom,
        }
      : null,
    fotos: propiedad.fotos.map((f) => ({
      urlCloudinary: f.urlCloudinary,
      orden: f.orden,
      esPortada: f.esPortada,
    })),
  };

  // Solo el ADMIN puede reasignar el asesor
  const agentes = session.user.rol === "ADMIN" && session.user.inmobiliariaId
    ? await db.usuario.findMany({
        where: {
          inmobiliariaId: session.user.inmobiliariaId,
          activo: true,
          rol: { in: ["ADMIN", "AGENTE"] },
        },
        select: { id: true, nombre: true, rol: true },
        orderBy: { nombre: "asc" },
      })
    : [];

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Editar propiedad</h1>
        <p className="text-sm text-text-muted mt-0.5 truncate">{propiedad.titulo}</p>
      </div>
      <PropiedadForm propiedad={serialized} agentes={agentes} currentUserId={session.user.id} />
    </div>
  );
}
