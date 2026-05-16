"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ArrowLeftRight, Clock } from "lucide-react";
import { toast } from "sonner";

interface TipoCambio {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

const TIPOS_ORDEN = ["blue", "oficial", "mep", "mayorista", "cripto"];
const NOMBRES: Record<string, string> = {
  blue: "Dólar Blue",
  oficial: "Dólar Oficial",
  mep: "Dólar MEP",
  mayorista: "Dólar Mayorista",
  cripto: "Dólar Cripto",
};

interface HistorialItem {
  monto: number;
  moneda: "USD" | "ARS";
  tipo: string;
  resultado: number;
  ts: number;
}

export function CalculadoraDivisas() {
  const [cotizaciones, setCotizaciones] = useState<TipoCambio[]>([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("blue");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [montoUSD, setMontoUSD] = useState<string>("1000");
  const [montoARS, setMontoARS] = useState<string>("");
  const [activo, setActivo] = useState<"USD" | "ARS">("USD");
  const [historial, setHistorial] = useState<HistorialItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("divisas_historial");
      return saved ? (JSON.parse(saved) as HistorialItem[]) : [];
    } catch { return []; }
  });

  const cotActual = cotizaciones.find((c) => c.casa === tipoSeleccionado);
  const tasaVenta = cotActual?.venta ?? 0;
  const tasaCompra = cotActual?.compra ?? 0;

