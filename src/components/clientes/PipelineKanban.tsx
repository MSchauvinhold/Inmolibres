"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { ESTADO_PIPELINE_LABELS, PIPELINE_COLORS, formatRelativeTime, buildWhatsAppLink } from "@/lib/utils";
import type { EstadoPipeline } from "@prisma/client";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  estadoPipeline: EstadoPipeline;
  ultimaActividad: string;
  origen: string;
  notas?: string | null;
  agente?: { nombre: string } | null;
}

const COLUMNAS: EstadoPipeline[] = [
  "NUEVO", "CONTACTADO", "VISITA_AGENDADA", "SEGUNDA_VISITA", "CERRADO", "PERDIDO",
];

const FRIO_ESTADOS: EstadoPipeline[] = ["NUEVO", "CONTACTADO"];
const FRIO_HS = 48;

function esLeadFrio(cliente: Cliente): boolean {
  if (!FRIO_ESTADOS.includes(cliente.estadoPipeline)) return false;
  const diffMs = Date.now() - new Date(cliente.ultimaActividad).getTime();
  return diffMs > FRIO_HS * 3600_000;
}

interface Props {
  clientes: Cliente[];
  onUpdate?: () => void;
}

export function PipelineKanban({ clientes, onUpdate }: Props) {
  const [items, setItems] = useState(clientes);
  const [moving, setMoving] = useState<string | null>(null);

  async function moverCliente(id: string, nuevoEstado: EstadoPipeline) {
    setMoving(id);
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoPipeline: nuevoEstado }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, estadoPipeline: nuevoEstado, ultimaActividad: new Date().toISOString() } : c
        )
      );
      onUpdate?.();
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setMoving(null);
    }
  }

  const leadsF = items.filter(esLeadFrio);

  return (
    <div className="space-y-4">
      {/* Lead frío alert */}
      {leadsF.length > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <p className="text-sm text-orange-800 font-medium">
            {leadsF.length} contacto{leadsF.length > 1 ? "s" : ""} frío{leadsF.length > 1 ? "s" : ""} — sin actividad por más de 48 hs:{" "}
            {leadsF.map((c) => c.nombre).join(", ")}
          </p>
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {COLUMNAS.map((col) => {
            const grupo = items.filter((c) => c.estadoPipeline === col);
            return (
              <div key={col} className="w-64 shrink-0">
                {/* Column header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PIPELINE_COLORS[col]}`}>
                      {ESTADO_PIPELINE_LABELS[col]}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted font-medium">{grupo.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[200px] rounded-xl bg-surface-raised p-2">
                  {grupo.map((cliente) => {
                    const frio = esLeadFrio(cliente);
                    return (
                      <div
                        key={cliente.id}
                        className={`card p-3 space-y-2 cursor-default transition-all ${
                          frio ? "border-orange-300 bg-orange-50/40" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {frio && (
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                            )}
                            <p className="text-sm font-medium text-text-primary leading-tight truncate">
                              {cliente.nombre}
                            </p>
                          </div>
                          {moving === cliente.id && (
                            <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin shrink-0" />
                          )}
                        </div>

                        {frio && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">
                            🥶 Contacto frío
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-text-muted flex-1 truncate">{cliente.telefono}</p>
                          <a
                            href={buildWhatsAppLink(cliente.telefono)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>

                        {cliente.agente && (
                          <p className="text-[10px] text-text-muted">
                            Agente: {cliente.agente.nombre}
                          </p>
                        )}
                        <p className="text-[10px] text-text-muted">
                          {formatRelativeTime(cliente.ultimaActividad)}
                        </p>

                        {/* Move buttons */}
                        <div className="flex gap-1 flex-wrap">
                          {COLUMNAS.filter((c) => c !== col)
                            .slice(0, 3)
                            .map((target) => (
                              <button
                                key={target}
                                onClick={() => moverCliente(cliente.id, target)}
                                disabled={moving === cliente.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised hover:bg-border text-text-secondary transition-colors"
                              >
                                → {ESTADO_PIPELINE_LABELS[target]}
                              </button>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                  {grupo.length === 0 && (
                    <p className="text-xs text-text-muted text-center py-6">Sin clientes</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
