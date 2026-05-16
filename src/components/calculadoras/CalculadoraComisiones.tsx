"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Copy, Home, Key } from "lucide-react";
import { calcularComision, fmt } from "@/lib/calculadoras";
import { ResultadoCard } from "./ResultadoCard";

const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary";
const inputStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" };
const labelCls = "block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5";

export function CalculadoraComisiones() {
  const [precio, setPrecio] = useState<number>(100000);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("USD");
  const [tipoOp, setTipoOp] = useState<"venta" | "alquiler">("venta");
  const [pctVendedor, setPctVendedor] = useState(3);
  const [pctComprador, setPctComprador] = useState(3);
  const [incluyeIVA, setIncluyeIVA] = useState(true);

  const resultado = useMemo(
    () => calcularComision(precio || 0, moneda, pctVendedor, pctComprador, incluyeIVA),
    [precio, moneda, pctVendedor, pctComprador, incluyeIVA]
  );

  function copiarResumen() {
    const tipo = tipoOp === "venta" ? "Venta" : "Alquiler";
    const lines = [
      `Comisión InmoLibres`,
      `Operación: ${tipo} — ${fmt(precio, moneda)}`,
      `Comisión vendedor (${pctVendedor}%): ${fmt(resultado.comisionVendedor, moneda)}`,
      `Comisión comprador (${pctComprador}%): ${fmt(resultado.comisionComprador, moneda)}`,
      ...(incluyeIVA ? [`IVA (21%): ${fmt(resultado.iva, moneda)}`] : []),
      `Total: ${fmt(resultado.total, moneda)}`,
    ].join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("Resumen copiado al portapapeles");
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* ── Inputs ── */}
      <div className="lg:col-span-3 space-y-6">
        {/* Precio + moneda */}
        <div>
          <label className={labelCls}>Precio de la operación</label>
          <div className="flex gap-2">
            <div className="flex rounded-xl border overflow-hidden shrink-0" style={{ borderColor: "var(--border)" }}>
              {(["USD", "ARS"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMoneda(m)}
                  className="px-4 py-2.5 text-sm font-semibold transition-colors"
                  style={{
                    background: moneda === m ? "var(--brand-primary)" : "var(--surface)",
                    color: moneda === m ? "white" : "var(--text-muted)",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={precio || ""}
              onChange={(e) => setPrecio(Number(e.target.value))}
              className={inputCls}
              style={inputStyle}
              placeholder="0"
              min={0}
            />
          </div>
        </div>

        {/* Tipo operación */}
        <div>
          <label className={labelCls}>Tipo de operación</label>
          <div className="flex gap-2 p-1 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
            {[
              { key: "venta", label: "Venta", Icon: Home },
              { key: "alquiler", label: "Alquiler", Icon: Key },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTipoOp(key as "venta" | "alquiler")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tipoOp === key ? "var(--surface)" : "transparent",
                  color: tipoOp === key ? "var(--brand-primary)" : "var(--text-muted)",
                  boxShadow: tipoOp === key ? "var(--shadow-card)" : "none",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Slider vendedor */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className={labelCls} style={{ marginBottom: 0 }}>Comisión vendedor</label>
            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--brand-primary)", fontFamily: "var(--font-mono)" }}>
              {pctVendedor}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={pctVendedor}
            onChange={(e) => setPctVendedor(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${pctVendedor * 10}%, var(--border) ${pctVendedor * 10}%, var(--border) 100%)`,
              accentColor: "var(--brand-primary)",
            }}
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>0%</span><span>5%</span><span>10%</span>
          </div>
        </div>

        {/* Slider comprador */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className={labelCls} style={{ marginBottom: 0 }}>Comisión comprador</label>
            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--brand-primary)", fontFamily: "var(--font-mono)" }}>
              {pctComprador}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={pctComprador}
            onChange={(e) => setPctComprador(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${pctComprador * 10}%, var(--border) ${pctComprador * 10}%, var(--border) 100%)`,
              accentColor: "var(--brand-primary)",
            }}
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>0%</span><span>5%</span><span>10%</span>
          </div>
        </div>

        {/* IVA toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
          <div>
            <p className="text-sm font-medium text-text-primary">Agregar IVA (21%)</p>
            <p className="text-xs text-text-muted">Aplicable a operaciones comerciales</p>
          </div>
          <button
            onClick={() => setIncluyeIVA((p) => !p)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: incluyeIVA ? "var(--brand-primary)" : "var(--border)" }}
            role="switch"
            aria-checked={incluyeIVA}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: incluyeIVA ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </div>

      {/* ── Resultados ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Resultados</p>

          <ResultadoCard label="Comisión del vendedor" valor={resultado.comisionVendedor} moneda={moneda} size="sm" />
          <ResultadoCard label="Comisión del comprador" valor={resultado.comisionComprador} moneda={moneda} size="sm" />
          {incluyeIVA && (
            <ResultadoCard label="IVA (21%)" valor={resultado.iva} moneda={moneda} size="sm" />
          )}
          <ResultadoCard
            label="Total a cobrar"
            valor={resultado.total}
            moneda={moneda}
            destacado
            size="lg"
            descripcion={`${pctVendedor + pctComprador}% total${incluyeIVA ? " + IVA" : ""}`}
          />

          <button
            onClick={copiarResumen}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors hover:bg-surface-raised mt-2"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <Copy className="w-4 h-4" />
            Copiar resumen
          </button>
        </div>
      </div>
    </div>
  );
}
