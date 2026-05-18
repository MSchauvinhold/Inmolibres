import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FinanzasDashboard } from "@/components/finanzas/FinanzasDashboard";

export const metadata = { title: "Finanzas" };

export default async function FinanzasPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  const inmobiliariaId = session.user.inmobiliariaId;
  const isAdmin = session.user.rol === "ADMIN";

  const desde = new Date();
  desde.setMonth(desde.getMonth() - 5);
  desde.setDate(1);
  desde.setHours(0, 0, 0, 0);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [operaciones, egresos, agentes] = await Promise.all([
    db.operacionCerrada.findMany({
      where: { inmobiliariaId, fechaCierre: { gte: desde } },
      include: { agente: { select: { id: true, nombre: true } } },
      orderBy: { fechaCierre: "desc" },
    }),
    db.egresoInmobiliaria.findMany({
      where: { inmobiliariaId, fecha: { gte: desde } },
      orderBy: { fecha: "desc" },
    }),
    db.usuario.findMany({
      where: { inmobiliariaId, rol: "AGENTE", activo: true },
      select: { id: true, nombre: true },
    }),
  ]);

  const serialized = {
    operaciones: operaciones.map((o) => ({
      ...o,
      precioOperacion: Number(o.precioOperacion),
      comisionTotal: Number(o.comisionTotal),
      comisionInmob: Number(o.comisionInmob),
      comisionAgente: Number(o.comisionAgente),
      ivaComision: Number(o.ivaComision),
      gastos: Number(o.gastos),
      fechaCierre: o.fechaCierre.toISOString(),
    })),
    egresos: egresos.map((e) => ({
      ...e,
      monto: Number(e.monto),
      fecha: e.fecha.toISOString(),
    })),
  };

  return (
    <FinanzasDashboard
      data={serialized}
      agentes={agentes}
      isAdmin={isAdmin}
      userId={session.user.id}
    />
  );
}
