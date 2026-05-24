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

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Nueva propiedad</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {isParticular
            ? "Completá los datos para publicar tu propiedad en el marketplace"
            : "Completá los datos para publicar la propiedad"}
        </p>
      </div>
      <PropiedadForm />
    </div>
  );
}
