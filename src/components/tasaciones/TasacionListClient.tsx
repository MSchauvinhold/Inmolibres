"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, MapPin, Home, Pencil, CalendarDays } from "lucide-react";
import { TIPO_PROPIEDAD_LABELS, formatMonto, formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TasacionForm } from "@/components/tasaciones/TasacionForm";
import type { TasacionInput } from "@/lib/validations/tasacion";

export interface TasacionItem {
  id: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  clienteId: string | null;
  direccion: string;
  tipo: keyof typeof TIPO_PROPIEDAD_LABELS;
  superficie: number | null;
  valorEstimado: number | null;
  moneda: "ARS" | "USD";
  estado: "PENDIENTE" | "REALIZADA" | "CONVERTIDA" | "DESCARTADA";
  fechaTasacion: string | null;
  notas: string | null;
  agente: { nombre: string } | null;
  propiedad?: { id: string; titulo: string } | null;
  createdAt: string;
}

// Colores propios (más oscuros que los de Pill) para que el estado se lea de un vistazo.
const ESTADO_CFG: Record<TasacionItem["estado"], { label: string; ayuda: string; bg: string; fg: string; dot: string }> = {
  PENDIENTE:  { label: "Pendiente",  ayuda: "Todavía no se visitó la propiedad", bg: "#FBEFD9", fg: "#7A4E0E", dot: "#C58B2F" },
  REALIZADA:  { label: "Realizada",  ayuda: "Se visitó e informó un valor",      bg: "#E1EBF2", fg: "#1F4560", dot: "#3A6B89" },
  CONVERTIDA: { label: "Convertida", ayuda: "Se cargó como propiedad",           bg: "#DCEAE0", fg: "#2D5A3A", dot: "#4A7C59" },
  DESCARTADA: { label: "Descartada", ayuda: "No prosperó",                       bg: "#F5DBD6", fg: "#8A2A20", dot: "#B23A2D" },
};

/** Valores del formulario para editar una tasación existente */
export function valoresEdicion(t: TasacionItem): Partial<TasacionInput> {
  return {
    clienteNombre: t.clienteNombre,
    clienteTelefono: t.clienteTelefono ?? "",
    clienteId: t.clienteId ?? "",
    direccion: t.direccion,
    tipo: t.tipo,
    superficie: t.superficie ?? undefined,
    valorEstimado: t.valorEstimado ?? undefined,
    moneda: t.moneda,
    estado: t.estado,
    // @db.Date = medianoche UTC: el día sale de la parte ISO, no de la hora local
    fechaTasacion: t.fechaTasacion ? t.fechaTasacion.slice(0, 10) : "",
    notas: t.notas ?? "",
  };
}

interface Props {
  tasaciones: TasacionItem[];
  clientes: { id: string; label: string }[];
  /** Columna angosta (página de Tasaciones): tarjeta más compacta */
  compacta?: boolean;
  /** Si se pasa, "Editar" delega en el padre (formulario grande) en vez de editar dentro de la tarjeta */
  onEditar?: (t: TasacionItem) => void;
  editandoId?: string | null;
}