  const fetchCotizaciones = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const res = await fetch("/api/divisas");
      if (!res.ok) throw new Error();
      const data: TipoCambio[] = await res.json();
      setCotizaciones(data.sort((a, b) => TIPOS_ORDEN.indexOf(a.casa) - TIPOS_ORDEN.indexOf(b.casa)));
    } catch {
      setError(true);
      toast.error("No se pudo obtener la cotización");
    } finally {
      setCargando(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchCotizaciones(); }, [fetchCotizaciones]);

  // Recalcular cuando cambia la tasa o el tipo activo
  useEffect(() => {
    if (!tasaVenta) return;
    const snap = { activo, montoUSD, montoARS };
    queueMicrotask(() => {
      if (snap.activo === "USD") {
        const usd = parseFloat(snap.montoUSD) || 0;
        setMontoARS(usd > 0 ? (usd * tasaVenta).toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "");
      } else {
        const ars = parseFloat(snap.montoARS.replace(/\./g, "").replace(",", ".")) || 0;
        setMontoUSD(ars > 0 ? (ars / tasaVenta).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasaVenta, tipoSeleccionado]);

  function handleUSDChange(val: string) {
    setActivo("USD");
    setMontoUSD(val);
    const usd = parseFloat(val) || 0;
    if (tasaVenta && usd > 0) {
      setMontoARS((usd * tasaVenta).toLocaleString("es-AR", { maximumFractionDigits: 0 }));
    } else {
      setMontoARS("");
    }
  }

  function handleARSChange(val: string) {
    setActivo("ARS");
    setMontoARS(val);
    const ars = parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
    if (tasaVenta && ars > 0) {
      setMontoUSD((ars / tasaVenta).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setMontoUSD("");
    }
  }

  function guardarEnHistorial() {
    if (!tasaVenta || !montoUSD) return;
    const usd = parseFloat(montoUSD) || 0;
    if (!usd) return;
    const item: HistorialItem = {
      monto: usd,
      moneda: "USD",
      tipo: tipoSeleccionado,
      resultado: usd * tasaVenta,
      ts: Date.now(),
    };
    const nuevo = [item, ...historial].slice(0, 3);
    setHistorial(nuevo);
    try { localStorage.setItem("divisas_historial", JSON.stringify(nuevo)); } catch {/* ignore */}
  }


  const formatHora = (ts: number) => new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  const inputCls = "w-full px-4 py-3 rounded-xl border text-lg font-bold tabular-nums outline-none transition-all focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary";

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* ── Izquierda: cotizaciones + conversor ── */}
      <div className="lg:col-span-3 space-y-5">
        {/* Selector tipo de cambio */}
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Tipo de cambio</p>
          <div className="flex flex-wrap gap-2">
            {cargando ? (
              <div className="flex items-center gap-2 text-text-muted text-sm py-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Cargando cotizaciones...
              </div>
            ) : error ? (
              <p className="text-sm text-danger">Error al cargar. <button onClick={fetchCotizaciones} className="underline">Reintentar</button></p>
            ) : (
              cotizaciones.map((c) => (
                <button
                  key={c.casa}
                  onClick={() => setTipoSeleccionado(c.casa)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background: tipoSeleccionado === c.casa ? "var(--brand-primary)" : "var(--surface)",
                    color: tipoSeleccionado === c.casa ? "white" : "var(--text-secondary)",
                    borderColor: tipoSeleccionado === c.casa ? "var(--brand-primary)" : "var(--border)",
                  }}
                >
                  {NOMBRES[c.casa] ?? c.nombre}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Cotización actual */}
        {cotActual && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-semibold">Compra</p>
              <p className="text-2xl font-bold tabular-nums mt-1" style={{ fontFamily: "var(--font-mono)", color: "var(--brand-primary)" }}>
                ${cotActual.compra.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl p-4 border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-semibold">Venta</p>
              <p className="text-2xl font-bold tabular-nums mt-1" style={{ fontFamily: "var(--font-mono)", color: "var(--brand-accent)" }}>
                ${cotActual.venta.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="col-span-2 flex items-center justify-between text-xs text-text-muted px-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(cotActual.fechaActualizacion).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
              <button onClick={fetchCotizaciones} className="flex items-center gap-1 hover:text-brand-primary transition-colors">
                <RefreshCw className="w-3 h-3" /> Actualizar
              </button>
            </div>
          </div>
        )}

        {/* Conversor */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Conversor</p>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">USD</div>
            <input
              type="number"
              value={montoUSD}
              onChange={(e) => handleUSDChange(e.target.value)}
              onBlur={guardarEnHistorial}
              className={inputCls}
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", paddingLeft: "3.5rem" }}
              placeholder="0.00"
              min={0}
              step="0.01"
            />
          </div>

          <div className="flex items-center justify-center gap-2 py-1">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <div className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <ArrowLeftRight className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">ARS</div>
            <input
              type="text"
              value={montoARS}
              onChange={(e) => handleARSChange(e.target.value)}
              className={inputCls}
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", paddingLeft: "3.5rem" }}
              placeholder="0"
            />
          </div>
        </div>

        <p className="text-[11px] text-text-muted px-1">
          Cotización referencial usando tasa de venta {cotActual ? `(${NOMBRES[cotActual.casa] ?? cotActual.nombre})` : ""}. Los valores pueden variar.
        </p>
      </div>

      {/* ── Derecha: historial ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Últimas consultas</p>

          {historial.length === 0 ? (
            <div className="rounded-xl p-6 text-center border border-dashed" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm text-text-muted">Las conversiones que realices aparecerán aquí</p>
            </div>
          ) : (
            historial.map((h, i) => (
              <div key={i} className="rounded-xl p-4 border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] text-text-muted uppercase tracking-wide font-semibold">{NOMBRES[h.tipo] ?? h.tipo}</span>
                  <span className="text-[10px] text-text-muted">{formatHora(h.ts)}</span>
                </div>
                <p className="text-sm font-bold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  USD {h.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "var(--brand-accent)" }}>
                  ${h.resultado.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </p>
              </div>
            ))
          )}

          {/* Spread info */}
          {cotActual && (
            <div className="rounded-xl p-4 border mt-4" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-semibold mb-2">Spread {NOMBRES[cotActual.casa] ?? cotActual.nombre}</p>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Compra</span>
                <span className="font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>${tasaCompra.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-text-secondary">Venta</span>
                <span className="font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>${tasaVenta.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs mt-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-text-muted">Diferencia</span>
                <span className="font-semibold tabular-nums text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
                  ${(tasaVenta - tasaCompra).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
