import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ParticularEditarClient } from "@/components/particular/ParticularEditarClient";

export const metadata = { title: "Editar propiedad — InmoLibres" };

interface Params { id: string }

export default async function ParticularEditarPage({ params }: { params: Promise<Params> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "PARTICULAR") redirect("/login");

  const { id } = await params;

  const propiedad = await db.propiedad.findUnique({
    where: { id },
    select: {
      id: true, agenteId: true, titulo: true, precio: true, moneda: true,
      descripcion: true, publicada: true, direccion: true, slug: true,
    },
  });

  if (!propiedad || propiedad.agenteId !== session.user.id) notFound();

  return (
    <ParticularEditarClient
      propiedad={{
        id: propiedad.id,
        titulo: propiedad.titulo,
        precio: Number(propiedad.precio),
        moneda: propiedad.moneda,
        descripcion: propiedad.descripcion,
        publicada: propiedad.publicada,
        direccion: propiedad.direccion,
        slug: propiedad.slug,
      }}
    />
  );
}
