import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalculadorasPanel } from "./_panel";

export const metadata = { title: "Calculadoras" };

export default async function CalculadorasPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  return (
    <div className="w-full max-w-[1060px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p
          className="mono"
          style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}
        >
          Módulo · Finanzas
        </p>
        <h1
          className="display"
          style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}
        >
          Calculadoras
        </h1>
        <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
          Herramientas de cálculo en tiempo real para tu operatoria diaria
        </p>
      </div>
      <CalculadorasPanel />
    </div>
  );
}
