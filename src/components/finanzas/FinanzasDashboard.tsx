"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Plus, Loader2, ChevronRight,
  Trash2, RefreshCw, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { formatMonto } from "@/lib/utils";

interface Operacion {
  id: string;
  tipo: "VENTA" | "ALQUILER" | "ALQUILER_TEMPORARIO";
  precioOperacion: number;
  moneda: "ARS" | "USD";
  comisionVendedorPct: number;
  comisionCompradorPct: number;
  comisionTotal: number;
  comisionInmob: number;
  comisionAgente: number;
  ivaComision: number;
  gastos: number;
  fechaCierre: string;
  notas: string | null;
  agente: { id: string; nombre: string };
}

interface Egreso {
  id: string;
  concepto: string;
  monto: number;
  moneda: "ARS" | "USD";
  fecha: string;
  categoria: string | null;
}

interface Props {
  data: { operaciones: Operacion[]; egresos: Egreso[] };
  agentes: { id: string; nombre: string }[];
  isAdmin: boolean;
  userId: string;
}

type VistaMoneda = "ARS" | "USD" | "CONSOLIDADO";
type TipoCambio = "blue" | "mep" | "oficial";

interface DivisaData {
  casa: string;
  nombre: string;
  compra: number | null;
  venta: number;
}

const TIPO_LABELS = {
  VENTA: "Venta",
  ALQUILER: "Alquiler",
  ALQUILER_TEMPORARIO: "Temporario",
};

const CATEGORIAS = ["Publicidad", "Servicios", "Sueldos", "Impuestos", "Mantenimiento", "Otro"];

const COLORES = {
  ingresos: "#C1694F",
  egresos: "#D4A853",
  linea: "#C1694F",
};

const PIE_COLORS = ["#C1694F", "#2980B9", "#2D6A4F"];
const RANKING_COLORS = ["#C1694F", "#D4A853", "#2980B9", "#2D6A4F", "#7B68EE", "#FF8C42"];

function MetricCard({
  label, value, sub, trend, estimado,
}: {
  label: string; value: string; sub?: string;
  trend?: "up" | "down"; estimado?: boolean;
}) {
  return (
    <div className="card p-5 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`font-price text-2xl font-bold tabular-nums ${estimado ? "text-text-muted" : "text-text-primary"}`}>
        {value}
      </p>
      {estimado && <p className="text-[10px] text-text-muted">Est. al tipo de cambio</p>}
      {sub && (
        <div className="flex items-center gap-1">
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-success" />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-danger" />}
          <p className="text-xs text-text-muted">{sub}</p>
        </div>
      )}
    </div>
  );
}

function getMesLabel(fechaStr: string) {
  const d = new Date(fechaStr);
  return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
}

function groupByMes<T extends { fechaCierre?: string; fecha?: string }>(
  items: T[],
  getVal: (item: T) => number
): { mes: string; valor: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const dateStr = "fechaCierre" in item ? (item as { fechaCierre?: string }).fechaCierre : (item as { fecha?: string }).fecha;
    if (!dateStr) continue;
    const label = getMesLabel(dateStr);
    map.set(label, (map.get(label) ?? 0) + getVal(item));
  }
  return Array.from(map.entries()).map(([mes, valor]) => ({ mes, valor }));
}

