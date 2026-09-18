"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface IndiceHistorial {
  id: string;
  tipo: "ICL" | "IPC";
  valor: number;
  fecha: string;
  createdAt: string;
}

interface IndiceActualInfo {
  valor: number;
  fecha: string;
  anterior?: number | null;
}

const TIPOS = ["ICL", "IPC"] as const;

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AdminIndicesClient() {
  const [historial, setHistorial] = useState<IndiceHistorial[]>([]);
  const [actual, setActual] = useState<{ icl: IndiceActualInfo | null; ipc: IndiceActualInfo | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("ICL");
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/indices");
      if (res.ok) {
        const json = await res.json() as { data: { historial: IndiceHistorial[]; actual: { icl: IndiceActualInfo | null; ipc: IndiceActualInfo | null } } };
        setHistorial(json.data.historial);
        setActual(json.data.actual);
      } else {
        toast.error("Error al cargar índices");
      }
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function cargarValor() {
    const valorNum = Number(valor);
    if (!valorNum || valorNum <= 0) {
      toast.error("Ingresá un valor válido");
      return;
    }
    if (!fecha) {
      toast.error("Ingresá una fecha");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/indices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, valor: valorNum, fecha }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Error al guardar");
        return;
      }
      toast.success(`Valor de ${tipo} cargado`);
      setValor("");
      load();
    } catch {
      toast.error("Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/indices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Error al eliminar");
        return;
      }
      setHistorial((prev) => prev.filter((h) => h.id !== id));
      toast.success("Valor eliminado");
    } catch {
      toast.error("Error inesperado");
    } finally {
      setDeletingId(null);
    }
  }

  const inp = "input-base w-full text-sm";

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Índices ICL / IPC</h1>
        <p className="text-sm text-text-muted mt-1">
          Los ajustes de alquiler usan la API oficial del BCRA (ICL) y datos.gob.ar (IPC) automáticamente.
          Cargá un valor manual acá solo si esas fuentes fallan o publican con demora.
        </p>
      </div>

      {/* Valores actuales de la fuente oficial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TIPOS.map((t) => {
          const info = t === "ICL" ? actual?.icl : actual?.ipc;
          return (
            <div key={t} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t} (oficial)</span>
              </div>
              {info ? (
                <>
                  <p className="text-xl font-bold text-text-primary font-mono">{info.valor.toLocaleString("es-AR")}</p>
                  <p className="text-xs text-text-muted mt-1">Fecha: {info.fecha}</p>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--danger-600, #C0392B)" }}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Fuente oficial no disponible — usá carga manual
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Formulario de carga manual */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Cargar valor manual
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Índice</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])} className={inp}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Valor</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ej: 512.34"
              className={inp}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inp} />
          </div>
        </div>
        <button onClick={cargarValor} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Guardar valor
        </button>
      </div>

      {/* Historial */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-text-primary text-sm">Historial de cargas manuales</h2>
          </div>
          {historial.length === 0 ? (
            <p className="px-4 py-8 text-center text-text-muted text-sm">
              Todavía no se cargó ningún valor manual.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-border bg-surface-raised">
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Índice</th>
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Valor</th>
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id} className="border-b border-border last:border-0 hover:bg-surface-raised/50">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{h.tipo}</td>
                      <td className="px-4 py-2.5 font-mono text-text-secondary">{h.valor.toLocaleString("es-AR")}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{h.fecha}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => eliminar(h.id)}
                          disabled={deletingId === h.id}
                          title="Eliminar"
                          className="flex items-center justify-center p-1.5 rounded-lg border border-border hover:bg-red-50 transition-colors text-text-muted hover:text-danger"
                        >
                          {deletingId === h.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
