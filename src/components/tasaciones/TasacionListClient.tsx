"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Loader2, MapPin } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { TIPO_PROPIEDAD_LABELS, formatMonto, formatDate } from "@/lib/utils";

interface Tasacion {
  id: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  direccion: string;
  tipo: keyof typeof TIPO_PROPIEDAD_LABELS;
  superficie: number | null;
  valorEstimado: number | null;
  moneda: "ARS" | "USD";
  estado: "PENDIENTE" | "REALIZADA" | "CONVERTIDA" | "DESCARTADA";
  fechaTasacion: string | null;
  notas: string | null;
  agente: { nombre: string } | null;
  createdAt: string;
}

const ESTADO_LABELS: Record<Tasacion["estado"], string> = {
  PENDIENTE: "Pendiente",
  REALIZADA: "Realizada",
  CONVERTIDA: "Convertida",
  DESCARTADA: "Descartada",
};

const ESTADO_TONE: Record<Tasacion["estado"], "warning" | "success" | "info" | "danger"> = {
  PENDIENTE: "warning",
  REALIZADA: "info",
  CONVERTIDA: "success",
  DESCARTADA: "danger",
};

interface Props {
  tasaciones: Tasacion[];
}

export function TasacionListClient({ tasaciones: initial }: Props) {
  const [tasaciones, setTasaciones] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function cambiarEstado(id: string, estado: Tasacion["estado"]) {
    setBusy(id);
    try {
      const res = await fetch(`/api/tasaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al actualizar la tasación");
      setTasaciones((prev) => prev.map((t) => (t.id === id ? { ...t, estado } : t)));
      toast.success("Estado actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar la tasación");
    } finally {
      setBusy(null);
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta tasación? Esta acción no se puede deshacer.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/tasaciones/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar la tasación");
      setTasaciones((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tasación eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar la tasación");
    } finally {
      setBusy(null);
    }
  }

  if (tasaciones.length === 0) {
    return (
      <div className="il-card" style={{ padding: "48px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--antracita-400)", fontSize: 13 }}>Todavía no hay tasaciones cargadas</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tasaciones.map((t) => {
        const isBusy = busy === t.id;
        return (
          <div key={t.id} className="il-card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--antracita-900)" }}>
                  {t.clienteNombre}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={11} />
                  {t.direccion}
                </div>
                <div style={{ fontSize: 11, color: "var(--antracita-400)", marginTop: 4 }}>
                  {TIPO_PROPIEDAD_LABELS[t.tipo]}
                  {t.superficie ? ` · ${t.superficie} m²` : ""}
                  {t.agente ? ` · ${t.agente.nombre}` : ""}
                  {t.fechaTasacion ? ` · ${formatDate(t.fechaTasacion)}` : ""}
                </div>
                {t.notas && (
                  <p style={{ fontSize: 12, color: "var(--antracita-500)", marginTop: 6, fontStyle: "italic" }}>{t.notas}</p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                {t.valorEstimado != null && (
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--antracita-900)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                    {formatMonto(t.valorEstimado, t.moneda)}
                  </span>
                )}
                <Pill tone={ESTADO_TONE[t.estado]} style={{ fontSize: 10 }}>{ESTADO_LABELS[t.estado]}</Pill>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={t.estado}
                onChange={(e) => cambiarEstado(t.id, e.target.value as Tasacion["estado"])}
                disabled={isBusy}
                className="input-base"
                style={{ height: 30, fontSize: 12 }}
              >
                {Object.entries(ESTADO_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={() => eliminar(t.id)}
                disabled={isBusy}
                className="il-btn il-btn--ghost"
                style={{ height: 30, fontSize: 11.5, gap: 4, color: "var(--danger-500)" }}
              >
                {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Eliminar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