export function FinanzasDashboard({ data, agentes, isAdmin, userId }: Props) {
  const [tab, setTab] = useState<"dashboard" | "operaciones" | "egresos">("dashboard");

  const [vistaMoneda, setVistaMoneda] = useState<VistaMoneda>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("finanzas_vista") as VistaMoneda) ?? "ARS";
    }
    return "ARS";
  });
  const [tipoCambio, setTipoCambio] = useState<TipoCambio>("blue");
  const [cotizaciones, setCotizaciones] = useState<DivisaData[] | null>(null);
  const [loadingCotiz, setLoadingCotiz] = useState(false);
  const [cotizTs, setCotizTs] = useState<Date | null>(null);

  const [showNuevaOp, setShowNuevaOp] = useState(false);
  const [showNuevoEgreso, setShowNuevoEgreso] = useState(false);
  const [selectedOp, setSelectedOp] = useState<Operacion | null>(null);

  const [ops, setOps] = useState(data.operaciones);
  const [egresos, setEgresos] = useState(data.egresos);

  useEffect(() => {
    localStorage.setItem("finanzas_vista", vistaMoneda);
  }, [vistaMoneda]);

  const fetchCotizaciones = useCallback(async () => {
    setLoadingCotiz(true);
    try {
      const res = await fetch("/api/divisas");
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (Array.isArray(json)) {
        setCotizaciones(json as DivisaData[]);
        setCotizTs(new Date());
      }
    } catch {
      toast.error("No se pudo obtener la cotización del dólar");
    } finally {
      setLoadingCotiz(false);
    }
  }, []);

  useEffect(() => {
    if (vistaMoneda === "CONSOLIDADO" && !cotizaciones) {
      fetchCotizaciones();
    }
  }, [vistaMoneda, cotizaciones, fetchCotizaciones]);

  const cotizacionVenta = useMemo(() => {
    if (!cotizaciones) return null;
    const casaMap: Record<TipoCambio, string> = { blue: "blue", mep: "bolsa", oficial: "oficial" };
    const entry = cotizaciones.find((d) => d.casa === casaMap[tipoCambio]);
    return entry?.venta ?? null;
  }, [cotizaciones, tipoCambio]);

  const cotizMinsAgo = cotizTs
    ? Math.floor((Date.now() - cotizTs.getTime()) / 60_000)
    : null;

  const inicioMes = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Ops and egresos filtered by current vista (for charts + recents)
  const opsVista = useMemo(() => {
    if (vistaMoneda === "CONSOLIDADO") return ops;
    return ops.filter((o) => o.moneda === vistaMoneda);
  }, [ops, vistaMoneda]);

  const egresosVista = useMemo(() => {
    if (vistaMoneda === "CONSOLIDADO") return egresos;
    return egresos.filter((e) => e.moneda === vistaMoneda);
  }, [egresos, vistaMoneda]);

  const opsMesVista = useMemo(
    () => opsVista.filter((o) => new Date(o.fechaCierre) >= inicioMes),
    [opsVista, inicioMes]
  );
  const egresosMesVista = useMemo(
    () => egresosVista.filter((e) => new Date(e.fecha) >= inicioMes),
    [egresosVista, inicioMes]
  );

  // Moneda de visualización para formatMonto
  const monedaDisplay: "ARS" | "USD" = vistaMoneda === "USD" ? "USD" : "ARS";

  // Helper: convierte comisionTotal según vista
  const convertirOp = useCallback(
    (op: Operacion): number | null => {
      if (vistaMoneda !== "CONSOLIDADO") return op.comisionInmob;
      if (op.moneda === "ARS") return op.comisionInmob;
      return cotizacionVenta !== null ? op.comisionInmob * cotizacionVenta : null;
    },
    [vistaMoneda, cotizacionVenta]
  );

  const totalComisionesMes = useMemo(() => {
    let total = 0;
    for (const op of opsMesVista) {
      const v = convertirOp(op);
      if (v === null) return null;
      total += v;
    }
    return total;
  }, [opsMesVista, convertirOp]);

  const totalEgresosMes = useMemo(() => {
    let total = 0;
    for (const e of egresosMesVista) {
      if (vistaMoneda !== "CONSOLIDADO") {
        total += e.monto;
      } else if (e.moneda === "ARS") {
        total += e.monto;
      } else if (cotizacionVenta !== null) {
        total += e.monto * cotizacionVenta;
      } else {
        return null;
      }
    }
    return total;
  }, [egresosMesVista, vistaMoneda, cotizacionVenta]);

  const resultadoNeto =
    totalComisionesMes !== null && totalEgresosMes !== null
      ? totalComisionesMes - totalEgresosMes
      : null;

  const comisionPromedio =
    opsMesVista.length > 0 && totalComisionesMes !== null
      ? totalComisionesMes / opsMesVista.length
      : 0;

  // Chart data
  const ingresosPorMes = useMemo(() => {
    return groupByMes(opsVista, (op) => {
      if (vistaMoneda !== "CONSOLIDADO") return op.comisionInmob;
      if (op.moneda === "ARS") return op.comisionInmob;
      return cotizacionVenta !== null ? op.comisionInmob * cotizacionVenta : 0;
    });
  }, [opsVista, vistaMoneda, cotizacionVenta]);

  const egresosPorMes = useMemo(() => {
    return groupByMes(egresosVista, (e) => {
      if (vistaMoneda !== "CONSOLIDADO") return e.monto;
      if (e.moneda === "ARS") return e.monto;
      return cotizacionVenta !== null ? e.monto * cotizacionVenta : 0;
    });
  }, [egresosVista, vistaMoneda, cotizacionVenta]);

  const barData = useMemo(() => {
    const meses = Array.from(
      new Set([...ingresosPorMes.map((i) => i.mes), ...egresosPorMes.map((e) => e.mes)])
    );
    return meses.map((mes) => ({
      mes,
      Ingresos: ingresosPorMes.find((i) => i.mes === mes)?.valor ?? 0,
      Egresos: egresosPorMes.find((e) => e.mes === mes)?.valor ?? 0,
    }));
  }, [ingresosPorMes, egresosPorMes]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const op of opsMesVista) {
      const val =
        vistaMoneda === "CONSOLIDADO" && op.moneda === "USD" && cotizacionVenta !== null
          ? op.comisionInmob * cotizacionVenta
          : op.comisionInmob;
      if (!val) continue;
      map[op.tipo] = (map[op.tipo] ?? 0) + val;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: TIPO_LABELS[name as keyof typeof TIPO_LABELS] ?? name,
        value,
      }));
  }, [opsMesVista, vistaMoneda, cotizacionVenta]);

  const ranking = useMemo(() => {
    const map = new Map<string, { nombre: string; ops: number; total: number; personal: number }>();
    for (const op of opsMesVista) {
      const total = convertirOp(op);
      if (total === null) continue;
      const personal =
        vistaMoneda === "CONSOLIDADO" && op.moneda === "USD" && cotizacionVenta !== null
          ? op.comisionAgente * cotizacionVenta
          : op.comisionAgente;
      const e = map.get(op.agente.id) ?? { nombre: op.agente.nombre, ops: 0, total: 0, personal: 0 };
      e.ops++;
      e.total += total;
      e.personal += personal;
      map.set(op.agente.id, e);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [opsMesVista, convertirOp, vistaMoneda, cotizacionVenta]);

  const fmtVal = (v: number | null) => (v === null ? "—" : formatMonto(v, monedaDisplay));

  return (
    <div className="w-full max-w-[1000px] mx-auto space-y-6">
      {/* Tabs header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Finanzas</h1>
        <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
          {(["dashboard", "operaciones", "egresos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: tab === t ? "var(--surface)" : "transparent",
                color: tab === t ? "var(--brand-primary)" : "var(--text-muted)",
                boxShadow: tab === t ? "var(--shadow-card)" : "none",
              }}
            >
              {t === "dashboard" ? "Resumen" : t === "operaciones" ? "Operaciones" : "Egresos"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── RESUMEN ─── */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* Selector de vista moneda */}
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {([
                { key: "ARS" as VistaMoneda, label: "🇦🇷 Pesos" },
                { key: "USD" as VistaMoneda, label: "🇺🇸 Dólares" },
                { key: "CONSOLIDADO" as VistaMoneda, label: "📊 Consolidado" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setVistaMoneda(key)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                  style={{
                    background: vistaMoneda === key ? "var(--brand-primary)" : "var(--surface-raised)",
                    color: vistaMoneda === key ? "white" : "var(--text-muted)",
                    borderColor: vistaMoneda === key ? "var(--brand-primary)" : "var(--border)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {vistaMoneda === "ARS" && (
              <p className="text-xs text-text-muted">Solo muestra transacciones registradas en pesos.</p>
            )}
            {vistaMoneda === "USD" && (
              <p className="text-xs text-text-muted">Solo muestra transacciones registradas en dólares.</p>
            )}

            {vistaMoneda === "CONSOLIDADO" && (
              <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: "#D4A853/40", background: "var(--surface-raised)" }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary">
                      Conversión estimada · Dólar{" "}
                      {tipoCambio === "mep" ? "MEP" : tipoCambio.charAt(0).toUpperCase() + tipoCambio.slice(1)}
                    </p>
                    {cotizacionVenta !== null ? (
                      <p className="text-[11px] text-text-muted">
                        Cotización: {formatMonto(cotizacionVenta, "ARS")}
                        {cotizMinsAgo !== null &&
                          ` · Actualizado hace ${cotizMinsAgo === 0 ? "menos de 1 min" : `${cotizMinsAgo} min`}`}
                      </p>
                    ) : (
                      <p className="text-[11px] text-text-muted">
                        {loadingCotiz ? "Obteniendo cotización…" : "Cotización no disponible"}
                      </p>
                    )}
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Valor orientativo. No usar como dato contable oficial.
                    </p>
                  </div>
                  <button
                    onClick={fetchCotizaciones}
                    disabled={loadingCotiz}
                    className="shrink-0 text-xs text-brand-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    {loadingCotiz ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Actualizar
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {(["blue", "mep", "oficial"] as TipoCambio[]).map((tc) => (
                    <button
                      key={tc}
                      onClick={() => setTipoCambio(tc)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                      style={{
                        background: tipoCambio === tc ? "#1B4332" : "var(--surface)",
                        color: tipoCambio === tc ? "white" : "var(--text-muted)",
                        borderColor: tipoCambio === tc ? "#1B4332" : "var(--border)",
                      }}
                    >
                      {tc === "mep" ? "MEP" : tc.charAt(0).toUpperCase() + tc.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label={
                vistaMoneda === "USD"
                  ? "Comisiones USD"
                  : vistaMoneda === "CONSOLIDADO"
                  ? "Total estimado ARS"
                  : "Comisiones ARS"
              }
              value={fmtVal(totalComisionesMes)}
              sub={`${opsMesVista.length} operaciones`}
              trend="up"
              estimado={vistaMoneda === "CONSOLIDADO"}
            />
            <MetricCard
              label="Promedio por operación"
              value={totalComisionesMes !== null ? formatMonto(comisionPromedio, monedaDisplay) : "—"}
              sub="Este mes"
              estimado={vistaMoneda === "CONSOLIDADO"}
            />
            <MetricCard
              label={
                vistaMoneda === "USD"
                  ? "Egresos USD"
                  : vistaMoneda === "CONSOLIDADO"
                  ? "Egresos totales ARS"
                  : "Egresos ARS"
              }
              value={fmtVal(totalEgresosMes)}
              trend="down"
              estimado={vistaMoneda === "CONSOLIDADO"}
            />
            <MetricCard
              label={vistaMoneda === "CONSOLIDADO" ? "Neto estimado" : "Resultado neto"}
              value={fmtVal(resultadoNeto)}
              sub={
                resultadoNeto !== null
                  ? resultadoNeto >= 0
                    ? "Positivo"
                    : "Negativo"
                  : undefined
              }
              trend={resultadoNeto !== null ? (resultadoNeto >= 0 ? "up" : "down") : undefined}
              estimado={vistaMoneda === "CONSOLIDADO"}
            />
          </div>

          {/* Gráfico barras */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-text-primary mb-4">Ingresos vs Egresos (últimos 6 meses)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  tickFormatter={(v) => {
                    if (typeof v !== "number") return "";
                    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
                    return `$${v}`;
                  }}
                />
                <Tooltip formatter={(v) => (typeof v === "number" ? formatMonto(v, monedaDisplay) : "")} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Ingresos" fill={COLORES.ingresos} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Egresos" fill={COLORES.egresos} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Torta por tipo */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-text-primary mb-4">Por tipo de operación</p>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-text-muted text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) =>
                        `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => (typeof v === "number" ? formatMonto(v, monedaDisplay) : "")} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Línea de comisiones */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-text-primary mb-4">Evolución de comisiones</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={ingresosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    tickFormatter={(v) => {
                      if (typeof v !== "number") return "";
                      if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
                      return `$${v}`;
                    }}
                  />
                  <Tooltip formatter={(v) => (typeof v === "number" ? formatMonto(v, monedaDisplay) : "")} />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    name="Comisiones"
                    stroke={COLORES.linea}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORES.linea }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking de agentes */}
          {ranking.length > 0 && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-text-primary mb-4">Ranking de agentes — este mes</p>
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <div key={r.nombre} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: RANKING_COLORS[i % RANKING_COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{r.nombre}</p>
                      <p className="text-xs text-text-muted">
                        {r.ops} operaciones · Personal: {formatMonto(r.personal, monedaDisplay)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-text-primary tabular-nums">
                      {formatMonto(r.total, monedaDisplay)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operaciones recientes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-text-primary">Operaciones recientes</p>
              <button
                onClick={() => setTab("operaciones")}
                className="text-xs text-brand-primary hover:underline flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {opsVista.length === 0 ? (
              <p className="text-sm text-text-muted">
                Sin operaciones registradas{vistaMoneda !== "CONSOLIDADO" ? ` en ${vistaMoneda}` : ""}
              </p>
            ) : (
              <div className="space-y-2">
                {opsVista.slice(0, 5).map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm"
                  >
                    <div>
                      <p className="font-medium text-text-primary">{TIPO_LABELS[op.tipo]}</p>
                      <p className="text-xs text-text-muted">
                        {op.agente.nombre} · {new Date(op.fechaCierre).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-text-primary">{formatMonto(op.comisionTotal, op.moneda)}</p>
                      <p className="text-xs text-text-muted">{formatMonto(op.precioOperacion, op.moneda)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── OPERACIONES ─── */}
      {tab === "operaciones" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNuevaOp(true)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva operación
            </button>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-xs text-text-muted uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Agente</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Comis. Inmob.</th>
                    <th className="px-4 py-3 text-right">Comis. Agente</th>
                    <th className="px-4 py-3 text-center">Moneda</th>
                  </tr>
                </thead>
                <tbody>
                  {ops.map((op) => (
                    <tr
                      key={op.id}
                      onClick={() => setSelectedOp(op)}
                      className="border-b border-border last:border-0 hover:bg-surface-raised cursor-pointer"
                    >
                      <td className="px-4 py-3 text-text-muted">
                        {new Date(op.fechaCierre).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-raised text-text-secondary">
                          {TIPO_LABELS[op.tipo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-primary">{op.agente.nombre}</td>
                      <td className="px-4 py-3 text-right text-text-primary tabular-nums">
                        {formatMonto(op.precioOperacion, op.moneda)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary tabular-nums">
                        {formatMonto(op.comisionInmob, op.moneda)}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted tabular-nums">
                        {formatMonto(op.comisionAgente, op.moneda)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-raised text-text-secondary">
                          {op.moneda}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ops.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-text-muted text-sm">
                        Sin operaciones registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── EGRESOS ─── */}
      {tab === "egresos" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowNuevoEgreso(true)}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo egreso
              </button>
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-xs text-text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {egresos.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-raised">
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(e.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-text-primary">{e.concepto}</td>
                    <td className="px-4 py-3">
                      {e.categoria && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-raised text-text-muted">
                          {e.categoria}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-text-primary tabular-nums">
                      {formatMonto(e.monto, e.moneda)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <DeleteEgresoButton
                          id={e.id}
                          onDelete={() => setEgresos((p) => p.filter((x) => x.id !== e.id))}
                        />
                      </td>
                    )}
                  </tr>
                ))}
                {egresos.length === 0 && (
                  <tr>
                    <td
                      colSpan={isAdmin ? 5 : 4}
                      className="px-4 py-8 text-center text-text-muted text-sm"
                    >
                      Sin egresos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sheet de detalle de operación */}
      {selectedOp && (
        <OperacionDetailSheet op={selectedOp} onClose={() => setSelectedOp(null)} />
      )}

      {/* Modal nueva operación */}
      {showNuevaOp && (
        <NuevaOperacionModal
          agentes={agentes}
          userId={userId}
          onClose={() => setShowNuevaOp(false)}
          onCreated={(op) => {
            setOps((p) => [op, ...p]);
            setShowNuevaOp(false);
            toast.success("Operación registrada");
          }}
        />
      )}

      {/* Modal nuevo egreso */}
      {showNuevoEgreso && isAdmin && (
        <NuevoEgresoModal
          onClose={() => setShowNuevoEgreso(false)}
          onCreated={(e) => {
            setEgresos((p) => [e, ...p]);
            setShowNuevoEgreso(false);
            toast.success("Egreso registrado");
          }}
        />
      )}
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
      if (!res.ok) throw new Error();
      onDelete();
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button onClick={handle} disabled={loading} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Operación detail sheet ────────────────────────────────────────────────────

function DetailRow({
  label, value, bold, accent,
}: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-text-muted">{label}</span>
      <span
        className={`tabular-nums ${bold ? "font-semibold" : ""} ${
          accent ? "text-brand-primary" : "text-text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function OperacionDetailSheet({ op, onClose }: { op: Operacion; onClose: () => void }) {
  const comVend = op.precioOperacion * (op.comisionVendedorPct / 100);
  const comComp = op.precioOperacion * (op.comisionCompradorPct / 100);
  const neto = op.comisionInmob - op.gastos;
  const pctInmob =
    op.comisionTotal > 0 ? Math.round((op.comisionInmob / op.comisionTotal) * 100) : 70;
  const pctAgente = 100 - pctInmob;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm h-full bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="font-semibold text-text-primary">{TIPO_LABELS[op.tipo]}</p>
            <p className="text-xs text-text-muted">
              {new Date(op.fechaCierre).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {op.agente.nombre}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2">
              Operación
            </p>
            <DetailRow label="Precio" value={formatMonto(op.precioOperacion, op.moneda)} bold />
            <DetailRow
              label={`Comisión vendedor (${op.comisionVendedorPct}%)`}
              value={formatMonto(comVend, op.moneda)}
            />
            <DetailRow
              label={`Comisión comprador (${op.comisionCompradorPct}%)`}
              value={formatMonto(comComp, op.moneda)}
            />
            {op.ivaComision > 0 && (
              <DetailRow label="IVA (21%)" value={formatMonto(op.ivaComision, op.moneda)} />
            )}
            <DetailRow label="Total comisión bruta" value={formatMonto(op.comisionTotal, op.moneda)} bold />
          </div>

          <div className="border-t border-border pt-5 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2">
              Distribución
            </p>
            <DetailRow
              label={`Parte inmobiliaria (${pctInmob}%)`}
              value={formatMonto(op.comisionInmob, op.moneda)}
            />
            <DetailRow
              label={`Parte agente (${pctAgente}%)`}
              value={formatMonto(op.comisionAgente, op.moneda)}
            />
          </div>

          {op.gastos > 0 && (
            <div className="border-t border-border pt-5 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2">
                Gastos
              </p>
              <DetailRow label="Gastos asociados" value={formatMonto(op.gastos, op.moneda)} />
            </div>
          )}

          <div className="border-t border-border pt-5 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2">
              Resultado
            </p>
            <DetailRow label="Neto inmobiliaria" value={formatMonto(neto, op.moneda)} bold accent />
          </div>

          {op.notas && (
            <div className="border-t border-border pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">
                Notas
              </p>
              <p className="text-sm text-text-primary">{op.notas}</p>
            </div>
          )}

          <div className="border-t border-border pt-4 text-center">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: op.moneda === "USD" ? "#EBF5FB" : "#EAFAF1",
                color: op.moneda === "USD" ? "#2980B9" : "#2D6A4F",
              }}
            >
              {op.moneda}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Nueva operación modal ─────────────────────────────────────────────────────

function NuevaOperacionModal({
  agentes, userId, onClose, onCreated,
}: {
  agentes: { id: string; nombre: string }[];
  userId: string;
  onClose: () => void;
  onCreated: (op: Operacion) => void;
}) {
  const [form, setForm] = useState({
    tipo: "VENTA" as Operacion["tipo"],
    precioOperacion: "",
    moneda: "USD" as "ARS" | "USD",
    agenteId: userId,
    comisionVendedorPct: 3,
    comisionCompradorPct: 3,
    ivaIncluido: false,
    notas: "",
    fechaCierre: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  const precio = Number(form.precioOperacion) || 0;
  const comVend = precio * (form.comisionVendedorPct / 100);
  const comComp = precio * (form.comisionCompradorPct / 100);
  const subtotal = comVend + comComp;
  const iva = form.ivaIncluido ? subtotal * 0.21 : 0;
  const comisionTotal = subtotal + iva;
  const comisionInmob = comisionTotal * 0.7;
  const comisionAgente = comisionTotal * 0.3;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!precio) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finanzas/operaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          precioOperacion: precio,
          comisionTotal,
          comisionInmob,
          comisionAgente,
          ivaComision: iva,
          comisionVendedorPct: form.comisionVendedorPct,
          comisionCompradorPct: form.comisionCompradorPct,
          fechaCierre: form.fechaCierre,
        }),
      });
      const data = (await res.json()) as { data?: Operacion; error?: string };
      if (!res.ok) throw new Error(data.error);
      onCreated(data.data!);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  }

  const inp = "input-base w-full text-sm";
  const lbl = "block text-xs font-medium text-text-primary mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <p className="font-semibold text-text-primary">Registrar operación</p>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">
            ×
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as Operacion["tipo"] }))}
                className={inp}
              >
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
                <option value="ALQUILER_TEMPORARIO">Temporario</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) => setForm((p) => ({ ...p, moneda: e.target.value as "ARS" | "USD" }))}
                className={inp}
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Precio de la operación *</label>
            <input
              type="number"
              required
              min={0}
              value={form.precioOperacion}
              onChange={(e) => setForm((p) => ({ ...p, precioOperacion: e.target.value }))}
              className={inp}
              placeholder="100000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Comisión vendedor %</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={form.comisionVendedorPct}
                onChange={(e) => setForm((p) => ({ ...p, comisionVendedorPct: Number(e.target.value) }))}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Comisión comprador %</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={form.comisionCompradorPct}
                onChange={(e) => setForm((p) => ({ ...p, comisionCompradorPct: Number(e.target.value) }))}
                className={inp}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="iva"
              type="checkbox"
              checked={form.ivaIncluido}
              onChange={(e) => setForm((p) => ({ ...p, ivaIncluido: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="iva" className="text-xs text-text-primary cursor-pointer">
              Incluir IVA (21%)
            </label>
          </div>
          {agentes.length > 0 && (
            <div>
              <label className={lbl}>Agente</label>
              <select
                value={form.agenteId}
                onChange={(e) => setForm((p) => ({ ...p, agenteId: e.target.value }))}
                className={inp}
              >
                {agentes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={lbl}>Fecha de cierre</label>
            <input
              type="date"
              value={form.fechaCierre}
              onChange={(e) => setForm((p) => ({ ...p, fechaCierre: e.target.value }))}
              className={inp}
            />
          </div>
          {precio > 0 && (
            <div className="p-3 rounded-xl bg-surface-raised space-y-1.5 text-xs">
              <p className="font-semibold text-text-muted uppercase tracking-wide mb-2">Desglose calculado</p>
              <div className="flex justify-between">
                <span className="text-text-muted">Comisión vendedor</span>
                <span className="font-mono">{formatMonto(comVend, form.moneda)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Comisión comprador</span>
                <span className="font-mono">{formatMonto(comComp, form.moneda)}</span>
              </div>
              {form.ivaIncluido && (
                <div className="flex justify-between">
                  <span className="text-text-muted">IVA 21%</span>
                  <span className="font-mono">{formatMonto(iva, form.moneda)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-text-primary border-t border-border pt-1.5 mt-1.5">
                <span>Total comisión</span>
                <span className="font-mono">{formatMonto(comisionTotal, form.moneda)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>→ Inmobiliaria (70%)</span>
                <span className="font-mono">{formatMonto(comisionInmob, form.moneda)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>→ Agente (30%)</span>
                <span className="font-mono">{formatMonto(comisionAgente, form.moneda)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex gap-2">
          <button type="button" onClick={onClose} className="btn-outline text-sm flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !precio}
            className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Confirmar y registrar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Nuevo egreso modal ────────────────────────────────────────────────────────

function NuevoEgresoModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (e: Egreso) => void }) {
  const [form, setForm] = useState({
    concepto: "",
    monto: "",
    moneda: "ARS" as "ARS" | "USD",
    categoria: "Otro",
    fecha: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const inp = "input-base w-full text-sm";
  const lbl = "block text-xs font-medium text-text-primary mb-1";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/finanzas/egresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, monto: Number(form.monto) }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <p className="font-semibold text-text-primary">Nuevo egreso</p>
          <button type="button" onClick={onClose} className="text-text-muted text-lg leading-none">
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={lbl}>Concepto *</label>
            <input
              required
              value={form.concepto}
              onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))}
              className={inp}
              placeholder="Publicidad portal..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Monto *</label>
              <input
                type="number"
                required
                min={0}
                value={form.monto}
                onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
                className={inp}
                placeholder="0"
              />
            </div>
            <div>
              <label className={lbl}>Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) => setForm((p) => ({ ...p, moneda: e.target.value as "ARS" | "USD" }))}
                className={inp}
              >
                <option>ARS</option>
                <option>USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
              className={inp}
            >
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
              className={inp}
            />
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-2">
          <button type="button" onClick={onClose} className="btn-outline text-sm flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
