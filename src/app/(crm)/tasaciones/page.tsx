import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requirePermisoAgente } from "@/lib/permisos";
import { TasacionForm } from "@/components/tasaciones/TasacionForm";
import { TasacionListClient } from "@/components/tasaciones/TasacionListClient";

export const metadata = { title: "Tasaciones" };

export default async function TasacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol === "PARTICULAR") redirect("/particular");

  const inmobiliariaId = session.user.inmobiliariaId;
  if (!inmobiliariaId) redirect("/login");

  await requirePermisoAgente(session.user.id, session.user.rol, "verTasaciones", "Tasaciones");

  const isAgente = session.user.rol === "AGENTE";
  const userId = session.user.id;

  const where = isAgente ? { inmobiliariaId, agenteId: userId } : { inmobiliariaId };

  const [tasaciones, clientes] = await Promise.all([
    db.tasacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { agente: { select: { nombre: true } } },
    }),
    db.cliente.findMany({
      where: { inmobiliariaId },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const tasacionesSerialized = tasaciones.map((t) => ({
    id: t.id,
    clienteNombre: t.clienteNombre,
    clienteTelefono: t.clienteTelefono,
    direccion: t.direccion,
    tipo: t.tipo,
    superficie: t.superficie,
    valorEstimado: t.valorEstimado != null ? Number(t.valorEstimado) : null,
    moneda: t.moneda,
    estado: t.estado,
    fechaTasacion: t.fechaTasacion ? t.fechaTasacion.toISOString() : null,
    notas: t.notas,
    agente: t.agente,
    createdAt: t.createdAt.toISOString(),
  }));

  const pendientes = tasaciones.filter((t) => t.estado === "PENDIENTE").length;

  return (
    <div className="w-full max-w-[1060px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p className="mono" style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
            Módulo · Operaciones
          </p>
          <h1 className="display" style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}>
            Tasaciones
          </h1>
          <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
            {tasaciones.length} tasación{tasaciones.length !== 1 ? "es" : ""}
            {pendientes > 0 ? ` · ${pendientes} pendiente${pendientes !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <a
          href="#nueva"
          className="il-btn il-btn--primary"
          style={{ height: 36, fontSize: 13, gap: 6, textDecoration: "none" }}
        >
          <Plus size={14} color="#fff" />
          Nueva tasación
        </a>
      </div>

      {/* Grid content */}
      <div className="rg-2col rg-2col--a" style={{ gap: 18, alignItems: "start" }}>
        <div>
          <TasacionListClient tasaciones={tasacionesSerialized} />
        </div>

        <div id="nueva" className="il-card" style={{ padding: 18, background: "var(--crema-100, #F0E9DC)" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16 }}>
            <Plus size={14} style={{ color: "var(--terracota-500)" }} />
            <h2 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>
              Nueva tasación
            </h2>
          </div>
          <TasacionForm clientes={clientes.map((c) => ({ id: c.id, label: c.nombre }))} />
        </div>
      </div>
    </div>
  );
}
