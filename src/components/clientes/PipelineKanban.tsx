"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { buildWhatsAppLink, formatRelativeTime } from "@/lib/utils";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import type { EstadoPipeline, OrigenLead } from "@prisma/client";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  estadoPipeline: EstadoPipeline;
  ultimaActividad: string;
  origen: OrigenLead;
  notas?: string | null;
  agente?: { nombre: string } | null;
}

const COLUMNAS: { estado: EstadoPipeline; label: string; tone: string }[] = [
  { estado: "NUEVO",           label: "Nuevo",           tone: "info" },
  { estado: "CONTACTADO",      label: "Contactado",      tone: "neutral" },
  { estado: "VISITA_AGENDADA", label: "Visita agendada", tone: "warning" },
  { estado: "SEGUNDA_VISITA",  label: "Propuesta",       tone: "accent" },
  { estado: "CERRADO",         label: "Cerrado",         tone: "success" },
  { estado: "PERDIDO",         label: "Perdido",         tone: "danger" },
];

const TONE_BAR: Record<string, string> = {
  info:    "var(--info-500, #3B82F6)",
  neutral: "var(--antracita-500, #6B6459)",
  warning: "var(--warning-500, #F59E0B)",
  accent:  "#7C3AED",
  success: "var(--success-500, #22C55E)",
  danger:  "var(--danger-500, #EF4444)",
};

const ORIGEN_LABELS: Record<OrigenLead, string> = {
  INSTAGRAM:     "Instagram",
  WHATSAPP:      "WhatsApp",
  CONSULTA_LOCAL:"Consulta",
  REFERIDO:      "Referido",
  PORTAL:        "Portal",
  OTRO:          "Otro",
};

const FRIO_ESTADOS: EstadoPipeline[] = ["NUEVO", "CONTACTADO"];
const FRIO_HS = 48;

function esLeadFrio(cliente: Cliente): boolean {
  if (!FRIO_ESTADOS.includes(cliente.estadoPipeline)) return false;
  const diffMs = Date.now() - new Date(cliente.ultimaActividad).getTime();
  return diffMs > FRIO_HS * 3_600_000;
}

interface Props {
  clientes: Cliente[];
  onUpdate?: () => void;
}

