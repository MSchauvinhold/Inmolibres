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
    color: "var(--terracota-600, #A0553D)",
  },
  {
    id: "escrituracion",
    icon: FileSignature,
    titulo: "Escrituración",
    descripcion: "Estimá los gastos de cierre para tu cliente. Sellos, escribano, ITI y comisión desglosados.",
    color: "var(--antracita-700, #4A443E)",
  },
  {
    id: "icl",
    icon: TrendingUp,
    titulo: "Ajuste ICL / IPC",
    descripcion: "Calculá el nuevo valor del alquiler según el ICL (BCRA) o el IPC (INDEC). Compará ambos índices.",
    color: "var(--dorado-500, #C9A55C)",
  },
  {
    id: "divisas",
    icon: ArrowLeftRight,
    titulo: "Conversor de divisas",
    descripcion: "USD ↔ ARS con cotización en tiempo real. Blue, oficial, MEP y mayorista.",
    color: "var(--accent, #4A7FA5)",
  },
];

const COMPONENTES: Record<CalcId, React.ComponentType> = {
  comisiones: CalculadoraComisiones,
  escrituracion: CalculadoraEscrituracion,
  icl: CalculadoraICL,
  divisas: CalculadoraDivisas,
};

export function CalculadorasPanel() {
  const [activa, setActiva] = useState<CalcId>("comisiones");
  const calc = CALCULADORAS.find((c) => c.id === activa)!;
  const Componente = COMPONENTES[activa];

  return (
    <>
      {/* ── DESKTOP: split panel ── */}
      <div
        className="hidden md:grid"
        style={{ gridTemplateColumns: "320px 1fr", gap: 18 }}
      >
        {/* Left: calculator picker */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {CALCULADORAS.map(({ id, icon: Icon, titulo, descripcion, color }) => {
            const isActive = activa === id;
            return (
              <button
                key={id}
                onClick={() => setActiva(id)}
                className="il-card w-full text-left"
                style={{
                  padding: 16,
                  cursor: "pointer",
                  background: isActive ? "var(--terracota-100, #FAE8E2)" : "#fff",
                  border: isActive ? "1px solid var(--terracota-300, #E8A888)" : "1px solid var(--border)",
                  transition: "all 150ms",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: isActive ? "#fff" : "var(--crema-100, #F0E9DC)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Icon
                      size={15}
                      style={{ color: isActive ? "var(--terracota-600, #A0553D)" : "var(--antracita-500)" }}
                    />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? "var(--terracota-700, #7E3F26)" : "var(--antracita-900)" }}>
                      {titulo}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 2, lineHeight: 1.4 }}>
                      {descripcion}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: active calculator */}
        <div className="il-card" style={{ padding: 28, overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activa}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
            >
              <div style={{ marginBottom: 20 }}>
                <h2
                  className="display"
                  style={{ fontSize: 22, margin: "0 0 4px", color: "var(--antracita-900)" }}
                >
                  {calc.titulo}
                </h2>
                <p style={{ fontSize: 13, color: "var(--antracita-500)", margin: 0 }}>
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
          style={{
            display: "flex",
            overflowX: "auto",
            gap: 4,
            padding: 4,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--crema-100, #F0E9DC)",
          }}
        >
          {CALCULADORAS.map(({ id, icon: Icon, titulo }) => {
            const isActive = activa === id;
            return (
              <button
                key={id}
                onClick={() => setActiva(id)}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? "var(--antracita-900)" : "var(--antracita-500)",
                  border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 1px 4px rgba(58,35,18,0.08)" : "none",
                }}
              >
                <Icon size={13} style={{ color: isActive ? "var(--terracota-500)" : "var(--antracita-300)" }} />
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
          >
            <div className="il-card" style={{ padding: 20 }}>
              <Componente />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
