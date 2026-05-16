"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { MessageCircle, RefreshCw } from "lucide-react";
import { calcularEscrituracion, fmt } from "@/lib/calculadoras";
import { ResultadoCard } from "./ResultadoCard";

const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary";
const inputStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" };
const labelCls = "block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5";

function Toggle({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {desc && <p className="text-xs text-text-muted">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4"
        style={{ background: value ? "var(--brand-primary)" : "var(--border)" }}
        role="switch"
        aria-checked={value}
      >
        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: value ? "translateX(20px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}

export function CalculadoraEscrituracion() {
  const [precio, setPrecio] = useState<number>(50000);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("USD");
  const [tasaCambio, setTasaCambio] = useState<number>(1200);
  const [cargandoTC, setCargandoTC] = useState(false);
  const [aplicaITI, setAplicaITI] = useState(false);
  const [incluyeComision, setIncluyeComision] = useState(false);

  useEffect(() => {
    if (moneda === "USD") fetchTasaCambio();
  }, [moneda]);

  async function fetchTasaCambio() {
    setCargandoTC(true);
    try {
      const res = await fetch("/api/divisas");
      if (!res.ok) throw new Error();
      const data: { casa: string; venta: number }[] = await res.json();
      const blue = data.find((d) => d.casa === "blue");
      if (blue?.venta) setTasaCambio(Math.round(blue.venta));
    } catch {
      toast.error("No se pudo obtener el tipo de cambio. Ingresalo manualmente.");
    } finally {
      setCargandoTC(false);
    }
  }

  const resultado = useMemo(
    () => calcularEscrituracion(precio || 0, moneda, tasaCambio || 1, aplicaITI, incluyeComision),
    [precio, moneda, tasaCambio, aplicaITI, incluyeComision]
  );

  function enviarPorWhatsApp() {
    const texto = [
      `📋 *Estimación de gastos de escrituración*`,
      ``,
      `Precio de venta: ${fmt(precio, moneda)}`,
      moneda === "USD" ? `Tipo de cambio: $${tasaCambio.toLocaleString("es-AR")}` : "",
      ``,
      `• Impuesto de sellos (1.8%): ${fmt(resultado.sellos / (moneda === "USD" ? tasaCambio : 1), moneda)}`,
      `• Honorarios escribano (~2%): ${fmt(resultado.escribano / (moneda === "USD" ? tasaCambio : 1), moneda)}`,
      aplicaITI ? `• ITI (1.5%): ${fmt(resultado.iti / (moneda === "USD" ? tasaCambio : 1), moneda)}` : "",
      incluyeComision ? `• Comisión inmobiliaria (3%): ${fmt(resultado.comisionInmobiliaria / (moneda === "USD" ? tasaCambio : 1), moneda)}` : "",
      ``,
      `*Total estimado: ${fmt(resultado.totalConComision / (moneda === "USD" ? tasaCambio : 1), moneda)}*`,
      ``,
      `_Valores estimados. Consultar con el escribano._`,
    ].filter((l) => l !== "").join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* ── Inputs ── */}
      <div className="lg:col-span-3 space-y-5">
        <div>
          <label className={labelCls}>Precio de venta</label>
          <div className="flex gap-2">
            <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
              {(["USD", "ARS"] as const).map((m) => (
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
              value={precio || ""}
              onChange={(e) => setPrecio(Number(e.target.value))}
              className={inputCls}
              style={inputStyle}
              placeholder="0"
              min={0}
            />
          </div>
        </div>

        {moneda === "USD" && (
          <div>
            <label className={labelCls}>Tipo de cambio (ARS por USD)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={tasaCambio || ""}
                onChange={(e) => setTasaCambio(Number(e.target.value))}
                className={inputCls}
                style={inputStyle}
                placeholder="Ej: 1200"
              />
              <button
                onClick={fetchTasaCambio}
                disabled={cargandoTC}
                className="px-3 py-2 rounded-xl border text-sm flex items-center gap-1.5 shrink-0 transition-colors hover:bg-surface-raised disabled:opacity-60"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                title="Actualizar cotización blue"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargandoTC ? "animate-spin" : ""}`} />
                Blue
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-1">
          <Toggle
            value={aplicaITI}
            onChange={setAplicaITI}
            label="Aplica ITI (1.5%)"
            desc="Impuesto a la transferencia. Para 1ª venta de inmuebles"
          />
          <Toggle
            value={incluyeComision}
            onChange={setIncluyeComision}
            label="Incluir comisión inmobiliaria (3%)"
            desc="Referencial — puede variar según lo acordado"
          />
        </div>

        {/* Nota aclaratoria */}
        <div className="flex gap-2.5 p-3 rounded-xl" style={{ background: "var(--brand-accent-light)", borderLeft: "3px solid var(--brand-accent)" }}>
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-semibold">Valores estimados.</span> Los montos exactos los determina el escribano interviniente según las alícuotas vigentes en Corrientes.
          </p>
        </div>
      </div>

      {/* ── Resultados ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Desglose estimado</p>

          {moneda === "USD" && (
            <div className="text-xs text-text-muted px-1 mb-2">
              Precio en ARS: <span className="font-semibold text-text-primary">{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(resultado.precioARS)}</span>
            </div>
          )}

          <ResultadoCard label="Impuesto de sellos (1.8%)" valor={resultado.sellos} moneda="ARS" size="sm" />
          <ResultadoCard label="Honorarios escribano (~2%)" valor={resultado.escribano} moneda="ARS" size="sm" />
          {aplicaITI && <ResultadoCard label="ITI (1.5%)" valor={resultado.iti} moneda="ARS" size="sm" />}
          {incluyeComision && <ResultadoCard label="Comisión inmobiliaria (3%)" valor={resultado.comisionInmobiliaria} moneda="ARS" size="sm" />}

          <ResultadoCard
            label="Total gastos aprox."
            valor={resultado.totalConComision}
            moneda="ARS"
            destacado
            size="lg"
            descripcion="Valor referencial en pesos"
          />

          <button
            onClick={enviarPorWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 mt-2"
            style={{ background: "#25D366", color: "white" }}
          >
            <MessageCircle className="w-4 h-4" />
            Enviar al cliente por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
