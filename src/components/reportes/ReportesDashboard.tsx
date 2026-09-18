"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Home, Users, CalendarCheck, Trophy, Download } from "lucide-react";
import {
  formatMonto,
  TIPO_PROPIEDAD_LABELS,
  ESTADO_PROPIEDAD_LABELS,
  ESTADO_PIPELINE_LABELS,
  ORIGEN_LEAD_LABELS,
  ESTADO_VISITA_LABELS,
} from "@/lib/utils";
import { downloadCsv } from "@/lib/csv-export";
import type {
  TipoPropiedad, EstadoPropiedad, EstadoPipeline, OrigenLead,
  TipoOperacionFinanciera, Moneda,
} from "@prisma/client";

interface OperacionSerializada {
  id: string;
  tipo: TipoOperacionFinanciera;
  moneda: Moneda;
  precioOperacion: number;
  comisionTotal: number;
  comisionInmob: number;
  comisionAgente: number;
  fechaCierre: string;
  agenteId: string;
  agenteNombre: string;
}

interface Props {
  operaciones: OperacionSerializada[];
  propiedadesPorTipo: { tipo: TipoPropiedad; count: number }[];
  propiedadesPorEstado: { estado: EstadoPropiedad; count: number }[];
  clientesPorPipeline: { estado: EstadoPipeline; count: number }[];
  clientesPorOrigen: { origen: OrigenLead; count: number }[];
  visitasPorEstado: { estado: "PENDIENTE" | "REALIZADA" | "CANCELADA"; count: number }[];
  agentes: { id: string; nombre: string }[];
}

const COLORS = ["#C1694F", "#2D4A6B", "#C9A55C", "#4A7C59", "#8C3D27", "#6F665C"];

type PorMoneda = Record<Moneda, number>;

/**
 * Montos de distintas monedas nunca se suman ni se elige uno: se muestran por separado
 * (USD primero), igual que "Volumen operado". Antes la comisión mostraba solo USD si
 * había alguno y descartaba lo cobrado en pesos.
 */
function partesPorMoneda(m: PorMoneda): string[] {
  const partes: string[] = [];
  if (m.USD > 0) partes.push(formatMonto(m.USD, "USD"));
  if (m.ARS > 0) partes.push(formatMonto(m.ARS, "ARS"));
  return partes.length > 0 ? partes : [formatMonto(0, "ARS")];
}

