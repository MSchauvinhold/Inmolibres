"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus, Loader2, ChevronRight,
  Trash2, RefreshCw, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { formatMonto } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { AvatarInitials } from "@/components/ui/avatar-initials";

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
  adminMensual: { ARS: number; USD: number; contratos: number };
  adminContratos: {
    id: string; inquilino: string; propiedad: string;
    precioMensual: number; administracionPct: number;
    moneda: "ARS" | "USD"; diaVencimientoPago: number; fee: number;
  }[];
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

const PIE_COLORS = ["#C1694F", "#2D4A6B", "#C9A55C"];

// ─── FinKPI card ───────────────────────────────────────────────────────────────

function FinKPI({
  label, value, sub, trend, up, neutral, highlight,
}: {
  label: string; value: string; sub?: string;
  trend?: string; up?: boolean; neutral?: boolean; highlight?: boolean;
}) {
  return (
    <div
      className="il-card"
      style={{
        padding: 18,
        background: highlight ? "var(--antracita-900)" : "#fff",
        border: highlight ? "none" : undefined,
      }}
    >
      <div style={{
        fontSize: 10.5,
        color: highlight ? "var(--crema-300)" : "var(--antracita-300)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontFamily: "var(--font-jetbrains-mono, monospace)",
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: highlight ? "var(--crema-50)" : "var(--antracita-900)",
          marginTop: 8,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        flexWrap: "wrap",
        gap: 4,
      }}>
        {sub && (
          <span style={{
            fontSize: 11.5,
            color: highlight ? "var(--crema-300)" : "var(--antracita-500)",
          }}>
            {sub}
          </span>
        )}
        {trend && (
          <span style={{
            display: "inline-flex",
            gap: 3,
            alignItems: "center",
            fontSize: 11,
            fontWeight: 600,
            color: neutral
              ? (highlight ? "var(--crema-300)" : "var(--antracita-400)")
              : up
                ? (highlight ? "#9CD3A8" : "var(--success-500)")
                : "var(--danger-500)",
            background: highlight
              ? "rgba(255,255,255,0.1)"
              : neutral
                ? "var(--crema-100)"
                : (up ? "var(--success-100)" : "var(--danger-100)"),
            padding: "2px 7px",
            borderRadius: 999,
          }}>
            {neutral ? null : up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
    const dateStr = "fechaCierre" in item
      ? (item as { fechaCierre?: string }).fechaCierre
      : (item as { fecha?: string }).fecha;
    if (!dateStr) continue;
    const label = getMesLabel(dateStr);
    map.set(label, (map.get(label) ?? 0) + getVal(item));
  }
  return Array.from(map.entries()).map(([mes, valor]) => ({ mes, valor }));
}

// ─── Main component ────────────────────────────────────────────────────────────

export function FinanzasDashboard({ data, agentes, isAdmin, userId, adminMensual, adminContratos }: Props) {
  const [tab, setTab] = useState<"dashboard" | "operaciones" | "egresos">("dashboard");

  const [vistaMoneda, setVistaMoneda] = useState<VistaMoneda>("ARS");
  const [mounted, setMounted] = useState(false);
  const [tipoCambio, setTipoCambio] = useState<TipoCambio>("blue");
  const [cotizaciones, setCotizaciones] = useState<DivisaData[] | null>(null);
  const [loadingCotiz, setLoadingCotiz] = useState(false);
  const [cotizTs, setCotizTs] = useState<Date | null>(null);

  const [showNuevaOp, setShowNuevaOp] = useState(false);
  const [showNuevoEgreso, setShowNuevoEgreso] = useState(false);
  const [selectedOp, setSelectedOp] = useState<Operacion | null>(null);

  const [ops, setOps] = useState(data.operaciones);
  const [egresos, setEgresos] = useState(data.egresos);

  // Hydratar desde localStorage después del mount para evitar mismatch SSR/client
  useEffect(() => {
    const stored = localStorage.getItem("finanzas_vista") as VistaMoneda;
    if (stored && (["ARS", "USD", "CONSOLIDADO"] as VistaMoneda[]).includes(stored)) {
      setVistaMoneda(stored);
    }
    setMounted(true);
  }, []);

  // Persistir cambios (solo después del mount para no sobreescribir al inicializar)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("finanzas_vista", vistaMoneda);
    }
  }, [vistaMoneda, mounted]);

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

  const monedaDisplay: "ARS" | "USD" = vistaMoneda === "USD" ? "USD" : "ARS";

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

  // ── Mes anterior (para calcular la variación real, no hardcodeada) ──────────
  const inicioMesAnterior = useMemo(() => {
    const d = new Date(inicioMes);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [inicioMes]);

  const opsMesAnteriorVista = useMemo(
    () => opsVista.filter((o) => {
      const f = new Date(o.fechaCierre);
      return f >= inicioMesAnterior && f < inicioMes;
    }),
    [opsVista, inicioMesAnterior, inicioMes]
  );
  const egresosMesAnteriorVista = useMemo(
    () => egresosVista.filter((e) => {
      const f = new Date(e.fecha);
      return f >= inicioMesAnterior && f < inicioMes;
    }),
    [egresosVista, inicioMesAnterior, inicioMes]
  );

  const totalComisionesMesAnterior = useMemo(() => {
    let total = 0;
    for (const op of opsMesAnteriorVista) {
      const v = convertirOp(op);
      if (v === null) return null;
      total += v;
    }
    return total;
  }, [opsMesAnteriorVista, convertirOp]);

  const totalEgresosMesAnterior = useMemo(() => {
    let total = 0;
    for (const e of egresosMesAnteriorVista) {
      if (vistaMoneda !== "CONSOLIDADO") total += e.monto;
      else if (e.moneda === "ARS") total += e.monto;
      else if (cotizacionVenta !== null) total += e.monto * cotizacionVenta;
      else return null;
    }
    return total;
  }, [egresosMesAnteriorVista, vistaMoneda, cotizacionVenta]);

  const resultadoNetoAnterior =
    totalComisionesMesAnterior !== null && totalEgresosMesAnterior !== null
      ? totalComisionesMesAnterior - totalEgresosMesAnterior
      : null;

  const comisionPromedioAnterior =
    opsMesAnteriorVista.length > 0 && totalComisionesMesAnterior !== null
      ? totalComisionesMesAnterior / opsMesAnteriorVista.length
      : 0;

  // Variación % vs mes anterior. Si no hay datos → 0%. Devuelve label + signo.
  const calcTrend = useCallback(
    (actual: number | null, anterior: number | null): { label: string; up: boolean; neutral: boolean } | undefined => {
      if (actual === null || anterior === null) return undefined;
      if (anterior === 0) {
        if (actual === 0) return { label: "0%", up: true, neutral: true };
        return { label: "+100%", up: true, neutral: false };
      }
      const pct = Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
      return { label: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0, neutral: pct === 0 };
    },
    []
  );

  const trendComisiones = calcTrend(totalComisionesMes, totalComisionesMesAnterior);
  const trendPromedio   = calcTrend(comisionPromedio, comisionPromedioAnterior);
  const trendEgresos    = calcTrend(totalEgresosMes, totalEgresosMesAnterior);
  const trendNeto       = calcTrend(resultadoNeto, resultadoNetoAnterior);

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

  const yFmt = (v: unknown) => {
    if (typeof v !== "number") return "";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v}`;
  };

  // ─── Trend strings (simplified) ─────────────────────────────────────────────
  const comisionTrend = opsMesVista.length > 0 ? `${opsMesVista.length} ops.` : undefined;

  // ─── Exportar a CSV ──────────────────────────────────────────────────────────
  function exportarCSV() {
    if (ops.length === 0 && egresos.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lineas: string[] = [];

    // Operaciones
    lineas.push("OPERACIONES");
    lineas.push(["Fecha", "Tipo", "Agente", "Precio op.", "Moneda", "Comisión total", "Comisión inmob.", "Comisión agente", "IVA", "Gastos"].map(esc).join(","));
    for (const o of ops) {
      lineas.push([
        new Date(o.fechaCierre).toLocaleDateString("es-AR"),
        TIPO_LABELS[o.tipo],
        o.agente.nombre,
        o.precioOperacion, o.moneda,
        o.comisionTotal, o.comisionInmob, o.comisionAgente, o.ivaComision, o.gastos,
      ].map(esc).join(","));
    }
    lineas.push("");

    // Egresos
    lineas.push("EGRESOS");
    lineas.push(["Fecha", "Concepto", "Categoría", "Monto", "Moneda"].map(esc).join(","));
    for (const e of egresos) {
      lineas.push([
        new Date(e.fecha).toLocaleDateString("es-AR"),
        e.concepto, e.categoria ?? "", e.monto, e.moneda,
      ].map(esc).join(","));
    }

    // BOM para que Excel reconozca acentos
    const blob = new Blob(["﻿" + lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  }

  return (
    <div className="w-full max-w-[1060px] mx-auto space-y-5">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="mono" style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
            Finanzas · {new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </p>
          <h1 className="display" style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}>
            Tu inmobiliaria, en números.
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-tabs */}
          <div style={{
            display: "flex",
            background: "var(--crema-100, #F0E9DC)",
            borderRadius: 10,
            padding: 3,
            border: "1px solid var(--border)",
          }}>
            {(["dashboard", "operaciones", "egresos"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "7px 14px",
                  border: tab === t ? "1px solid var(--border)" : "1px solid transparent",
                  background: tab === t ? "#fff" : "transparent",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: tab === t ? "var(--antracita-900)" : "var(--antracita-500)",
                  cursor: "pointer",
                  boxShadow: tab === t ? "var(--shadow-sm)" : "none",
                  transition: "all 150ms",
                }}
              >
                {t === "dashboard" ? "Resumen" : t === "operaciones" ? "Operaciones" : "Egresos"}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={exportarCSV}
            className="il-btn il-btn--ghost"
            style={{ height: 36, fontSize: 13, gap: 6, color: "var(--antracita-700)" }}
            title="Descargar operaciones y egresos en CSV"
          >
            <Download size={14} />
            Exportar
          </button>

          {/* Nueva operación */}
          <button
            onClick={() => setShowNuevaOp(true)}
            className="il-btn il-btn--primary"
            style={{ height: 36, fontSize: 13, gap: 6 }}
          >
            <Plus size={14} color="#fff" />
            Nueva operación
          </button>
        </div>
      </div>

      {/* ─── RESUMEN ─── */}
      {tab === "dashboard" && (
        <div className="space-y-5">

          {/* Currency tabs */}
          <div className="flex gap-2 flex-wrap items-center">
            {([
              { key: "ARS" as VistaMoneda, label: "AR Pesos", symbol: "$" },
              { key: "USD" as VistaMoneda, label: "US Dólares", symbol: "US$" },
              { key: "CONSOLIDADO" as VistaMoneda, label: "Consolidado", symbol: "∑" },
            ]).map(({ key, label, symbol }) => (
              <button
                key={key}
                onClick={() => setVistaMoneda(key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: vistaMoneda === key ? "var(--antracita-900)" : "transparent",
                  color: vistaMoneda === key ? "var(--crema-50)" : "var(--antracita-700)",
                  border: vistaMoneda === key ? "none" : "1px solid var(--border)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{symbol}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Consolidado note — solo client-side para evitar hydration mismatch */}
          {mounted && vistaMoneda === "ARS" && (
            <p className="text-xs" style={{ color: "var(--antracita-400)", marginTop: -8 }}>
              Solo muestra transacciones registradas en pesos.
            </p>
          )}
          {mounted && vistaMoneda === "USD" && (
            <p className="text-xs" style={{ color: "var(--antracita-400)", marginTop: -8 }}>
              Solo muestra transacciones registradas en dólares.
            </p>
          )}
          {vistaMoneda === "CONSOLIDADO" && (
            <div className="il-card p-3 space-y-2" style={{ borderColor: "rgba(212,168,83,0.3)" }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} style={{ color: "var(--warning-500)", flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: "var(--antracita-900)" }}>
                    Conversión estimada · Dólar{" "}
                    {tipoCambio === "mep" ? "MEP" : tipoCambio.charAt(0).toUpperCase() + tipoCambio.slice(1)}
                  </p>
                  {cotizacionVenta !== null ? (
                    <p style={{ fontSize: 11, color: "var(--antracita-400)" }}>
                      Cotización: {formatMonto(cotizacionVenta, "ARS")}
                      {cotizMinsAgo !== null &&
                        ` · Actualizado hace ${cotizMinsAgo === 0 ? "menos de 1 min" : `${cotizMinsAgo} min`}`}
                    </p>
                  ) : (
                    <p style={{ fontSize: 11, color: "var(--antracita-400)" }}>
                      {loadingCotiz ? "Obteniendo cotización…" : "Cotización no disponible"}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: "var(--antracita-300)", marginTop: 2 }}>
                    Valor orientativo. No usar como dato contable oficial.
                  </p>
                </div>
                <button
                  onClick={fetchCotizaciones}
                  disabled={loadingCotiz}
                  className="flex items-center gap-1 text-xs disabled:opacity-50"
                  style={{ flexShrink: 0, color: "var(--terracota-600)" }}
                >
                  {loadingCotiz ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Actualizar
                </button>
              </div>
              <div className="flex gap-1.5">
                {(["blue", "mep", "oficial"] as TipoCambio[]).map((tc) => (
                  <button
                    key={tc}
                    onClick={() => setTipoCambio(tc)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      border: "1px solid",
                      background: tipoCambio === tc ? "var(--antracita-900)" : "#fff",
                      color: tipoCambio === tc ? "var(--crema-50)" : "var(--antracita-500)",
                      borderColor: tipoCambio === tc ? "var(--antracita-900)" : "var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    {tc === "mep" ? "MEP" : tc.charAt(0).toUpperCase() + tc.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FinKPI cards */}
          <div className="rg-kpis">
            <FinKPI
              label={vistaMoneda === "USD" ? "Comisiones USD" : vistaMoneda === "CONSOLIDADO" ? "Total est. ARS" : "Comisiones ARS"}
              value={fmtVal(totalComisionesMes)}
              sub={comisionTrend}
              trend={trendComisiones?.label}
              up={trendComisiones?.up}
              neutral={trendComisiones?.neutral}
            />
            <FinKPI
              label="Promedio por op."
              value={totalComisionesMes !== null ? formatMonto(comisionPromedio, monedaDisplay) : "—"}
              sub="Este mes"
              trend={trendPromedio?.label}
              up={trendPromedio?.up}
              neutral={trendPromedio?.neutral}
            />
            <FinKPI
              label={vistaMoneda === "USD" ? "Egresos USD" : vistaMoneda === "CONSOLIDADO" ? "Egresos est. ARS" : "Egresos ARS"}
              value={fmtVal(totalEgresosMes)}
              sub={`${egresosMesVista.length} conceptos`}
              trend={trendEgresos?.label}
              up={trendEgresos?.up}
              neutral={trendEgresos?.neutral}
            />
            <FinKPI
              label={vistaMoneda === "CONSOLIDADO" ? "Neto estimado" : "Resultado neto"}
              value={fmtVal(resultadoNeto)}
              sub={resultadoNeto !== null ? (resultadoNeto >= 0 ? "Positivo" : "Negativo") : undefined}
              trend={trendNeto?.label}
              up={trendNeto?.up}
              neutral={trendNeto?.neutral}
              highlight
            />
          </div>

          {/* Ingresos próximo mes — administración de alquileres */}
          {adminMensual.contratos > 0 && (() => {
            // Filtrar contratos según la vista de moneda
            const lista = vistaMoneda === "CONSOLIDADO"
              ? adminContratos
              : adminContratos.filter((c) => c.moneda === vistaMoneda);
            if (lista.length === 0) return null;

            const totalVista =
              vistaMoneda === "USD" ? adminMensual.USD
              : vistaMoneda === "ARS" ? adminMensual.ARS
              : adminMensual.ARS + (cotizacionVenta !== null ? adminMensual.USD * cotizacionVenta : 0);
            const faltaCotiz = vistaMoneda === "CONSOLIDADO" && cotizacionVenta === null && adminMensual.USD > 0;

            return (
              <div className="il-card" style={{ padding: 0, overflow: "hidden", borderColor: "rgba(212,168,83,0.35)" }}>
                {/* Header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", background: "var(--crema-50, #FBF8F2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--dorado-400, #D4A853)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <RefreshCw size={14} color="#fff" />
                    </div>
                    <div>
                      <h3 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>Ingresos del próximo mes</h3>
                      <p style={{ fontSize: 11, color: "var(--antracita-400)" }}>
                        Administración de {lista.length} alquiler{lista.length !== 1 ? "es" : ""} · ingreso estimado que ya tenés asegurado
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--dorado-700, #8a5c00)", lineHeight: 1 }}>
                      {faltaCotiz ? "—" : formatMonto(totalVista, monedaDisplay)}
                    </p>
                    <p style={{ fontSize: 10.5, color: "var(--antracita-400)", marginTop: 2 }}>estimado / mes</p>
                  </div>
                </div>
                {/* Lista de contratos */}
                <div>
                  {lista.map((c, i) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      padding: "11px 20px",
                      borderBottom: i < lista.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.propiedad}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--antracita-400)" }}>
                          {c.inquilino} · vence día {c.diaVencimientoPago}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--antracita-900)" }}>
                          {formatMonto(c.fee, c.moneda)}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--antracita-400)" }}>
                          {c.administracionPct}% de {formatMonto(c.precioMensual, c.moneda)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Bar chart + Donut */}
          <div className="rg-2col rg-2col--a">

            {/* Bar chart — Ingresos vs Egresos */}
            <div className="il-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>
                  Ingresos vs Egresos
                </h3>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--antracita-400)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "#C1694F", display: "inline-block" }} />
                    Ingresos
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "#C9A55C", display: "inline-block" }} />
                    Egresos
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--antracita-400)", marginBottom: 12 }}>Últimos 6 meses</p>
              {barData.length === 0 ? (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--antracita-300)", fontSize: 13 }}>
                  Sin datos en este período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={barData} barSize={18} barGap={4} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 10.5, fill: "var(--antracita-400)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--antracita-300)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
                      axisLine={false} tickLine={false}
                      tickFormatter={yFmt}
                    />
                    <Tooltip
                      formatter={(v) => (typeof v === "number" ? formatMonto(v, monedaDisplay) : "")}
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        fontSize: 12,
                        fontFamily: "var(--font-dm-sans, sans-serif)",
                        boxShadow: "0 4px 14px rgba(58,35,18,0.08)",
                      }}
                      cursor={{ fill: "rgba(193,105,79,0.04)" }}
                    />
                    <Bar dataKey="Ingresos" fill="#C1694F" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Egresos" fill="#C9A55C" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Donut — por tipo */}
            <div className="il-card" style={{ padding: 20 }}>
              <h3 className="display" style={{ fontSize: 17, margin: "0 0 4px", color: "var(--antracita-900)" }}>
                Por tipo de operación
              </h3>
              <p style={{ fontSize: 11, color: "var(--antracita-400)", marginBottom: 14 }}>
                Distribución de comisiones
              </p>
              {pieData.length === 0 ? (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--antracita-300)", fontSize: 13 }}>
                  Sin operaciones este mes
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => (typeof v === "number" ? formatMonto(v, monedaDisplay) : "")} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                    {pieData.map((item, i) => {
                      const total = pieData.reduce((s, d) => s + d.value, 0);
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "var(--crema-100, #F0E9DC)", borderRadius: 8 }}>
                          <span style={{ display: "inline-flex", gap: 7, alignItems: "center", fontSize: 11.5, color: "var(--antracita-700)" }}>
                            <span style={{ width: 9, height: 9, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            {item.name}
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--antracita-900)" }}>{pct}%</span>
                            <span className="mono" style={{ fontSize: 10, color: "var(--antracita-400)" }}>{formatMonto(item.value, monedaDisplay)}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evolution line + Ranking */}
          <div className="rg-2col rg-2col--b">

            {/* Evolución de comisiones */}
            <div className="il-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 }}>
                <div>
                  <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>
                    Evolución de comisiones
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--antracita-400)", marginTop: 2 }}>Últimos meses</p>
                </div>
                {ingresosPorMes.length > 1 && (
                  <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--terracota-500)" }}>
                    {fmtVal(ingresosPorMes[ingresosPorMes.length - 1]?.valor ?? null)}
                  </span>
                )}
              </div>
              {ingresosPorMes.length === 0 ? (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--antracita-300)", fontSize: 13 }}>
                  Sin datos
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={195}>
                  <AreaChart data={ingresosPorMes} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradComisiones" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C1694F" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#C1694F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 10, fill: "var(--antracita-300)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--antracita-300)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
                      axisLine={false} tickLine={false}
                      tickFormatter={yFmt}
                    />
                    <Tooltip
                      formatter={(v) => (typeof v === "number" ? formatMonto(v, monedaDisplay) : "")}
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        fontSize: 12,
                        boxShadow: "0 4px 14px rgba(58,35,18,0.08)",
                      }}
                      cursor={{ stroke: "rgba(193,105,79,0.2)", strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      name="Comisiones"
                      stroke="#C1694F"
                      strokeWidth={2.5}
                      fill="url(#gradComisiones)"
                      dot={{ r: 3.5, fill: "#fff", stroke: "#C1694F", strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: "#C1694F" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Ranking de agentes */}
            <div className="il-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>
                  Ranking de agentes
                </h3>
                <span style={{ fontSize: 11, color: "var(--antracita-400)" }}>
                  {new Date().toLocaleDateString("es-AR", { month: "short" })}
                </span>
              </div>
              {ranking.length === 0 ? (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--antracita-300)", fontSize: 13 }}>
                  Sin operaciones este mes
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {ranking.map((r, i) => (
                    <div key={r.nombre}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 5 }}>
                        <AvatarInitials
                          name={r.nombre}
                          size={28}
                          bg={i === 0 ? "var(--terracota-500)" : "var(--antracita-700)"}
                        />
                        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "var(--antracita-900)" }}>
                          {r.nombre}
                        </span>
                        <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--antracita-900)" }}>
                          {formatMonto(r.total, monedaDisplay)}
                        </span>
                      </div>
                      <div style={{ marginLeft: 38, display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, height: 4, background: "var(--crema-200, #ECE4D6)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{
                            width: `${ranking[0].total > 0 ? Math.round((r.total / ranking[0].total) * 100) : 0}%`,
                            height: "100%",
                            background: i === 0 ? "var(--terracota-500)" : "var(--antracita-300)",
                            borderRadius: 999,
                            transition: "width 400ms ease",
                          }} />
                        </div>
                        <span style={{ fontSize: 10.5, color: "var(--antracita-300)" }}>{r.ops} op.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Últimas operaciones */}
          <div className="il-card" style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>
                Últimas operaciones cerradas
              </h3>
              <button
                onClick={() => setTab("operaciones")}
                style={{ fontSize: 12, color: "var(--terracota-600)", textDecoration: "none", fontWeight: 500, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
              >
                Ver todas <ChevronRight size={13} />
              </button>
            </div>
            {opsVista.length === 0 ? (
              <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--antracita-300)", fontSize: 13 }}>
                Sin operaciones registradas{vistaMoneda !== "CONSOLIDADO" ? ` en ${vistaMoneda}` : ""}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--crema-100, #F0E9DC)" }}>
                      {["Fecha", "Tipo", "Agente", "Precio op.", "Comisión", "Moneda"].map((h, idx) => (
                        <th key={h} style={{
                          textAlign: idx > 2 ? "right" : "left",
                          padding: "10px 20px",
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
                    {opsVista.slice(0, 5).map((op, i) => (
                      <tr
                        key={op.id}
                        onClick={() => setSelectedOp(op)}
                        style={{
                          borderBottom: i < Math.min(opsVista.length, 5) - 1 ? "1px solid var(--border)" : "none",
                          cursor: "pointer",
                          transition: "background 150ms",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--crema-50, #FBF8F2)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <td className="mono" style={{ padding: "12px 20px", color: "var(--antracita-500)", fontSize: 12.5 }}>
                          {new Date(op.fechaCierre).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <Pill
                            tone={op.tipo === "VENTA" ? "terra" : op.tipo === "ALQUILER" ? "dark" : "accent"}
                            style={{ fontSize: 10.5 }}
                          >
                            {TIPO_LABELS[op.tipo]}
                          </Pill>
                        </td>
                        <td style={{ padding: "12px 20px", color: "var(--antracita-700)" }}>{op.agente.nombre}</td>
                        <td className="mono" style={{ padding: "12px 20px", textAlign: "right", color: "var(--antracita-700)" }}>
                          {formatMonto(op.precioOperacion, op.moneda)}
                        </td>
                        <td className="mono" style={{ padding: "12px 20px", textAlign: "right", color: "var(--terracota-600)", fontWeight: 600 }}>
                          {formatMonto(op.comisionInmob, op.moneda)}
                        </td>
                        <td style={{ padding: "12px 20px", textAlign: "right" }}>
                          <Pill tone="outline" style={{ fontSize: 10.5 }}>{op.moneda}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              className="il-btn il-btn--primary"
              style={{ height: 38, fontSize: 13, gap: 6 }}
            >
              <Plus size={14} color="#fff" /> Nueva operación
            </button>
          </div>
          <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--crema-100, #F0E9DC)" }}>
                    {["Fecha", "Tipo", "Agente", "Precio op.", "Comis. Inmob.", "Comis. Agente", "Moneda"].map((h, idx) => (
                      <th key={h} style={{
                        textAlign: idx > 2 ? "right" : "left",
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
                  {ops.map((op, i) => (
                    <tr
                      key={op.id}
                      onClick={() => setSelectedOp(op)}
                      style={{
                        borderBottom: i < ops.length - 1 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                        transition: "background 150ms",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--crema-50, #FBF8F2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <td className="mono" style={{ padding: "12px 20px", color: "var(--antracita-400)", fontSize: 12.5 }}>
                        {new Date(op.fechaCierre).toLocaleDateString("es-AR")}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <Pill
                          tone={op.tipo === "VENTA" ? "terra" : op.tipo === "ALQUILER" ? "dark" : "accent"}
                          style={{ fontSize: 10.5 }}
                        >
                          {TIPO_LABELS[op.tipo]}
                        </Pill>
                      </td>
                      <td style={{ padding: "12px 20px", color: "var(--antracita-700)" }}>{op.agente.nombre}</td>
                      <td className="mono" style={{ padding: "12px 20px", textAlign: "right", color: "var(--antracita-700)" }}>
                        {formatMonto(op.precioOperacion, op.moneda)}
                      </td>
                      <td className="mono" style={{ padding: "12px 20px", textAlign: "right", color: "var(--terracota-600)", fontWeight: 600 }}>
                        {formatMonto(op.comisionInmob, op.moneda)}
                      </td>
                      <td className="mono" style={{ padding: "12px 20px", textAlign: "right", color: "var(--antracita-400)" }}>
                        {formatMonto(op.comisionAgente, op.moneda)}
                      </td>
                      <td style={{ padding: "12px 20px", textAlign: "right" }}>
                        <Pill tone="outline" style={{ fontSize: 10.5 }}>{op.moneda}</Pill>
                      </td>
                    </tr>
                  ))}
                  {ops.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "32px 20px", textAlign: "center", color: "var(--antracita-300)", fontSize: 13 }}>
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
                className="il-btn il-btn--primary"
                style={{ height: 38, fontSize: 13, gap: 6 }}
              >
                <Plus size={14} color="#fff" /> Nuevo egreso
              </button>
            </div>
          )}
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
                        {new Date(e.fecha).toLocaleDateString("es-AR")}
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
                        style={{ padding: "32px 20px", textAlign: "center", color: "var(--antracita-300)", fontSize: 13 }}
                      >
                        Sin egresos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
    <button
      onClick={handle}
      disabled={loading}
      style={{ padding: "4px 6px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--danger-400, #D05A4E)" }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}

// ─── Operación detail sheet ────────────────────────────────────────────────────

function DetailRow({ label, value, bold, accent }: {
  label: string; value: string; bold?: boolean; accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13 }}>
      <span style={{ color: "var(--antracita-400)" }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-jetbrains-mono, monospace)",
        fontWeight: bold ? 600 : 400,
        color: accent ? "var(--terracota-600)" : "var(--antracita-900)",
      }}>
        {value}
      </span>
    </div>
  );
}

function OperacionDetailSheet({ op, onClose }: { op: Operacion; onClose: () => void }) {
  const comVend = op.precioOperacion * (op.comisionVendedorPct / 100);
  const comComp = op.precioOperacion * (op.comisionCompradorPct / 100);
  const neto = op.comisionInmob - op.gastos;
  const pctInmob = op.comisionTotal > 0 ? Math.round((op.comisionInmob / op.comisionTotal) * 100) : 70;
  const pctAgente = 100 - pctInmob;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.28)" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 360, height: "100%", background: "#fff", boxShadow: "var(--shadow)", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <p style={{ fontWeight: 600, color: "var(--antracita-900)", margin: 0 }}>{TIPO_LABELS[op.tipo]}</p>
            <p style={{ fontSize: 12, color: "var(--antracita-400)", margin: "2px 0 0" }}>
              {new Date(op.fechaCierre).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })} · {op.agente.nombre}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, color: "var(--antracita-400)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-300)", marginBottom: 4 }}>Operación</p>
            <DetailRow label="Precio" value={formatMonto(op.precioOperacion, op.moneda)} bold />
            <DetailRow label={`Comisión vendedor (${op.comisionVendedorPct}%)`} value={formatMonto(comVend, op.moneda)} />
            <DetailRow label={`Comisión comprador (${op.comisionCompradorPct}%)`} value={formatMonto(comComp, op.moneda)} />
            {op.ivaComision > 0 && <DetailRow label="IVA (21%)" value={formatMonto(op.ivaComision, op.moneda)} />}
            <DetailRow label="Total comisión bruta" value={formatMonto(op.comisionTotal, op.moneda)} bold />
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-300)", marginBottom: 4 }}>Distribución</p>
            <DetailRow label={`Parte inmobiliaria (${pctInmob}%)`} value={formatMonto(op.comisionInmob, op.moneda)} />
            <DetailRow label={`Parte agente (${pctAgente}%)`} value={formatMonto(op.comisionAgente, op.moneda)} />
          </div>

          {op.gastos > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-300)", marginBottom: 4 }}>Gastos</p>
              <DetailRow label="Gastos asociados" value={formatMonto(op.gastos, op.moneda)} />
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-300)", marginBottom: 4 }}>Resultado</p>
            <DetailRow label="Neto inmobiliaria" value={formatMonto(neto, op.moneda)} bold accent />
          </div>

          {op.notas && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-300)", marginBottom: 4 }}>Notas</p>
              <p style={{ fontSize: 13, color: "var(--antracita-700)" }}>{op.notas}</p>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, textAlign: "center" }}>
            <Pill tone={op.moneda === "USD" ? "info" : "success"} style={{ fontSize: 11 }}>
              {op.moneda}
            </Pill>
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
  const [splitAgentePct, setSplitAgentePct] = useState(30); // % que va al agente

  // Cargar split desde configuración de la inmobiliaria
  useEffect(() => {
    fetch("/api/configuracion")
      .then((r) => r.json())
      .then((cfg) => {
        if (typeof cfg?.comisionAgentePct === "number") {
          setSplitAgentePct(cfg.comisionAgentePct);
        }
      })
      .catch(() => {/* mantener default 30% */});
  }, []);

  const precio = Number(form.precioOperacion) || 0;
  const comVend = precio * (form.comisionVendedorPct / 100);
  const comComp = precio * (form.comisionCompradorPct / 100);
  const subtotal = comVend + comComp;
  const iva = form.ivaIncluido ? subtotal * 0.21 : 0;
  const comisionTotal = subtotal + iva;
  const comisionAgente = comisionTotal * (splitAgentePct / 100);
  const comisionInmob = comisionTotal - comisionAgente;

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
  const lbl = "block text-xs font-medium mb-1" as string;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.36)", padding: 16 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 18, boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontWeight: 600, color: "var(--antracita-900)", margin: 0 }}>Registrar operación</p>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--antracita-400)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxHeight: "68vh", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className={lbl} style={{ color: "var(--antracita-700)" }}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as Operacion["tipo"] }))} className={inp}>
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
                <option value="ALQUILER_TEMPORARIO">Temporario</option>
              </select>
            </div>
            <div>
              <label className={lbl} style={{ color: "var(--antracita-700)" }}>Moneda</label>
              <select value={form.moneda} onChange={(e) => setForm((p) => ({ ...p, moneda: e.target.value as "ARS" | "USD" }))} className={inp}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl} style={{ color: "var(--antracita-700)" }}>Precio de la operación *</label>
            <input type="number" required min={0} value={form.precioOperacion} onChange={(e) => setForm((p) => ({ ...p, precioOperacion: e.target.value }))} className={inp} placeholder="100000" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className={lbl} style={{ color: "var(--antracita-700)" }}>Comisión vendedor %</label>
              <input type="number" min={0} max={10} step={0.5} value={form.comisionVendedorPct} onChange={(e) => setForm((p) => ({ ...p, comisionVendedorPct: Number(e.target.value) }))} className={inp} />
            </div>
            <div>
              <label className={lbl} style={{ color: "var(--antracita-700)" }}>Comisión comprador %</label>
              <input type="number" min={0} max={10} step={0.5} value={form.comisionCompradorPct} onChange={(e) => setForm((p) => ({ ...p, comisionCompradorPct: Number(e.target.value) }))} className={inp} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input id="iva" type="checkbox" checked={form.ivaIncluido} onChange={(e) => setForm((p) => ({ ...p, ivaIncluido: e.target.checked }))} />
            <label htmlFor="iva" style={{ fontSize: 12.5, color: "var(--antracita-700)", cursor: "pointer" }}>Incluir IVA (21%)</label>
          </div>
          {agentes.length > 0 && (
            <div>
              <label className={lbl} style={{ color: "var(--antracita-700)" }}>Agente</label>
              <select value={form.agenteId} onChange={(e) => setForm((p) => ({ ...p, agenteId: e.target.value }))} className={inp}>
                {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={lbl} style={{ color: "var(--antracita-700)" }}>Fecha de cierre</label>
            <input type="date" value={form.fechaCierre} onChange={(e) => setForm((p) => ({ ...p, fechaCierre: e.target.value }))} className={inp} />
          </div>
          {precio > 0 && (
            <div style={{ padding: 12, borderRadius: 10, background: "var(--crema-100, #F0E9DC)", display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-300)", marginBottom: 4 }}>Desglose calculado</p>
              {[
                ["Comisión vendedor", formatMonto(comVend, form.moneda)],
                ["Comisión comprador", formatMonto(comComp, form.moneda)],
                ...(form.ivaIncluido ? [["IVA 21%", formatMonto(iva, form.moneda)]] : []),
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--antracita-400)" }}>{l}</span>
                  <span className="mono">{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--antracita-900)", borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 2 }}>
                <span>Total comisión</span>
                <span className="mono">{formatMonto(comisionTotal, form.moneda)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--antracita-400)" }}>
                <span>→ Inmobiliaria (70%)</span>
                <span className="mono">{formatMonto(comisionInmob, form.moneda)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--antracita-400)" }}>
                <span>→ Agente (30%)</span>
                <span className="mono">{formatMonto(comisionAgente, form.moneda)}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} className="il-btn il-btn--ghost" style={{ flex: 1, justifyContent: "center", height: 40, fontSize: 13 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || !precio} className="il-btn il-btn--primary" style={{ flex: 1, justifyContent: "center", height: 40, fontSize: 13, opacity: (!precio || saving) ? 0.6 : 1 }}>
            {saving && <Loader2 size={13} className="animate-spin" />}
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
  const lbl = "block text-xs font-medium mb-1" as string;

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
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.36)", padding: 16 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 18, boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontWeight: 600, color: "var(--antracita-900)", margin: 0 }}>Nuevo egreso</p>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--antracita-400)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className={lbl} style={{ color: "var(--antracita-700)" }}>Concepto *</label>
            <input required value={form.concepto} onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))} className={inp} placeholder="Publicidad portal..." />
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
