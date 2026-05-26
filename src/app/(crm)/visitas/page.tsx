import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { VisitaForm } from "@/components/visitas/VisitaForm";
import { VisitasCalendar } from "@/components/visitas/VisitasCalendar";
import { VisitasSemana } from "@/components/visitas/VisitasSemana";
import { VisitasToggle } from "@/components/visitas/VisitasToggle";
import { VisitaListClient } from "@/components/visitas/VisitaListClient";

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
  const vista =
    sp.vista === "calendario" ? "calendario"
    : sp.vista === "semana"   ? "semana"
    : "lista";

  const ahora = new Date();
  const esVistaExtensa = vista === "calendario" || vista === "semana";
  const desde = esVistaExtensa
    ? new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    : new Date(ahora.getTime() - 7 * 86400_000);
  const hasta = esVistaExtensa
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

  return (
    <div className="w-full max-w-[1060px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p
            className="mono"
            style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}
          >
            Módulo · Operaciones
          </p>
          <h1
            className="display"
            style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}
          >
            Visitas
          </h1>
          <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
            {vista === "lista" ? "Últimos 7 días + próximas" : vista === "semana" ? "Semana actual" : "Vista mensual"} · {visitas.length} visita{visitas.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <VisitasToggle vista={vista} />
          {!isParticular && (
            <a
              href="#agendar"
              className="il-btn il-btn--primary"
              style={{ height: 36, fontSize: 13, gap: 6, textDecoration: "none" }}
            >
              <Plus size={14} color="#fff" />
              Agendar visita
            </a>
          )}
        </div>
      </div>

      {/* ── Grid content ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, alignItems: "start" }}>

        {/* ── Main: list / semana / calendario ── */}
        <div>
          {vista === "semana" ? (
            <VisitasSemana visitas={visitasSerialized} />
          ) : vista === "calendario" ? (
            <div className="il-card" style={{ padding: 20 }}>
              <VisitasCalendar visitas={visitasSerialized} />
            </div>
          ) : (
            <VisitaListClient visitas={visitasSerialized} />
          )}
        </div>

        {/* ── Side: quick form ── */}
        <div
          className="il-card"
          style={{ padding: 18, background: "var(--crema-100, #F0E9DC)" }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16 }}>
            <Plus size={14} style={{ color: "var(--terracota-500)" }} />
            <h2
              className="display"
              style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}
            >
              Agendar visita
            </h2>
          </div>
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
