"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DollarSign, FileSignature, TrendingUp, ArrowLeftRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CalculadoraComisiones } from "@/components/calculadoras/CalculadoraComisiones";
import { CalculadoraEscrituracion } from "@/components/calculadoras/CalculadoraEscrituracion";
import { CalculadoraICL } from "@/components/calculadoras/CalculadoraICL";
import { CalculadoraDivisas } from "@/components/calculadoras/CalculadoraDivisas";

type CalcId = "comisiones" | "escrituracion" | "icl" | "divisas";

interface Calc {
  id: CalcId;
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  color: string;
}

const CALCULADORAS: Calc[] = [
  {
    id: "comisiones",
    icon: DollarSign,
    titulo: "Comisiones",
    descripcion: "Calculá tu comisión por venta o alquiler al instante. Con desglose por parte y IVA opcional.",
    color: "#1B4332",
  },
  {
    id: "escrituracion",
    icon: FileSignature,
    titulo: "Escrituración",
    descripcion: "Estimá los gastos de cierre para tu cliente. Sellos, escribano, ITI y comisión desglosados.",
    color: "#2D6A4F",
  },
  {
    id: "icl",
    icon: TrendingUp,
    titulo: "Ajuste ICL",
    descripcion: "Calculá el nuevo valor del alquiler según el Índice para Contratos de Locación del BCRA.",
    color: "#D4A853",
  },
  {
    id: "divisas",
    icon: ArrowLeftRight,
    titulo: "Conversor de divisas",
    descripcion: "USD ↔ ARS con cotización en tiempo real. Blue, oficial, MEP y mayorista.",
    color: "#2980B9",
  },
];

const COMPONENTES: Record<CalcId, React.ComponentType> = {
  comisiones: CalculadoraComisiones,
  escrituracion: CalculadoraEscrituracion,
  icl: CalculadoraICL,
  divisas: CalculadoraDivisas,
};

const TERRA = "#C0624F";
const TERRA_BG = "#FDF1EE";

export function CalculadorasPanel() {
  const [activa, setActiva] = useState<CalcId>("comisiones");
  const calc = CALCULADORAS.find((c) => c.id === activa)!;
  const Componente = COMPONENTES[activa];

  return (
    <>
      {/* ── DESKTOP: split panel ── */}
      <div
        className="hidden md:grid"
        style={{ gridTemplateColumns: "380px 1fr", height: "calc(100vh - 196px)", minHeight: "520px" }}
      >
        {/* Left: calculator list */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-4 py-0.5">
          {CALCULADORAS.map(({ id, icon: Icon, titulo, descripcion, color }) => {
            const isActive = activa === id;
            return (
              <button
                key={id}
                onClick={() => setActiva(id)}
                className="w-full text-left rounded-xl border transition-all duration-200 p-4 flex items-start gap-3"
                style={{
                  borderColor: isActive ? TERRA : "var(--border)",
                  background: isActive ? TERRA_BG : "var(--surface)",
                  boxShadow: isActive ? `inset 3px 0 0 ${TERRA}` : "none",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: isActive ? TERRA : "var(--text-primary)" }}>
                    {titulo}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {descripcion}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: active calculator */}
        <div
          className="overflow-y-auto"
          style={{ borderLeft: "1px solid #DDD5C8", background: "var(--surface)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activa}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="p-6"
            >
              <div className="mb-5">
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  {calc.titulo}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {calc.descripcion}
                </p>
              </div>
              <Componente />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── MOBILE: tabs ── */}
      <div className="md:hidden flex flex-col gap-4">
        <div
          className="flex overflow-x-auto gap-1 p-1 rounded-xl border"
          style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}
        >
          {CALCULADORAS.map(({ id, icon: Icon, titulo }) => {
            const isActive = activa === id;
            return (
              <button
                key={id}
                onClick={() => setActiva(id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  background: isActive ? "var(--surface)" : "transparent",
                  color: isActive ? TERRA : "var(--text-muted)",
                  boxShadow: isActive ? "var(--shadow-card)" : "none",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {titulo}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activa}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="card p-5"
          >
            <Componente />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
