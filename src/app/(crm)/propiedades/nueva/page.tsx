import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PropiedadForm } from "@/components/propiedades/PropiedadForm";

export const metadata = { title: "Nueva Propiedad" };

const MAX_PROPIEDADES_PARTICULAR = 3;

export default async function NuevaPropiedadPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isParticular = session.user.rol === "PARTICULAR";
  if (!isParticular && !session.user.inmobiliariaId) redirect("/login");

  if (isParticular) {
    const total = await db.propiedad.count({ where: { agenteId: session.user.id } });
    if (total >= MAX_PROPIEDADES_PARTICULAR) redirect("/propiedades");
  }

  // Solo el ADMIN puede elegir a qué asesor atribuir la propiedad
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
    <div className="w-full">
      <div className="mb-5">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--terracota-600)", fontFamily: "var(--font-mono)" }}>
          Propiedades · Nueva
        </p>
        <h1 className="text-2xl font-bold text-text-primary mt-1" style={{ fontFamily: "var(--font-display)" }}>
          Crear propiedad
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          {isParticular
            ? "Completá los datos para publicar tu propiedad en el marketplace"
            : "Cargá una propiedad nueva paso a paso · se publica automáticamente al marketplace"}
        </p>
      </div>
      <PropiedadForm agentes={agentes} currentUserId={session.user.id} />
    </div>
  );
}