export function TasacionListClient({ tasaciones: initial, clientes, compacta = false, onEditar, editandoId: editandoExterno = null }: Props) {
  const router = useRouter();
  const [tasaciones, setTasaciones] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<TasacionItem | null>(null);

  // TasacionForm hace router.refresh() al cargar una tasación: sin esto la lista
  // conservaba el estado inicial y la nueva no aparecía hasta recargar la página.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setTasaciones(initial);
  }

  async function cambiarEstado(id: string, estado: TasacionItem["estado"]) {
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
      toast.success(`Estado: ${ESTADO_CFG[estado].label}`);
      // Los contadores del header ("· N pendientes") vienen del server component
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar la tasación");
    } finally {
      setBusy(null);
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    const id = aEliminar.id;
    setBusy(id);
    try {
      const res = await fetch(`/api/tasaciones/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar la tasación");
      setTasaciones((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tasación eliminada");
      setAEliminar(null);
      router.refresh();
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
        const cfg = ESTADO_CFG[t.estado];

        if (editandoId === t.id) {
          return (
            <div key={t.id} className="il-card" style={{ padding: "18px 20px", borderLeft: `3px solid ${cfg.dot}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginBottom: 14 }}>
                Editar tasación
              </div>
              <TasacionForm
                clientes={clientes}
                editar={{ id: t.id, valores: valoresEdicion(t) }}
                onDone={() => setEditandoId(null)}
              />
            </div>
          );
        }

        return (
          <div
            key={t.id}
            className="il-card"
            style={{
              padding: compacta ? "14px 16px" : "16px 20px",
              borderLeft: `3px solid ${cfg.dot}`,
              ...(editandoExterno === t.id ? { outline: "2px solid var(--terracota-300)", outlineOffset: 1 } : {}),
            }}
          >
            {/* Estado + valor */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span
                title={cfg.ayuda}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "3px 10px", borderRadius: 999,
                  background: cfg.bg, color: cfg.fg,
                  fontSize: 12, fontWeight: 600,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 999, background: cfg.dot }} />
                {cfg.label}
                {!compacta && <span style={{ fontWeight: 400, opacity: 0.85 }}>· {cfg.ayuda}</span>}
              </span>
              {t.valorEstimado != null ? (
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--antracita-900)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                  {formatMonto(t.valorEstimado, t.moneda)}
                </span>
              ) : (
                <span style={{ fontSize: 11.5, color: "var(--antracita-400)", fontStyle: "italic" }}>Sin valor todavía</span>
              )}
            </div>

            {/* Datos */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--antracita-900)" }}>{t.clienteNombre}</div>
              <div style={{ fontSize: 12, color: "var(--antracita-500)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={12} style={{ flexShrink: 0 }} />
                {t.direccion}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--antracita-400)", marginTop: 4 }}>
                {TIPO_PROPIEDAD_LABELS[t.tipo]}
                {t.superficie ? ` · ${t.superficie} m²` : ""}
                {t.agente ? ` · ${t.agente.nombre}` : ""}
              </div>
              {t.fechaTasacion && (
                <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <CalendarDays size={12} />
                  {/* @db.Date = medianoche UTC: en hora local mostraba el día anterior */}
                  Fecha de tasación: {formatDate(t.fechaTasacion, { timeZone: "UTC" })}
                </div>
              )}
              {t.propiedad && (
                <Link
                  href={`/propiedades/${t.propiedad.id}/editar`}
                  style={{ fontSize: 11.5, color: "var(--terracota-600)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                >
                  <Home size={12} /> {t.propiedad.titulo}
                </Link>
              )}
              {t.notas && (
                <p style={{ fontSize: 12, color: "var(--antracita-500)", marginTop: 8, fontStyle: "italic" }}>{t.notas}</p>
              )}
            </div>

            {/* Acciones */}
            <div
              style={{
                marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)",
                display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
              }}
            >
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--antracita-500)" }}>
                {!compacta && "Cambiar estado"}
                <select
                  aria-label="Cambiar estado"
                  title="Cambiar estado"
                  value={t.estado}
                  onChange={(e) => cambiarEstado(t.id, e.target.value as TasacionItem["estado"])}
                  disabled={isBusy}
                  className="input-base"
                  // input-base trae padding vertical de 10px: con height fijo cortaba el texto
                  style={{ height: 32, padding: "0 28px 0 10px", fontSize: 12.5, width: "auto", lineHeight: "30px" }}
                >
                  {Object.entries(ESTADO_CFG).map(([key, c]) => (
                    <option key={key} value={key}>{c.label}</option>
                  ))}
                </select>
              </label>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => (onEditar ? onEditar(t) : setEditandoId(t.id))}
                disabled={isBusy}
                className="il-btn il-btn--ghost"
                style={{ height: 30, fontSize: 11.5, gap: 4 }}
              >
                <Pencil size={12} />
                Editar
              </button>
              <button
                onClick={() => setAEliminar(t)}
                disabled={isBusy}
                className="il-btn il-btn--ghost"
                style={{ height: 30, fontSize: 11.5, gap: 4, color: "var(--danger-500)" }}
              >
                {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {!compacta && "Eliminar"}
              </button>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={aEliminar !== null}
        onOpenChange={(o) => { if (!o) setAEliminar(null); }}
        title="Eliminar tasación"
        confirmLabel="Eliminar"
        destructive
        loading={busy !== null && busy === aEliminar?.id}
        onConfirm={eliminar}
        description={<p>Se elimina la tasación de <strong>{aEliminar?.clienteNombre}</strong>. Esta acción no se puede deshacer.</p>}
      />
    </div>
  );
}
