import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { toPlanKey } from "@/lib/planes";
import { ReportesDashboard } from "@/components/reportes/ReportesDashboard";

export const metadata = { title: "Reportes" };

export default async function ReportesPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  // Módulo exclusivo del plan Pro. No alcanza con ocultarlo en el menú ni con el
  // middleware: sin este chequeo, entrar por URL directa renderiza la página igual.
  if (toPlanKey(session.user.plan) !== "PRO") redirect("/upgrade");

  // AGENTE necesita el permiso verReportes activado por su ADMIN
  if (session.user.rol === "AGENTE") {
    const permisos = await db.permisosAgente.findUnique({ where: { usuarioId: session.user.id } });
    if (permisos && !permisos.verReportes) redirect("/dashboard");
  }

  const inmobiliariaId = session.user.inmobiliariaId;

  const desde = new Date();
  desde.setMonth(desde.getMonth() - 5);
  desde.setDate(1);
  desde.setHours(0, 0, 0, 0);

  const [
    operaciones,
    propiedadesPorTipo,
    propiedadesPorEstado,
    clientesPorPipeline,
    clientesPorOrigen,
    visitasPorEstado,
    agentes,
  ] = await Promise.all([
    db.operacionCerrada.findMany({
      where: { inmobiliariaId, fechaCierre: { gte: desde } },
      include: { agente: { select: { id: true, nombre: true } } },
      orderBy: { fechaCierre: "asc" },
    }),
    db.propiedad.groupBy({
      by: ["tipo"],
      where: { inmobiliariaId },
      _count: { _all: true },
    }),
    db.propiedad.groupBy({
      by: ["estado"],
      where: { inmobiliariaId },
      _count: { _all: true },
    }),
    db.cliente.groupBy({
      by: ["estadoPipeline"],
      where: { inmobiliariaId },
      _count: { _all: true },
    }),
    db.cliente.groupBy({
      by: ["origen"],
      where: { inmobiliariaId },
      _count: { _all: true },
    }),
    db.visita.groupBy({
      by: ["estado"],
      where: { inmobiliariaId },
      _count: { _all: true },
    }),
    db.usuario.findMany({
      where: { inmobiliariaId, rol: "AGENTE", activo: true },
      select: { id: true, nombre: true },
    }),
  ]);

  // Serializar Decimal → number
  const serialized = operaciones.map((o) => ({
    id: o.id,
    tipo: o.tipo,
    moneda: o.moneda,
    precioOperacion: Number(o.precioOperacion),
    comisionTotal: Number(o.comisionTotal),
    comisionInmob: Number(o.comisionInmob),
    comisionAgente: Number(o.comisionAgente),
    fechaCierre: o.fechaCierre.toISOString(),
    agenteId: o.agenteId,
    agenteNombre: o.agente?.nombre ?? "—",
  }));

  return (
    <ReportesDashboard
      operaciones={serialized}
      propiedadesPorTipo={propiedadesPorTipo.map((p) => ({ tipo: p.tipo, count: p._count._all }))}
      propiedadesPorEstado={propiedadesPorEstado.map((p) => ({ estado: p.estado, count: p._count._all }))}
      clientesPorPipeline={clientesPorPipeline.map((c) => ({ estado: c.estadoPipeline, count: c._count._all }))}
      clientesPorOrigen={clientesPorOrigen.map((c) => ({ origen: c.origen, count: c._count._all }))}
      visitasPorEstado={visitasPorEstado.map((v) => ({ estado: v.estado, count: v._count._all }))}
      agentes={agentes}
    />
  );
}