function KPI({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | string[]; sub?: string }) {
  return (
    <div className="il-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: "rgba(193,105,79,0.1)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon style={{ width: 14, height: 14, color: "var(--terracota-500)" }} />
        </span>
      </div>
      <div>
        {/* Varios valores (uno por moneda) van en líneas separadas: en una sola no entran en la card */}
        {(Array.isArray(value) ? value : [value]).map((v, i) => (
          <p key={i} style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 22, fontWeight: 600, color: "var(--antracita-900)", lineHeight: 1, marginTop: i > 0 ? 6 : 0 }}>
            {v}
          </p>
        ))}
        <p style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--antracita-300)", marginTop: 6, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          {label}
        </p>
        {sub && <p style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="il-card p-5">
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--antracita-900)", marginBottom: 16, fontFamily: "var(--font-fraunces-display), Georgia, serif" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function MiniPie({ data }: { data: { label: string; value: number }[] }) {
  if (data.every((d) => d.value === 0)) {
    return <p style={{ fontSize: 12.5, color: "var(--antracita-400)", textAlign: "center", padding: "20px 0" }}>Sin datos</p>;
  }
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={110} height={110}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={30} outerRadius={50} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between gap-2" style={{ fontSize: 12.5 }}>
            <span className="flex items-center gap-1.5" style={{ color: "var(--antracita-700)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: COLORS[i % COLORS.length], display: "inline-block" }} />
              {d.label}
            </span>
            <span style={{ fontWeight: 600, color: "var(--antracita-900)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportesDashboard({
  operaciones, propiedadesPorTipo, propiedadesPorEstado,
  clientesPorPipeline, clientesPorOrigen, visitasPorEstado, agentes,
}: Props) {
  const [agenteFiltro, setAgenteFiltro] = useState<string>("TODOS");

  const operacionesFiltradas = useMemo(
    () => agenteFiltro === "TODOS" ? operaciones : operaciones.filter((o) => o.agenteId === agenteFiltro),
    [operaciones, agenteFiltro]
  );

  // Comisión total por moneda
  const comisionPorMoneda = useMemo(() => {
    const acc: PorMoneda = { ARS: 0, USD: 0 };
    for (const o of operacionesFiltradas) acc[o.moneda] += o.comisionInmob;
    return acc;
  }, [operacionesFiltradas]);

  // Volumen operado por moneda
  const volumenPorMoneda = useMemo(() => {
    const acc: PorMoneda = { ARS: 0, USD: 0 };
    for (const o of operacionesFiltradas) acc[o.moneda] += o.precioOperacion;
    return acc;
  }, [operacionesFiltradas]);

  // Serie mensual de operaciones cerradas
  const serieMensual = useMemo(() => {
    const map = new Map<string, { mes: string; ventas: number; alquileres: number }>();
    for (const o of operacionesFiltradas) {
      const d = new Date(o.fechaCierre);
      const key = d.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" });
      if (!map.has(key)) map.set(key, { mes: key, ventas: 0, alquileres: 0 });
      const row = map.get(key)!;
      if (o.tipo === "VENTA") row.ventas++;
      else row.alquileres++;
    }
    return Array.from(map.values());
  }, [operacionesFiltradas]);

  // Ranking de agentes por comisión generada
  const rankingAgentes = useMemo(() => {
    const map = new Map<string, { nombre: string; operaciones: number; comision: PorMoneda }>();
    for (const o of operaciones) {
      if (!map.has(o.agenteId)) map.set(o.agenteId, { nombre: o.agenteNombre, operaciones: 0, comision: { ARS: 0, USD: 0 } });
      const row = map.get(o.agenteId)!;
      row.operaciones++;
      row.comision[o.moneda] += o.comisionAgente;
    }
    return Array.from(map.values()).sort((a, b) => b.operaciones - a.operaciones);
  }, [operaciones]);

  const totalPropiedades = propiedadesPorTipo.reduce((s, p) => s + p.count, 0);
  const totalClientes = clientesPorPipeline.reduce((s, c) => s + c.count, 0);
  const totalVisitas = visitasPorEstado.reduce((s, v) => s + v.count, 0);

  function exportarCSV() {
    downloadCsv(`reportes_${new Date().toISOString().slice(0, 10)}.csv`, [
      {
        titulo: "OPERACIONES CERRADAS",
        columnas: ["Fecha", "Tipo", "Agente", "Precio op.", "Moneda", "Comisión inmob.", "Comisión agente"],
        filas: operacionesFiltradas.map((o) => [
          new Date(o.fechaCierre).toLocaleDateString("es-AR", { timeZone: "UTC" }),
          o.tipo === "VENTA" ? "Venta" : "Alquiler",
          o.agenteNombre,
          o.precioOperacion, o.moneda, o.comisionInmob, o.comisionAgente,
        ]),
      },
      {
        titulo: "RANKING DE AGENTES",
        columnas: ["Agente", "Operaciones", "Comisión ARS", "Comisión USD"],
        filas: rankingAgentes.map((a) => [a.nombre, a.operaciones, a.comision.ARS, a.comision.USD]),
      },
      {
        titulo: "PROPIEDADES POR TIPO",
        columnas: ["Tipo", "Cantidad"],
        filas: propiedadesPorTipo.map((p) => [TIPO_PROPIEDAD_LABELS[p.tipo], p.count]),
      },
      {
        titulo: "PROPIEDADES POR ESTADO",
        columnas: ["Estado", "Cantidad"],
        filas: propiedadesPorEstado.map((p) => [ESTADO_PROPIEDAD_LABELS[p.estado], p.count]),
      },
      {
        titulo: "PROSPECTOS POR ETAPA",
        columnas: ["Etapa", "Cantidad"],
        filas: clientesPorPipeline.map((c) => [ESTADO_PIPELINE_LABELS[c.estado], c.count]),
      },
      {
        titulo: "PROSPECTOS POR ORIGEN",
        columnas: ["Origen", "Cantidad"],
        filas: clientesPorOrigen.map((c) => [ORIGEN_LEAD_LABELS[c.origen], c.count]),
      },
      {
        titulo: "VISITAS POR ESTADO",
        columnas: ["Estado", "Cantidad"],
        filas: visitasPorEstado.map((v) => [ESTADO_VISITA_LABELS[v.estado], v.count]),
      },
    ]);
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="mono" style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
            Módulo · Finanzas
          </p>
          <h1 className="display" style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}>
            Reportes
          </h1>
          <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
            Últimos 6 meses de actividad de la inmobiliaria
          </p>
        </div>

        <div className="flex items-center gap-2">
          {agentes.length > 0 && (
            <select
              value={agenteFiltro}
              onChange={(e) => setAgenteFiltro(e.target.value)}
              className="input-base text-sm"
            >
              <option value="TODOS">Todos los agentes</option>
              {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          )}
          <button onClick={exportarCSV} className="il-btn il-btn--ghost" style={{ height: 36, fontSize: 13, gap: 6 }}>
            <Download size={14} />
            Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI icon={TrendingUp} label="Comisión (6m)" value={partesPorMoneda(comisionPorMoneda)} sub={`${operacionesFiltradas.length} operaciones cerradas`} />
        <KPI icon={Home} label="Propiedades" value={String(totalPropiedades)} sub="en inventario" />
        <KPI icon={Users} label="Prospectos" value={String(totalClientes)} sub="en el pipeline" />
        <KPI icon={CalendarCheck} label="Visitas" value={String(totalVisitas)} sub="registradas" />
      </div>

      {/* Serie mensual de cierres */}
      <SectionCard title="Operaciones cerradas por mes">
        {serieMensual.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--antracita-400)", textAlign: "center", padding: "24px 0" }}>
            Todavía no hay operaciones cerradas registradas en Finanzas.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serieMensual} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barSize={16} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--border, #E8DFD0)" strokeDasharray="2 4" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--antracita-500)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--antracita-300)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="ventas" name="Ventas" fill="#C1694F" radius={[3, 3, 0, 0]} />
              <Bar dataKey="alquileres" name="Alquileres" fill="#2D4A6B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {(volumenPorMoneda.ARS > 0 || volumenPorMoneda.USD > 0) && (
          <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--antracita-500)" }}>
              Volumen operado:{" "}
              <strong style={{ color: "var(--antracita-900)" }}>{partesPorMoneda(volumenPorMoneda).join(" · ")}</strong>
            </p>
          </div>
        )}
      </SectionCard>

      {/* Ranking de agentes */}
      {rankingAgentes.length > 0 && (
        <SectionCard title="Ranking de agentes (todas las operaciones)">
          <div className="space-y-2">
            {rankingAgentes.map((a, i) => (
              <div key={a.nombre} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: i < rankingAgentes.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 22, height: 22, borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: i === 0 ? "var(--dorado-500, #C9A55C)" : "var(--crema-200)",
                      color: i === 0 ? "#fff" : "var(--antracita-500)",
                    }}
                  >
                    {i === 0 ? <Trophy style={{ width: 11, height: 11 }} /> : i + 1}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)" }} className="truncate">
                    {a.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span style={{ fontSize: 12, color: "var(--antracita-400)" }}>{a.operaciones} op.</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--terracota-600)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                    {partesPorMoneda(a.comision).join(" · ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Grid de distribuciones */}
      <div className="grid sm:grid-cols-2 gap-6">
        <SectionCard title="Propiedades por tipo">
          <MiniPie data={propiedadesPorTipo.map((p) => ({ label: TIPO_PROPIEDAD_LABELS[p.tipo], value: p.count }))} />
        </SectionCard>

        <SectionCard title="Propiedades por estado">
          <MiniPie data={propiedadesPorEstado.map((p) => ({ label: ESTADO_PROPIEDAD_LABELS[p.estado], value: p.count }))} />
        </SectionCard>

        <SectionCard title="Prospectos por etapa del pipeline">
          <MiniPie data={clientesPorPipeline.map((c) => ({ label: ESTADO_PIPELINE_LABELS[c.estado], value: c.count }))} />
        </SectionCard>

        <SectionCard title="Prospectos por origen">
          <MiniPie data={clientesPorOrigen.map((c) => ({ label: ORIGEN_LEAD_LABELS[c.origen], value: c.count }))} />
        </SectionCard>
      </div>

      <SectionCard title="Visitas por estado">
        <MiniPie data={visitasPorEstado.map((v) => ({ label: ESTADO_VISITA_LABELS[v.estado], value: v.count }))} />
      </SectionCard>
    </div>
  );
}
