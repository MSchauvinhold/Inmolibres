import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PipelineKanban } from "@/components/clientes/PipelineKanban";
import type { EstadoPipeline } from "@prisma/client";

export const metadata = { title: "Clientes" };

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
  if (!session?.user?.inmobiliariaId) redirect("/login");

  const inmobiliariaId = session.user.inmobiliariaId;
  const isAgente = session.user.rol === "AGENTE";
  const userId = session.user.id;
  const sp = await searchParams;

  const [clientes, agentes] = await Promise.all([
    db.cliente.findMany({
      where: {
        inmobiliariaId,
        ...(isAgente ? { agenteId: userId } : {}),
        ...(sp.estado ? { estadoPipeline: sp.estado as EstadoPipeline } : {}),
        ...(sp.agenteId ? { agenteId: sp.agenteId } : {}),
      },
      orderBy: { ultimaActividad: "desc" },
      include: { agente: { select: { nombre: true } } },
    }),
    isAgente
      ? []
      : db.usuario.findMany({
          where: { inmobiliariaId, activo: true, rol: { in: ["ADMIN", "AGENTE"] } },
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Clientes</h1>
          <p className="text-sm text-text-muted">
            {leadsTotal} clientes · {leadsNuevos} nuevos
          </p>
        </div>
        <Link href="/clientes/nueva" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo cliente
        </Link>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-2">
        <select
          name="estado"
          defaultValue={sp.estado ?? ""}
          className="input-base text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="NUEVO">Nuevo</option>
          <option value="CONTACTADO">Contactado</option>
          <option value="VISITA_AGENDADA">Visita Agendada</option>
          <option value="SEGUNDA_VISITA">2da Visita</option>
          <option value="CERRADO">Cerrado</option>
          <option value="PERDIDO">Perdido</option>
        </select>

        {!isAgente && agentes.length > 0 && (
          <select
            name="agenteId"
            defaultValue={sp.agenteId ?? ""}
            className="input-base text-sm"
          >
            <option value="">Todos los agentes</option>
            {agentes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        )}

        <button type="submit" className="btn-primary text-sm">
          Filtrar
        </button>
        {(sp.estado || sp.agenteId) && (
          <Link href="/clientes" className="btn-outline text-sm">
            Limpiar
          </Link>
        )}
      </form>

      <PipelineKanban clientes={serialized} />
    </div>
  );
}
