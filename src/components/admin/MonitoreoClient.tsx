"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Trash2, Loader2, ActivitySquare } from "lucide-react";
import { Pill } from "@/components/ui/pill";

interface Corrida {
  origen: string;
  label: string;
  ultimaCorrida: string | null;
  mensaje: string | null;
  stale: boolean;
}

interface LogRow {
  id: string;
  nivel: string;
  origen: string;
  mensaje: string;
  detalle: string | null;
  createdAt: string;
}

interface Props {
  corridas: Corrida[];
  logs: LogRow[];
  errores24h: number;
  errores7d: number;
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

export function MonitoreoClient({ corridas, logs, errores24h, errores7d }: Props) {
  const [rows, setRows] = useState(logs);
  const [busy, setBusy] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  async function limpiarViejos() {
    if (!confirm("¿Borrar los logs de más de 30 días? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/monitoreo?days=30", { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { data?: { eliminados: number }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al limpiar los logs");
      toast.success(`${json.data?.eliminados ?? 0} log(s) eliminados`);
      setRows((prev) => prev.filter((r) => Date.now() - new Date(r.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al limpiar los logs");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[1060px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p className="mono" style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
            Panel global · Superadmin
          </p>
          <h1 className="display" style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}>
            Monitoreo
          </h1>
          <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
            Estado de los procesos automáticos y errores recientes del sistema.
          </p>
        </div>
        <button
          onClick={limpiarViejos}
          disabled={busy}
          className="il-btn il-btn--ghost"
          style={{ height: 36, fontSize: 13, gap: 6 }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Limpiar logs +30 días
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="il-card" style={{ padding: "14px 16px" }}>
          <p className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            Errores · últimas 24h
          </p>
          <p className="display" style={{ fontSize: 26, margin: "4px 0 0", color: errores24h > 0 ? "var(--danger-500, #B23A2D)" : "var(--antracita-900)" }}>
            {errores24h}
          </p>
        </div>
        <div className="il-card" style={{ padding: "14px 16px" }}>
          <p className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            Errores · últimos 7 días
          </p>
          <p className="display" style={{ fontSize: 26, margin: "4px 0 0", color: "var(--antracita-900)" }}>
            {errores7d}
          </p>
        </div>
        <div className="il-card" style={{ padding: "14px 16px" }}>
          <p className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            Cron jobs monitoreados
          </p>
          <p className="display" style={{ fontSize: 26, margin: "4px 0 0", color: "var(--antracita-900)" }}>
            {corridas.length}
          </p>
        </div>
      </div>

      {/* Estado de los cron jobs */}
      <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <ActivitySquare size={16} style={{ color: "var(--terracota-500)" }} />
          <h3 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>
            Procesos automáticos (cron)
          </h3>
        </div>
        <div>
          {corridas.map((c) => (
            <div
              key={c.origen}
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--antracita-900)", margin: 0 }}>{c.label}</p>
                <p style={{ fontSize: 11.5, color: "var(--antracita-400)", margin: "2px 0 0" }}>
                  Última corrida: {fmtFecha(c.ultimaCorrida)}
                  {c.mensaje ? ` — ${c.mensaje}` : ""}
                </p>
              </div>
              {c.stale ? (
                <Pill tone="danger">
                  <AlertTriangle size={11} style={{ marginRight: 4 }} />
                  No corrió en {'>'}36hs
                </Pill>
              ) : (
                <Pill tone="success">
                  <CheckCircle2 size={11} style={{ marginRight: 4 }} />
                  OK
                </Pill>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Log de errores recientes */}
      <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={16} style={{ color: "var(--terracota-500)" }} />
          <h3 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>
            Errores y advertencias recientes
          </h3>
          <span style={{ fontSize: 11.5, color: "var(--antracita-400)" }}>(últimos {rows.length})</span>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <CheckCircle2 size={28} style={{ color: "var(--success-500, #4A7C59)", margin: "0 auto 8px" }} />
            <p style={{ fontSize: 13, color: "var(--antracita-400)", margin: 0 }}>Sin errores registrados. Todo tranquilo.</p>
          </div>
        ) : (
          <div>
            {rows.map((log) => (
              <div key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => setExpandido((prev) => (prev === log.id ? null : log.id))}
                  className="w-full text-left"
                  style={{ padding: "12px 20px", display: "flex", alignItems: "flex-start", gap: 10, background: "transparent", border: "none", cursor: log.detalle ? "pointer" : "default" }}
                >
                  <Pill tone={log.nivel === "ERROR" ? "danger" : "warning"} style={{ flexShrink: 0, marginTop: 1 }}>
                    {log.nivel}
                  </Pill>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, color: "var(--antracita-900)", margin: 0 }}>{log.mensaje}</p>
                    <p className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)", margin: "3px 0 0" }}>
                      {log.origen} · {fmtFecha(log.createdAt)}
                    </p>
                  </div>
                </button>
                {expandido === log.id && log.detalle && (
                  <pre
                    style={{
                      margin: "0 20px 14px",
                      padding: "10px 12px",
                      background: "var(--antracita-900, #14110E)",
                      color: "var(--crema-100, #F5EFE5)",
                      borderRadius: 8,
                      fontSize: 11,
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {log.detalle}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
