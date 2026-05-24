import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { ConsultasClient } from "@/components/consultas/ConsultasClient";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Consultas" };

export default async function ConsultasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isParticular = session.user.rol === "PARTICULAR";
  const inmobiliariaId = session.user.inmobiliariaId;
  if (!isParticular && !inmobiliariaId) redirect("/login");

  const userId = session.user.id;

  let consultasWhere: Prisma.ConsultaWhereInput;

  if (isParticular) {
    const propiedades = await db.propiedad.findMany({
      where: { agenteId: userId },
      select: { id: true },
    });
    const propiedadIds = propiedades.map((p) => p.id);
    consultasWhere = propiedadIds.length
      ? { propiedadId: { in: propiedadIds } }
      : { id: "none" };
  } else {
    consultasWhere = { inmobiliariaId: inmobiliariaId! };
  }

  const consultas = await db.consulta.findMany({
    where: consultasWhere,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      propiedad: { select: { titulo: true, slug: true, tipo: true, fotos: { take: 1, orderBy: { orden: "asc" } } } },
    },
  });

  const serialized = consultas.map((c) => ({
    id: c.id,
    nombreVisitante: c.nombreVisitante,
    telefono: c.telefono,
    email: c.email,
    mensaje: c.mensaje,
    leida: c.leida,
    createdAt: c.createdAt.toISOString(),
    propiedad: c.propiedad ? {
      titulo: c.propiedad.titulo,
      slug: c.propiedad.slug,
      tipo: c.propiedad.tipo,
      fotos: c.propiedad.fotos,
    } : null,
  }));

  const totalNoLeidas = consultas.filter((c) => !c.leida).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Consultas del marketplace</h1>
        <p className="text-sm text-text-muted">
          {totalNoLeidas > 0 ? (
            <span className="text-brand-accent font-medium">{totalNoLeidas} sin leer</span>
          ) : (
            "Todas leídas"
          )}
          {" · "}{consultas.length} en total
        </p>
      </div>

      {consultas.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">Sin consultas recibidas aún</p>
          <p className="text-xs text-text-muted mt-1">
            Las consultas del marketplace aparecerán aquí
          </p>
        </div>
      ) : (
        <ConsultasClient consultas={serialized} inmobiliariaId={inmobiliariaId ?? ""} />
      )}
    </div>
  );
}