export function PipelineKanban({ clientes, onUpdate }: Props) {
  const [items, setItems] = useState(clientes);
  const [moving, setMoving] = useState<string | null>(null);

  // Sincronizar cuando el Server Component re-renderiza con nuevos datos
  // (ej: al agregar un prospecto y volver a esta página)
  useEffect(() => {
    setItems(clientes);
  }, [clientes]);

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
          c.id === id
            ? { ...c, estadoPipeline: nuevoEstado, ultimaActividad: new Date().toISOString() }
            : c
        )
      );
      onUpdate?.();
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setMoving(null);
    }
  }

  const frios = items.filter(esLeadFrio);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Alerta leads fríos ── */}
      {frios.length > 0 && (
        <div
          className="il-card"
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderLeft: "3px solid var(--warning-500, #F59E0B)",
          }}
        >
          <span
            style={{
              width: 8, height: 8, borderRadius: 999,
              background: "var(--warning-500, #F59E0B)",
              flexShrink: 0,
            }}
          />
          <p style={{ fontSize: 12.5, color: "var(--antracita-800, #2C2820)", fontWeight: 500, margin: 0 }}>
            <strong>{frios.length}</strong>{" "}
            contacto{frios.length > 1 ? "s" : ""} sin actividad por más de 48 h:{" "}
            <span style={{ color: "var(--antracita-500)" }}>
              {frios.map((c) => c.nombre).join(", ")}
            </span>
          </p>
        </div>
      )}

      {/* ── Kanban ── */}
      <div style={{ overflowX: "auto", paddingBottom: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(180px, 1fr))",
            gap: 12,
            minHeight: 480,
          }}
        >
          {COLUMNAS.map((col) => {
            const grupo = items.filter((c) => c.estadoPipeline === col.estado);
            const bar = TONE_BAR[col.tone];

            return (
              <div
                key={col.estado}
                style={{
                  background: "var(--crema-100, #F0E9DC)",
                  borderRadius: 12,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  border: "1px solid var(--border)",
                  borderTop: `3px solid ${bar}`,
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    padding: "4px 6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--antracita-900)" }}>
                      {col.label}
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--antracita-300)", marginLeft: 6 }}
                    >
                      {grupo.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                {grupo.map((cliente) => {
                  const frio = esLeadFrio(cliente);
                  const isMoving = moving === cliente.id;
                  const avatarBg =
                    cliente.estadoPipeline === "NUEVO"
                      ? "var(--terracota-500, #C1694F)"
                      : "var(--antracita-300, #A09890)";

                  return (
                    <div
                      key={cliente.id}
                      className="il-card"
                      style={{
                        padding: 12,
                        paddingBottom: 18,
                        position: "relative",
                        cursor: "default",
                      }}
                    >
                      {/* Cold badge */}
                      {frio && (
                        <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11 }}>
                          🥶
                        </span>
                      )}

                      {/* Avatar + name */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <AvatarInitials name={cliente.nombre} size={26} bg={avatarBg} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12.5, fontWeight: 600,
                              color: "var(--antracita-900)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {cliente.nombre}
                          </div>
                          <div
                            className="mono"
                            style={{ fontSize: 10, color: "var(--antracita-300)" }}
                          >
                            {cliente.telefono}
                          </div>
                        </div>
                        {isMoving && (
                          <div
                            style={{
                              width: 12, height: 12,
                              border: "2px solid var(--terracota-400)",
                              borderTopColor: "transparent",
                              borderRadius: 999,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      {/* Notas */}
                      {cliente.notas && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--accent-deep, #1B3149)",
                            padding: "4px 8px",
                            background: "var(--accent-soft, #DEE5ED)",
                            borderRadius: 6,
                            marginBottom: 8,
                            fontStyle: "italic",
                            lineHeight: 1.4,
                          }}
                        >
                          {cliente.notas}
                        </div>
                      )}

                      {/* Footer */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 8,
                          borderTop: "1px solid var(--border)",
                          marginTop: 4,
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "var(--antracita-400)" }}>
                          {cliente.agente?.nombre ?? "Sin asignar"}
                        </span>
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <span style={{ fontSize: 9.5, color: "var(--antracita-400)" }}>
                            {formatRelativeTime(cliente.ultimaActividad)}
                          </span>
                          <a
                            href={buildWhatsAppLink(cliente.telefono)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              padding: "2px 6px",
                              borderRadius: 5,
                              background: "rgba(37,211,102,0.14)",
                              color: "#25D366",
                              fontSize: 9.5,
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            WA
                          </a>
                        </div>
                      </div>

                      {/* Mover select */}
                      <div style={{ marginTop: 8 }}>
                        <select
                          value=""
                          disabled={isMoving}
                          onChange={(e) => {
                            if (e.target.value) moverCliente(cliente.id, e.target.value as EstadoPipeline);
                          }}
                          style={{
                            width: "100%",
                            fontSize: 10,
                            padding: "3px 6px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--crema-50, #FBF8F2)",
                            color: "var(--antracita-500)",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">Mover a…</option>
                          {COLUMNAS.filter((c) => c.estado !== col.estado).map((target) => (
                            <option key={target.estado} value={target.estado}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Source badge */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: -1,
                          left: 12,
                          fontSize: 9,
                          color: "var(--antracita-300)",
                          background: "#fff",
                          padding: "0 6px",
                          borderRadius: 4,
                          transform: "translateY(50%)",
                          lineHeight: "16px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {ORIGEN_LABELS[cliente.origen] ?? cliente.origen}
                      </div>
                    </div>
                  );
                })}

                {/* Empty state */}
                {grupo.length === 0 && (
                  <div
                    style={{
                      padding: "28px 12px",
                      textAlign: "center",
                      fontSize: 11.5,
                      color: "var(--antracita-300)",
                      border: "1px dashed var(--border)",
                      borderRadius: 10,
                      fontStyle: "italic",
                    }}
                  >
                    Sin prospectos
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
