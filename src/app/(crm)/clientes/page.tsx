import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PipelineKanban } from "@/components/clientes/PipelineKanban";
import type { EstadoPipeline } from "@prisma/client";

export const metadata = { title: "Prospectos" };

interface SearchParams {
  estado?: string;
  agenteId?: string;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isParticular = session.user.rol === "PARTICULAR";
  const inmobiliariaId = session.user.inmobiliariaId;
  if (!isParticular && !inmobiliariaId) redirect("/login");

  const isAgente = session.user.rol === "AGENTE";
  const userId = session.user.id;
  const sp = await searchParams;

  const where = isParticular
    ? {
        agenteId: userId,
        inmobiliariaId: null,
        ...(sp.estado ? { estadoPipeline: sp.estado as EstadoPipeline } : {}),
      }
    : {
        inmobiliariaId: inmobiliariaId!,
        ...(isAgente ? { agenteId: userId } : {}),
        ...(sp.estado ? { estadoPipeline: sp.estado as EstadoPipeline } : {}),
        ...(sp.agenteId ? { agenteId: sp.agenteId } : {}),
      };

  const [clientes, agentes] = await Promise.all([
    db.cliente.findMany({
      where,
      orderBy: { ultimaActividad: "desc" },
      include: { agente: { select: { nombre: true } } },
    }),
    isParticular || isAgente
      ? []
      : db.usuario.findMany({
          where: { inmobiliariaId: inmobiliariaId!, activo: true, rol: { in: ["ADMIN", "AGENTE"] } },
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        }),
  ]);

  const serialized = clientes.map((c) => ({
    ...c,
    ultimaActividad: c.ultimaActividad.toISOString(),
    createdAt: c.createdAt.toISOString(),
  }));

  const leadsTotal = clientes.length;
  const leadsNuevos = clientes.filter((c) => c.estadoPipeline === "NUEVO").length;

  return (
    <div className="w-full space-y-0">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--antracita-300)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Módulo · Operaciones
          </p>
          <h1
            className="display"
            style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}
          >
            Prospectos
          </h1>
          <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
            {leadsTotal} leads totales · {leadsNuevos} nuevos
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-start">
          {/* Filter chips as a subtle form */}
          <form className="flex gap-2 items-center">
            {!isAgente && agentes.length > 0 && (
              <select
                name="agenteId"
                defaultValue={sp.agenteId ?? ""}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  background: sp.agenteId ? "var(--terracota-100)" : "var(--crema-100, #F0E9DC)",
                  border: sp.agenteId ? "1px solid var(--terracota-300)" : "1px solid var(--border)",
                  color: sp.agenteId ? "var(--terracota-700)" : "var(--antracita-700)",
                  cursor: "pointer",
                }}
              >
                <option value="">Agente: Todos</option>
                {agentes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            )}
            <select
              name="estado"
              defaultValue={sp.estado ?? ""}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 12,
                background: sp.estado ? "var(--terracota-100)" : "var(--crema-100, #F0E9DC)",
                border: sp.estado ? "1px solid var(--terracota-300)" : "1px solid var(--border)",
                color: sp.estado ? "var(--terracota-700)" : "var(--antracita-700)",
                cursor: "pointer",
              }}
            >
              <option value="">Estado: Todos</option>
              <option value="NUEVO">Nuevo</option>
              <option value="CONTACTADO">Contactado</option>
              <option value="VISITA_AGENDADA">Visita agendada</option>
              <option value="SEGUNDA_VISITA">Propuesta</option>
              <option value="CERRADO">Cerrado</option>
              <option value="PERDIDO">Perdido</option>
            </select>
            <button type="submit" className="il-btn il-btn--ghost" style={{ height: 36, fontSize: 13 }}>
              Filtrar
            </button>
            {(sp.estado || sp.agenteId) && (
              <Link
                href="/clientes"
                className="il-btn il-btn--ghost"
                style={{ height: 36, fontSize: 13, textDecoration: "none", color: "var(--antracita-400)" }}
              >
                ✕
              </Link>
            )}
          </form>

          <Link
            href="/clientes/nueva"
            className="il-btn il-btn--primary"
            style={{ height: 36, fontSize: 13, gap: 6, textDecoration: "none" }}
          >
            <Plus size={14} color="#fff" />
            Nuevo prospecto
          </Link>
        </div>
      </div>

      <PipelineKanban clientes={serialized} />
    </div>
  );
}
