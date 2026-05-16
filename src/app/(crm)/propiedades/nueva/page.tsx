import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PropiedadForm } from "@/components/propiedades/PropiedadForm";

export const metadata = { title: "Nueva Propiedad" };

export default async function NuevaPropiedadPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Nueva propiedad</h1>
        <p className="text-sm text-text-muted mt-0.5">Completá los datos para publicar la propiedad</p>
      </div>
      <PropiedadForm />
    </div>
  );
}
