"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Copy, Info } from "lucide-react";
import { calcularAjusteICL, fmt, fmtNum } from "@/lib/calculadoras";
import { ResultadoCard } from "./ResultadoCard";

const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary";
const inputStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" };
const labelCls = "block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5";

export function CalculadoraICL() {
  const [alquilerActual, setAlquilerActual] = useState<number>(100000);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [indiceInicio, setIndiceInicio] = useState<number>(0);
  const [indiceFin, setIndiceFin] = useState<number>(0);

  const mesActual = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const resultado = useMemo(
    () => calcularAjusteICL(alquilerActual || 0, moneda, indiceInicio || 0, indiceFin || 0),
    [alquilerActual, moneda, indiceInicio, indiceFin]
  );

  function copiarNotificacion() {
    const lines = [
      `Actualización de alquiler — ${mesActual}`,
      `Alquiler anterior: ${fmt(resultado.alquilerActual, moneda)}`,
      `Variación ICL: ${fmtNum(resultado.porcentajeAumento)}%`,
      `Nuevo alquiler: ${fmt(resultado.nuevoAlquiler, moneda)}`,
      `Aumento mensual: ${fmt(resultado.aumento, moneda)}`,
    ].join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("Texto copiado para notificar al inquilino");
  }

  const indicesOk = indiceInicio > 0 && indiceFin > 0;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* ── Inputs ── */}
      <div className="lg:col-span-3 space-y-5">
        {/* Alquiler actual */}
        <div>
          <label className={labelCls}>Alquiler mensual actual</label>
          <div className="flex gap-2">
            <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {(["ARS", "USD"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMoneda(m)}
                  className="px-4 py-2.5 text-sm font-semibold transition-colors"
                  style={{ background: moneda === m ? "var(--brand-primary)" : "var(--surface)", color: moneda === m ? "white" : "var(--text-muted)" }}
                >
                  {m}
                </button>
              ))}
            </div>
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
        </div>

        {/* Índices ICL */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>ICL al inicio del período</label>
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
            <label className={labelCls}>ICL actual</label>
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

        {/* Info BCRA */}
        <div className="flex gap-2.5 p-3.5 rounded-xl" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          <Info className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary leading-relaxed space-y-1">
            <p>Consultá los índices ICL en:</p>
            <a
              href="https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables_datos.asp"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
              style={{ color: "var(--brand-primary)" }}
            >
              bcra.gob.ar → Índice para Contratos de Locación
            </a>
            <p className="text-text-muted">El ICL se publica todos los días hábiles.</p>
          </div>
        </div>

        {/* Vista previa del texto */}
        {indicesOk && resultado.porcentajeAumento !== 0 && (
          <div className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Vista previa — notificación inquilino</p>
            <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed font-mono">
{`Actualización de alquiler — ${mesActual}
Alquiler anterior: ${fmt(resultado.alquilerActual, moneda)}
Variación ICL: ${fmtNum(resultado.porcentajeAumento)}%
Nuevo alquiler: ${fmt(resultado.nuevoAlquiler, moneda)}
Aumento mensual: ${fmt(resultado.aumento, moneda)}`}
            </pre>
          </div>
        )}
      </div>

      {/* ── Resultados ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Resultado del ajuste</p>

          {!indicesOk ? (
            <div className="rounded-xl p-6 text-center border border-dashed" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm text-text-muted">Ingresá ambos índices ICL para calcular</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl p-4 text-center border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Variación ICL</p>
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
