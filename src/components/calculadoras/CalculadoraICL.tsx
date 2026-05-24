"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Copy, Info, Loader2 } from "lucide-react";
import { calcularAjusteICL, fmt, fmtNum } from "@/lib/calculadoras";
import { ResultadoCard } from "./ResultadoCard";

const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary";
const inputStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" };
const labelCls = "block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5";

interface IndiceData {
  valor: number | null;
  fecha: string | null;
}

export function CalculadoraICL() {
  const [alquilerActual, setAlquilerActual] = useState<number>(100000);
  const moneda: "ARS" | "USD" = "ARS";
  const [indiceInicio, setIndiceInicio] = useState<number>(0);
  const [indiceFin, setIndiceFin] = useState<number>(0);
  const [indiceType, setIndiceType] = useState<"ICL" | "IPC">("ICL");

  const [icl, setIcl] = useState<IndiceData | null>(null);
  const [ipc, setIpc] = useState<IndiceData | null>(null);
  const [loadingIndices, setLoadingIndices] = useState(false);

  const mesActual = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingIndices(true);
      try {
        const res = await fetch("/api/indices");
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { data: { icl: IndiceData | null; ipc: IndiceData | null } };
        if (!cancelled) {
          setIcl(json.data.icl);
          setIpc(json.data.ipc);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingIndices(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resultado = useMemo(
    () => calcularAjusteICL(alquilerActual || 0, moneda, indiceInicio || 0, indiceFin || 0),
    [alquilerActual, moneda, indiceInicio, indiceFin]
  );

  function copiarNotificacion() {
    const lines = [
      `Actualización de alquiler — ${mesActual}`,
      `Índice usado: ${indiceType}`,
      `Alquiler anterior: ${fmt(resultado.alquilerActual, moneda)}`,
      `Variación ${indiceType}: ${fmtNum(resultado.porcentajeAumento)}%`,
      `Nuevo alquiler: ${fmt(resultado.nuevoAlquiler, moneda)}`,
      `Aumento mensual: ${fmt(resultado.aumento, moneda)}`,
    ].join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("Texto copiado para notificar al inquilino");
  }

  const indicesOk = indiceInicio > 0 && indiceFin > 0;

  const iclVariacion = icl?.valor && ipc?.valor
    ? ((icl.valor / (ipc.valor || 1)) - 1) * 100
    : null;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* ── Inputs ── */}
      <div className="lg:col-span-3 space-y-5">
        {/* Toggle ICL / IPC */}
        <div>
          <label className={labelCls}>Índice de ajuste</label>
          <div className="flex gap-2 p-1 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
            {(["ICL", "IPC"] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setIndiceType(tipo)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: indiceType === tipo ? "var(--surface)" : "transparent",
                  color: indiceType === tipo ? "var(--brand-primary)" : "var(--text-muted)",
                  boxShadow: indiceType === tipo ? "var(--shadow-card)" : "none",
                }}
              >
                {tipo}
                <span className="ml-1 text-[10px] font-normal">
                  {tipo === "ICL" ? "(BCRA)" : "(INDEC)"}
                </span>
              </button>
            ))}
          </div>

          {/* Nota explicativa */}
          <div className="mt-2 p-3 rounded-xl text-xs" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
            {indiceType === "ICL" ? (
              <p className="text-text-secondary">
                <strong>ICL (BCRA):</strong> Conviene más al <strong>inquilino</strong> — refleja solo inflación financiera. Publicado a diario.
              </p>
            ) : (
              <p className="text-text-secondary">
                <strong>IPC (INDEC):</strong> Conviene más al <strong>propietario</strong> — refleja inflación general de precios. Publicado mensualmente.
              </p>
            )}
          </div>
        </div>

        {/* Alquiler actual */}
        <div>
          <label className={labelCls}>Alquiler mensual actual</label>
          <input
            type="number"
            value={alquilerActual || ""}
            onChange={(e) => setAlquilerActual(Number(e.target.value))}
            className={inputCls}
            style={inputStyle}
            placeholder="0"
            min={0}
          />
        </div>

        {/* Índices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{indiceType} al inicio del período</label>
            <input
              type="number"
              value={indiceInicio || ""}
              onChange={(e) => setIndiceInicio(Number(e.target.value))}
              className={inputCls}
              style={inputStyle}
              placeholder="Ej: 500.23"
              step="0.01"
            />
          </div>
          <div>
            <label className={labelCls}>{indiceType} actual</label>
            <input
              type="number"
              value={indiceFin || ""}
              onChange={(e) => setIndiceFin(Number(e.target.value))}
              className={inputCls}
              style={inputStyle}
              placeholder="Ej: 620.45"
              step="0.01"
            />
          </div>
        </div>

        {/* Info índices + referencia */}
        <div className="flex gap-2.5 p-3.5 rounded-xl" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          <Info className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary leading-relaxed space-y-1.5">
            {loadingIndices ? (
              <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /><span>Cargando índices...</span></div>
            ) : (
              <>
                {icl?.valor && (
                  <p>ICL actual: <strong>{fmtNum(icl.valor)}</strong> ({icl.fecha})</p>
                )}
                {ipc?.valor && (
                  <p>IPC mensual: <strong>{fmtNum(ipc.valor)}%</strong> ({ipc.fecha})</p>
                )}
                {iclVariacion !== null && (
                  <p className="text-text-muted">Diferencia ICL vs IPC este período: {fmtNum(iclVariacion)}%</p>
                )}
              </>
            )}
            <p>
              {indiceType === "ICL" ? (
                <a href="https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables_datos.asp" target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: "var(--brand-primary)" }}>
                  bcra.gob.ar → Índice para Contratos de Locación
                </a>
              ) : (
                <a href="https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31" target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: "var(--brand-primary)" }}>
                  indec.gob.ar → IPC — Precios al consumidor
                </a>
              )}
            </p>
          </div>
        </div>

        {/* Vista previa del texto */}
        {indicesOk && resultado.porcentajeAumento !== 0 && (
          <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Vista previa — notificación inquilino</p>
            <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed font-mono">
{`Actualización de alquiler — ${mesActual}
Índice: ${indiceType}
Alquiler anterior: ${fmt(resultado.alquilerActual, moneda)}
Variación ${indiceType}: ${fmtNum(resultado.porcentajeAumento)}%
Nuevo alquiler: ${fmt(resultado.nuevoAlquiler, moneda)}
Aumento mensual: ${fmt(resultado.aumento, moneda)}`}
            </pre>
          </div>
        )}
      </div>

      {/* ── Resultados ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Resultado del ajuste — {indiceType}</p>

          {!indicesOk ? (
            <div className="rounded-xl p-6 text-center border border-dashed" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm text-text-muted">Ingresá ambos índices {indiceType} para calcular</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl p-4 text-center border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Variación {indiceType}</p>
                <p
                  className="text-4xl font-bold tabular-nums"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: resultado.porcentajeAumento >= 0 ? "var(--brand-primary)" : "var(--danger)",
                  }}
                >
                  {resultado.porcentajeAumento >= 0 ? "+" : ""}{fmtNum(resultado.porcentajeAumento)}%
                </p>
              </div>

              <ResultadoCard label="Alquiler anterior" valor={resultado.alquilerActual} moneda={moneda} size="sm" />
              <ResultadoCard label="Aumento mensual" valor={resultado.aumento} moneda={moneda} size="sm" />
              <ResultadoCard label="Nuevo alquiler" valor={resultado.nuevoAlquiler} moneda={moneda} destacado size="lg" />

              <button
                onClick={copiarNotificacion}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors hover:bg-surface-raised mt-2"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <Copy className="w-4 h-4" />
                Copiar para notificar al inquilino
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
