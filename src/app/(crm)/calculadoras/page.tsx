import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalculadorasPanel } from "./_panel";

export const metadata = { title: "Calculadoras Financieras" };

export default async function CalculadorasPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Calculadoras financieras</h1>
        <p className="text-sm text-text-muted mt-0.5">Herramientas de cálculo en tiempo real para tu operatoria diaria</p>
      </div>
      <CalculadorasPanel />
    </div>
  );
}
