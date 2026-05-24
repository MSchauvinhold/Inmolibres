import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Plus, CalendarCheck } from "lucide-react";
import { ESTADO_VISITA_LABELS } from "@/lib/utils";
import { VisitaForm } from "@/components/visitas/VisitaForm";
import { VisitasCalendar } from "@/components/visitas/VisitasCalendar";
import { VisitasToggle } from "@/components/visitas/VisitasToggle";

export const metadata = { title: "Visitas" };

export default async function VisitasPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isParticular = session.user.rol === "PARTICULAR";
  const inmobiliariaId = session.user.inmobiliariaId;
  if (!isParticular && !inmobiliariaId) redirect("/login");

  const isAgente = session.user.rol === "AGENTE";
  const userId = session.user.id;

  const sp = await searchParams;
  const vista = sp.vista === "calendario" ? "calendario" : "lista";

  const ahora = new Date();
  const desde = vista === "calendario"
    ? new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    : new Date(ahora.getTime() - 7 * 86400_000);
  const hasta = vista === "calendario"
    ? new Date(ahora.getFullYear(), ahora.getMonth() + 3, 0)
    : undefined;

  const visitasWhere = isParticular
    ? { agenteId: userId, fechaHora: { gte: desde, ...(hasta ? { lte: hasta } : {}) } }
    : {
        inmobiliariaId: inmobiliariaId!,
        ...(isAgente ? { agenteId: userId } : {}),
        fechaHora: { gte: desde, ...(hasta ? { lte: hasta } : {}) },
      };

  const [visitas, propiedades, clientes, agentes] = await Promise.all([
    db.visita.findMany({
      where: visitasWhere,
      orderBy: { fechaHora: "asc" },
      include: {
        propiedad: { select: { titulo: true, direccion: true } },
        cliente: { select: { nombre: true, telefono: true } },
        agente: { select: { nombre: true } },
      },
      take: 200,
    }),
    isParticular
      ? db.propiedad.findMany({ where: { agenteId: userId }, select: { id: true, titulo: true }, orderBy: { titulo: "asc" } })
      : db.propiedad.findMany({ where: { inmobiliariaId: inmobiliariaId! }, select: { id: true, titulo: true }, orderBy: { titulo: "asc" } }),
    isParticular
      ? db.cliente.findMany({ where: { agenteId: userId, inmobiliariaId: null }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } })
      : db.cliente.findMany({ where: { inmobiliariaId: inmobiliariaId! }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    isParticular
      ? Promise.resolve([{ id: userId, nombre: session.user.nombre ?? "Yo" }])
      : db.usuario.findMany({ where: { inmobiliariaId: inmobiliariaId!, activo: true, rol: { in: ["ADMIN", "AGENTE"] } }, select: { id: true, nombre: true } }),
  ]);

  const visitasSerialized = visitas.map((v) => ({
    id: v.id,
    fechaHora: v.fechaHora.toISOString(),
    estado: v.estado,
    propiedad: v.propiedad,
    cliente: v.cliente,
    agente: v.agente,
  }));

  const ESTADO_COLORS = {
    PENDIENTE: "bg-amber-100 text-amber-800",
    REALIZADA: "bg-green-100 text-green-800",
    CANCELADA: "bg-red-100 text-red-800",
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Visitas</h1>
          <p className="text-sm text-text-muted">
            {vista === "lista" ? "Últimos 7 días + próximas" : "Vista mensual"}
          </p>
        </div>
        <VisitasToggle vista={vista} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {vista === "calendario" ? (
            <div className="card p-5">
              <VisitasCalendar visitas={visitasSerialized} />
            </div>
          ) : (
            <div className="space-y-3">
              {visitas.length === 0 ? (
                <div className="card p-8 text-center">
                  <CalendarCheck className="w-10 h-10 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted">Sin visitas agendadas</p>
                </div>
              ) : (
                visitas.map((v) => (
                  <div key={v.id} className="card p-4 flex items-start gap-4">
                    <div className="text-center min-w-[52px] shrink-0">
                      <p className="font-price text-xl font-bold text-brand-primary leading-none">{v.fechaHora.getDate()}</p>
                      <p className="text-xs text-text-muted uppercase">{v.fechaHora.toLocaleString("es-AR", { month: "short" })}</p>
                      <p className="text-xs font-medium text-text-secondary mt-0.5">{v.fechaHora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{v.propiedad.titulo}</p>
                          <p className="text-xs text-text-muted">{v.propiedad.direccion}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${ESTADO_COLORS[v.estado]}`}>
                          {ESTADO_VISITA_LABELS[v.estado]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                        <span>👤 {v.cliente.nombre}</span>
                        <span>🏠 {v.agente.nombre}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="card p-5">
          <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agendar visita
          </h2>
          <VisitaForm
            propiedades={propiedades.map((p) => ({ id: p.id, label: p.titulo }))}
            clientes={clientes.map((c) => ({ id: c.id, label: c.nombre }))}
            agentes={agentes.map((a) => ({ id: a.id, label: a.nombre }))}
          />
        </div>
      </div>
    </div>
  );
}
