import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClienteForm } from "@/components/clientes/ClienteForm";

export const metadata = { title: "Nuevo Cliente" };

export default async function NuevoClientePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isParticular = session.user.rol === "PARTICULAR";
  if (!isParticular && !session.user.inmobiliariaId) redirect("/login");

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Nuevo cliente</h1>
        <p className="text-sm text-text-muted">Registrá un nuevo lead o cliente</p>
      </div>
      <ClienteForm />
    </div>
  );
}
