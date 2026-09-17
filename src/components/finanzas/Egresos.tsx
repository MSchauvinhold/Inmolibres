"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { formatMonto, fmtFechaUTC } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";

// Tabla, alta y borrado de egresos. Compartido por Finanzas → Egresos y por la
// sección "Gastos de mantenimiento" de la ficha de propiedad (mismo modelo:
// EgresoInmobiliaria, con propiedadId opcional).

export interface Egreso {
  id: string;
  concepto: string;
  monto: number;
  moneda: "ARS" | "USD";
  fecha: string;
  categoria: string | null;
}

const CATEGORIAS = ["Publicidad", "Servicios", "Sueldos", "Impuestos", "Mantenimiento", "Otro"];

// ─── Tabla ─────────────────────────────────────────────────────────────────────

export function EgresosTabla({
  egresos, isAdmin, onDeleted, vacio = "Sin egresos registrados",
}: {
  egresos: Egreso[];
  isAdmin: boolean;
  onDeleted: (id: string) => void;
  vacio?: string;
}) {
  return (
    <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--crema-100, #F0E9DC)" }}>
              {["Fecha", "Concepto", "Categoría", "Monto", ...(isAdmin ? [""] : [])].map((h, idx) => (
                <th key={idx} style={{
                  textAlign: idx >= 3 ? "right" : "left",
                  padding: "11px 20px",
                  fontSize: 10.5,
                  color: "var(--antracita-300)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-jetbrains-mono, monospace)",
                  fontWeight: 600,
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {egresos.map((e, i) => (
              <tr
                key={e.id}
                style={{
                  borderBottom: i < egresos.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 150ms",
                }}
                onMouseEnter={ev => (ev.currentTarget.style.background = "var(--crema-50, #FBF8F2)")}
                onMouseLeave={ev => (ev.currentTarget.style.background = "")}
              >
                <td className="mono" style={{ padding: "12px 20px", color: "var(--antracita-400)", fontSize: 12.5 }}>
                  {fmtFechaUTC(e.fecha)}
                </td>
                <td style={{ padding: "12px 20px", color: "var(--antracita-900)" }}>{e.concepto}</td>
                <td style={{ padding: "12px 20px" }}>
                  {e.categoria && (
                    <Pill tone="neutral" style={{ fontSize: 10.5 }}>{e.categoria}</Pill>
                  )}
                </td>
                <td className="mono" style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, color: "var(--antracita-900)" }}>
                  {formatMonto(e.monto, e.moneda)}
                </td>
                {isAdmin && (
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <DeleteEgresoButton id={e.id} onDelete={() => onDeleted(e.id)} />
                  </td>
                )}
              </tr>
            ))}
            {egresos.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
                  style={{ padding: "32px 20px", textAlign: "center", color: "var(--antracita-300)", fontSize: 13 }}
                >
                  {vacio}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Delete button ─────────────────────────────────────────────────────────────

function DeleteEgresoButton({ id, onDelete }: { id: string; onDelete: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/finanzas/egresos/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar");
      onDelete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      onClick={handle}
      disabled={loading}
      style={{ padding: "4px 6px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--danger-400, #D05A4E)" }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}

// ─── Nuevo egreso modal ────────────────────────────────────────────────────────

export function NuevoEgresoModal({
  onClose, onCreated, propiedadId,
}: {
  onClose: () => void;
  onCreated: (e: Egreso) => void;
  /** Si se pasa, el egreso queda vinculado a esa propiedad (gasto de mantenimiento) */
  propiedadId?: string;
}) {
  const [form, setForm] = useState({
    concepto: "",
    monto: "",
    moneda: "ARS" as "ARS" | "USD",
    categoria: propiedadId ? "Mantenimiento" : "Otro",
    fecha: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const inp = "input-base w-full text-sm";
  const lbl = "block text-xs font-medium mb-1" as string;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/finanzas/egresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, monto: Number(form.monto), propiedadId: propiedadId ?? null }),
      });
      const data = (await res.json()) as { data?: Egreso; error?: string };
      if (!res.ok) throw new Error(data.error);
      const d = data.data!;
      onCreated({ ...d, monto: Number(d.monto), fecha: new Date(d.fecha).toISOString() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.36)", padding: 16 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 18, boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontWeight: 600, color: "var(--antracita-900)", margin: 0 }}>
            {propiedadId ? "Nuevo gasto de mantenimiento" : "Nuevo egreso"}
          </p>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--antracita-400)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className={lbl} style={{ color: "var(--antracita-700)" }}>Concepto *</label>
            <input required value={form.concepto} onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))} className={inp} placeholder={propiedadId ? "Arreglo de cañería..." : "Publicidad portal..."} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className={lbl} style={{ color: "var(--antracita-700)" }}>Monto *</label>
              <input type="number" required min={0} value={form.monto} onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))} className={inp} placeholder="0" />
            </div>
            <div>
              <label className={lbl} style={{ color: "var(--antracita-700)" }}>Moneda</label>
              <select value={form.moneda} onChange={(e) => setForm((p) => ({ ...p, moneda: e.target.value as "ARS" | "USD" }))} className={inp}>
                <option>ARS</option>
                <option>USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl} style={{ color: "var(--antracita-700)" }}>Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} className={inp}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl} style={{ color: "var(--antracita-700)" }}>Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} className={inp} />
          </div>
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} className="il-btn il-btn--ghost" style={{ flex: 1, justifyContent: "center", height: 40, fontSize: 13 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="il-btn il-btn--primary" style={{ flex: 1, justifyContent: "center", height: 40, fontSize: 13, opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
