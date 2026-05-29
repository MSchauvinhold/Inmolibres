"use client";

import { motion } from "motion/react";
import { Search, MapPin } from "lucide-react";
import { TIPO_PROPIEDAD_LABELS } from "@/lib/utils";
import type { TipoPropiedad } from "@prisma/client";

const TIPOS: TipoPropiedad[] = [
  "CASA",
  "DEPARTAMENTO",
  "LOCAL",
  "GALPON",
  "TERRENO",
  "OFICINA",
];

const CHIPS = [
  { label: "Venta", value: "VENTA" },
  { label: "Alquiler", value: "ALQUILER" },
  { label: "Temporario", value: "ALQUILER_TEMPORARIO" },
  { label: "Comercial", value: "LOCAL" },
];

interface HeroProps {
  totalPropiedades?: number;
}

export function HeroSection({ totalPropiedades }: HeroProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--terracota-100, #FAE5D3) 0%, var(--crema-50, #FBF8F2) 100%)",
        paddingBottom: 0,
      }}
    >
      {/* Architectural grid pattern */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.08, color: "var(--marron-700, #5C2E14)", pointerEvents: "none" }}
      >
        <defs>
          <pattern id="hero-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M0 80 L40 60 L80 80 M40 60 L40 30" stroke="currentColor" fill="none" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        {/* Location badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="inline-flex items-center gap-2 mb-7"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid var(--terracota-300, #E0A088)",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12.5,
            color: "var(--terracota-700, #7E3F26)",
            fontWeight: 500,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <MapPin className="w-3.5 h-3.5" style={{ color: "var(--terracota-600, #A85737)" }} />
          Paso de los Libres, Corrientes
        </motion.div>

        {/* H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1 }}
          style={{
            fontFamily: "var(--font-fraunces-display), Georgia, serif",
            color: "var(--antracita-900, #14110E)",
            fontSize: "clamp(3rem, 7vw, 5.25rem)",
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            margin: "0 0 14px",
          }}
        >
          Encontrá tu
          <br />
          próximo{" "}
          <em style={{ color: "var(--terracota-500, #C1694F)", fontStyle: "italic" }}>
            hogar.
          </em>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          style={{
            fontSize: 18,
            color: "var(--antracita-500, #3A332C)",
            margin: "0 0 40px",
            lineHeight: 1.5,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          Casas, departamentos, terrenos y comercios — publicados por inmobiliarias de confianza.
          <br />
          <span style={{ color: "var(--antracita-700, #2A2219)" }}>
            Tu próxima propiedad está acá.
          </span>
        </motion.p>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.32 }}
        >
          <form
            method="GET"
            action="/"
            className="hero-search-form"
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 8,
              boxShadow: "var(--shadow-lg, 0 4px 14px rgba(58,35,18,0.08), 0 20px 50px -16px rgba(58,35,18,0.14))",
              display: "grid",
              gridTemplateColumns: "1fr 200px 180px auto",
              gap: 0,
              maxWidth: 860,
              margin: "0 auto",
              border: "1px solid var(--border, #E8DFD0)",
            }}
          >
            {/* Search input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: 10,
                borderRight: "1px solid var(--border, #E8DFD0)",
              }}
            >
              <Search style={{ width: 17, height: 17, color: "var(--antracita-300, #6F665C)", flexShrink: 0 }} />
              <input
                name="search"
                placeholder="Buscá por barrio, calle, tipo…"
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 14,
                  color: "var(--antracita-700, #2A2219)",
                  width: "100%",
                  padding: "14px 0",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  outline: "none",
                }}
              />
            </div>

            {/* Operación select */}
            <button
              type="button"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                padding: "0 18px",
                cursor: "pointer",
                borderRight: "1px solid var(--border, #E8DFD0)",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 10, color: "var(--antracita-300, #6F665C)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono), monospace" }}>Operación</span>
              <select
                name="operacion"
                style={{
                  fontSize: 13.5,
                  color: "var(--antracita-700, #2A2219)",
                  fontWeight: 500,
                  marginTop: 2,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  width: "100%",
                }}
              >
                <option value="">Todas</option>
                <option value="VENTA">Comprar</option>
                <option value="ALQUILER">Alquilar</option>
                <option value="ALQUILER_TEMPORARIO">Temporario</option>
              </select>
            </button>

            {/* Tipo select */}
            <button
              type="button"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                padding: "0 18px",
                cursor: "pointer",
                borderRight: "1px solid var(--border, #E8DFD0)",
              }}
            >
              <span style={{ fontSize: 10, color: "var(--antracita-300, #6F665C)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono), monospace" }}>Tipo</span>
              <select
                name="tipo"
                style={{
                  fontSize: 13.5,
                  color: "var(--antracita-700, #2A2219)",
                  fontWeight: 500,
                  marginTop: 2,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  width: "100%",
                }}
              >
                <option value="">Todos</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_PROPIEDAD_LABELS[t]}
                  </option>
                ))}
              </select>
            </button>

            {/* Submit */}
            <button
              type="submit"
              className="btn-terra"
              style={{ borderRadius: 14, height: 56, padding: "0 24px", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}
            >
              <Search style={{ width: 15, height: 15 }} />
              Buscar
            </button>
          </form>

          {/* Operation chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {CHIPS.map((c, i) => (
              <a
                key={c.label}
                href={`/?operacion=${c.value}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: i === 0 ? "var(--antracita-900, #14110E)" : "rgba(255,255,255,0.65)",
                  color: i === 0 ? "var(--crema-50, #FBF8F2)" : "var(--antracita-700, #2A2219)",
                  border: i === 0 ? "none" : "1px solid var(--border, #E8DFD0)",
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  textDecoration: "none",
                }}
              >
                {c.label}
                {totalPropiedades != null && i === 0 && (
                  <span style={{ fontSize: 11, opacity: 0.6, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                    {totalPropiedades}
                  </span>
                )}
              </a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Skyline SVG at bottom */}
      <svg
        viewBox="0 0 1280 60"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: 60, color: "var(--crema-100, #F5EFE5)" }}
      >
        <path
          d="M0 60 L0 38 L60 38 L80 20 L100 38 L160 38 L160 26 L200 26 L200 12 L240 12 L240 26 L300 26 L300 38 L360 38 L380 22 L400 38 L460 38 L460 18 L500 18 L500 38 L560 38 L580 22 L600 38 L660 38 L660 30 L720 30 L720 14 L760 14 L760 30 L820 30 L820 38 L880 38 L900 22 L920 38 L980 38 L980 26 L1020 26 L1020 38 L1080 38 L1100 22 L1120 38 L1180 38 L1180 24 L1220 24 L1220 38 L1280 38 L1280 60 Z"
          fill="currentColor"
        />
      </svg>
    </section>
  );
}
