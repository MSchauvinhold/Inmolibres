"use client";

import { useState } from "react";
import { CheckCircle2, X, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import { Pill } from "@/components/ui/pill";
import { ESTADO_VISITA_LABELS } from "@/lib/utils";

interface Visita {
  id: string;
  fechaHora: string;
  estado: "PENDIENTE" | "REALIZADA" | "CANCELADA";
  propiedad: { titulo: string; direccion: string };
  cliente: { nombre: string; telefono: string | null };
  agente: { nombre: string };
}

interface Props {
  visitas: Visita[];
}

export function VisitaListClient({ visitas: initialVisitas }: Props) {
  const [visitas, setVisitas] = useState(initialVisitas);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const estadoTone = (estado: Visita["estado"]) =>
    estado === "REALIZADA" ? ("success" as const)
    : estado === "CANCELADA" ? ("danger" as const)
    : ("warning" as const);

  async function updateVisita(id: string, body: Record<string, unknown>) {
    setSaving(id);
    try {
      const res = await fetch(`/api/visitas?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Error al actualizar");
      }
      const { data } = await res.json() as { data: { id: string; estado: string; fechaHora: string } };
      setVisitas((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, estado: data.estado as Visita["estado"], fechaHora: data.fechaHora }
            : v
        )
      );
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar visita");
      return false;
    } finally {
      setSaving(null);
    }
  }

  /** Hora mínima para datetime-local en hora LOCAL del cliente. */
  function localNow(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function cancelar(id: string) {
    const ok = await updateVisita(id, { estado: "CANCELADA" });
    if (ok) toast.success("Visita cancelada");
  }

  async function marcarRealizada(id: string) {
    const ok = await updateVisita(id, { estado: "REALIZADA" });
    if (ok) toast.success("Visita marcada como realizada");
  }

  async function guardarFecha(id: string) {
    if (!editFecha) return;
    const ok = await updateVisita(id, { fechaHora: new Date(editFecha).toISOString() });
    if (ok) {
      toast.success("Fecha actualizada");
      setEditingId(null);
    }
  }

  if (visitas.length === 0) {
    return (
      <div className="il-card" style={{ padding: "48px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--antracita-400)", fontSize: 13 }}>Sin visitas agendadas</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visitas.map((v) => {
        const fecha = new Date(v.fechaHora);
        const isPendiente = v.estado === "PENDIENTE";
        const isEditing = editingId === v.id;
        const isSaving = saving === v.id;

        return (
          <div key={v.id} className="il-card" style={{ padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Date column */}
            <div style={{ textAlign: "center", minWidth: 48, flexShrink: 0 }}>
              <div
                className="mono"
                style={{ fontSize: 22, fontWeight: 600, color: "var(--terracota-500)", lineHeight: 1 }}
              >
                {fecha.getDate()}
              </div>
              <div style={{ fontSize: 10, color: "var(--antracita-400)", textTransform: "uppercase", marginTop: 1 }}>
                {fecha.toLocaleString("es-AR", { month: "short" })}
              </div>
              <div
                className="mono"
                style={{ fontSize: 11, color: "var(--antracita-500)", fontWeight: 600, marginTop: 3 }}
              >
                {fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--antracita-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {v.propiedad.titulo}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {v.propiedad.direccion}
                  </div>
                </div>
                <Pill tone={estadoTone(v.estado)} style={{ fontSize: 10, flexShrink: 0 }}>
                  {ESTADO_VISITA_LABELS[v.estado]}
                </Pill>
              </div>

              <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "var(--antracita-500)" }}>
                <span>👤 {v.cliente.nombre}</span>
                <span>· {v.agente.nombre}</span>
              </div>

              {/* Edit datetime form */}
              {isEditing && (
                <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="datetime-local"
                    className="input-base"
                    style={{ fontSize: 12, height: 32, flex: 1, minWidth: 180 }}
                    value={editFecha}
                    min={localNow()}
                    onChange={(e) => setEditFecha(e.target.value)}
                  />
                  <button
                    className="il-btn il-btn--primary"
                    style={{ height: 32, fontSize: 12, gap: 4 }}
                    onClick={() => guardarFecha(v.id)}
                    disabled={isSaving || !editFecha}
                  >
                    {isSaving ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    className="il-btn il-btn--ghost"
                    style={{ height: 32, fontSize: 12 }}
                    onClick={() => setEditingId(null)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Action buttons for PENDIENTE visits */}
              {isPendiente && !isEditing && (
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <button
                    className="il-btn il-btn--ghost"
                    style={{ height: 28, fontSize: 11, gap: 4, color: "var(--antracita-600)" }}
                    onClick={() => {
                      const dt = new Date(v.fechaHora);
                      // Format as YYYY-MM-DDTHH:MM for datetime-local input
                      const pad = (n: number) => String(n).padStart(2, "0");
                      setEditFecha(
                        `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
                      );
                      setEditingId(v.id);
                    }}
                    disabled={isSaving}
                  >
                    <Pencil size={11} />
                    Editar fecha
                  </button>
                  <button
                    className="il-btn il-btn--ghost"
                    style={{ height: 28, fontSize: 11, gap: 4, color: "var(--success-600)" }}
                    onClick={() => marcarRealizada(v.id)}
                    disabled={isSaving}
                  >
                    <CheckCircle2 size={11} />
                    {isSaving ? "…" : "Realizada"}
                  </button>
                  <button
                    className="il-btn il-btn--ghost"
                    style={{ height: 28, fontSize: 11, gap: 4, color: "var(--danger-500)" }}
                    onClick={() => cancelar(v.id)}
                    disabled={isSaving}
                  >
                    <X size={11} />
                    {isSaving ? "…" : "Cancelar"}
                  </button>
                </div>
              )}

              {/* Re-activar para visitas canceladas */}
              {v.estado === "CANCELADA" && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="il-btn il-btn--ghost"
                    style={{ height: 28, fontSize: 11, gap: 4, color: "var(--antracita-500)" }}
                    onClick={() => updateVisita(v.id, { estado: "PENDIENTE" }).then((ok) => ok && toast.success("Visita reactivada"))}
                    disabled={isSaving}
                  >
                    <Clock size={11} />
                    Reactivar
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
