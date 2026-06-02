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

  const [operaciones, egresos, agentes, contratosAdmin] = await Promise.all([
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
    // Contratos de alquiler vigentes con administración mensual activa
    db.contratoAlquiler.findMany({
      where: { inmobiliariaId, administracionPct: { gt: 0 }, fechaFin: { gte: inicioMes } },
      select: {
        id: true, precioMensual: true, moneda: true, administracionPct: true,
        inquilinoNombre: true, diaVencimientoPago: true,
        propiedad: { select: { titulo: true } },
      },
      orderBy: { precioMensual: "desc" },
    }),
  ]);

  // Ingreso recurrente mensual por administración, separado por moneda
  const adminMensual = { ARS: 0, USD: 0, contratos: contratosAdmin.length };
  for (const c of contratosAdmin) {
    const fee = Number(c.precioMensual) * (c.administracionPct / 100);
    if (c.moneda === "USD") adminMensual.USD += fee;
    else adminMensual.ARS += fee;
  }

  // Detalle para la vista "Ingresos próximo mes"
  const adminContratos = contratosAdmin.map((c) => ({
    id: c.id,
    inquilino: c.inquilinoNombre,
    propiedad: c.propiedad?.titulo ?? "—",
    precioMensual: Number(c.precioMensual),
    administracionPct: c.administracionPct,
    moneda: c.moneda as "ARS" | "USD",
    diaVencimientoPago: c.diaVencimientoPago,
    fee: Number(c.precioMensual) * (c.administracionPct / 100),
  }));

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
      adminMensual={adminMensual}
      adminContratos={adminContratos}
    />
  );
}
