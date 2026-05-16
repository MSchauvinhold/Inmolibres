"use client";

import { motion } from "motion/react";
import { Search } from "lucide-react";
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

interface HeroProps {
  totalPropiedades?: number;
}

export function HeroSection({ totalPropiedades }: HeroProps) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: "70vh" }}>
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #FAF0E6 0%, #F5DEB3 25%, #E8C49A 50%, #DEB887 75%, #FAF0E6 100%)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 8s ease infinite",
        }}
      />

      {/* Subtle dot texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(139,69,19,0.07) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h1
            style={{
              fontFamily: "var(--font-fraunces)",
              color: "var(--antracite)",
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            Encontrá tu{" "}
            <span style={{ color: "var(--terra-mid)" }}>próximo hogar</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18, ease: "easeOut" }}
          className="mt-5 text-lg max-w-xl mx-auto leading-relaxed"
          style={{
            color: "var(--antracite-mid)",
            fontFamily: "var(--font-jakarta)",
          }}
        >
          Casas, departamentos, terrenos y más.{" "}
          <span style={{ color: "var(--terra-dark)", fontWeight: 500 }}>
            Todo en un solo lugar.
          </span>
        </motion.p>

        {/* Search form */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.32, ease: "easeOut" }}
          className="mt-9"
        >
          <form
            method="GET"
            action="/"
            className="flex flex-wrap gap-2 p-2.5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow:
                "0 4px 32px rgba(139,69,19,0.12), 0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid rgba(255,255,255,0.85)",
            }}
          >
            <input
              name="search"
              placeholder="Buscá por barrio, calle, tipo..."
              className="flex-1 min-w-[140px] bg-transparent px-3 py-2 text-sm outline-none"
              style={{
                color: "var(--antracite)",
                fontFamily: "var(--font-jakarta)",
              }}
            />
            <select
              name="operacion"
              className="text-sm px-3 py-2 rounded-xl border outline-none cursor-pointer"
              style={{
                color: "var(--antracite-mid)",
                fontFamily: "var(--font-jakarta)",
                background: "white",
                borderColor: "var(--cream-border)",
              }}
            >
              <option value="">Todas las operaciones</option>
              <option value="VENTA">Comprar</option>
              <option value="ALQUILER">Alquilar</option>
              <option value="ALQUILER_TEMPORARIO">Temporario</option>
            </select>
            <select
              name="tipo"
              className="text-sm px-3 py-2 rounded-xl border outline-none cursor-pointer"
              style={{
                color: "var(--antracite-mid)",
                fontFamily: "var(--font-jakarta)",
                background: "white",
                borderColor: "var(--cream-border)",
              }}
            >
              <option value="">Todos los tipos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_PROPIEDAD_LABELS[t]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-terra shrink-0 gap-2 px-5 py-2.5 text-sm rounded-xl"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </form>

          {/* Property count badge */}
          {totalPropiedades != null && totalPropiedades > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-4 text-sm"
              style={{
                color: "var(--antracite-light)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Más de{" "}
              <span
                style={{ color: "var(--terra-mid)", fontWeight: 600 }}
              >
                {totalPropiedades}
              </span>{" "}
              propiedades disponibles en la plataforma
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* SVG Rooftop skyline — transition to background */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg
          viewBox="0 0 1440 88"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ width: "100%", height: 88, display: "block" }}
        >
          {/* Back layer: warm terracota silhouette */}
          <path
            d="M0,88 L0,62 L30,62 L30,42 L50,24 L70,42 L70,62 L110,62 L110,48 L130,32 L150,48 L150,62 L180,62 L180,52 L200,36 L212,26 L224,36 L244,52 L244,62 L280,62 L280,44 L302,28 L322,44 L322,62 L360,62 L360,54 L380,40 L392,32 L404,40 L424,54 L424,62 L460,62 L460,48 L482,30 L502,48 L502,62 L540,62 L540,56 L560,44 L572,36 L584,44 L604,56 L604,62 L640,62 L640,44 L662,26 L682,44 L682,62 L720,62 L720,52 L740,38 L752,30 L764,38 L784,52 L784,62 L820,62 L820,48 L842,32 L862,48 L862,62 L900,62 L900,54 L920,42 L930,34 L940,42 L960,54 L960,62 L1000,62 L1000,44 L1022,26 L1042,44 L1042,62 L1080,62 L1080,52 L1100,38 L1112,30 L1124,38 L1144,52 L1144,62 L1180,62 L1180,48 L1200,32 L1220,48 L1220,62 L1260,62 L1260,56 L1280,44 L1292,36 L1304,44 L1324,56 L1324,62 L1360,62 L1360,44 L1382,26 L1402,44 L1402,62 L1440,62 L1440,88 Z"
            fill="rgba(139,69,19,0.07)"
          />
          {/* Front layer: fills with page background color */}
          <path
            d="M0,88 L0,68 L28,68 L28,50 L48,32 L68,50 L68,68 L108,68 L108,55 L128,38 L148,55 L148,68 L178,68 L178,58 L196,42 L208,32 L220,42 L240,58 L240,68 L278,68 L278,50 L298,34 L318,50 L318,68 L358,68 L358,60 L376,46 L388,38 L400,46 L420,60 L420,68 L458,68 L458,54 L478,36 L498,54 L498,68 L538,68 L538,62 L556,50 L568,42 L580,50 L600,62 L600,68 L638,68 L638,50 L658,32 L678,50 L678,68 L718,68 L718,58 L736,44 L748,36 L760,44 L780,58 L780,68 L818,68 L818,54 L838,38 L858,54 L858,68 L898,68 L898,60 L916,46 L928,38 L938,46 L958,60 L958,68 L998,68 L998,50 L1018,32 L1038,50 L1038,68 L1078,68 L1078,58 L1096,44 L1108,36 L1120,44 L1140,58 L1140,68 L1178,68 L1178,54 L1196,38 L1216,54 L1216,68 L1258,68 L1258,62 L1276,50 L1288,42 L1300,50 L1320,62 L1320,68 L1358,68 L1358,50 L1378,32 L1398,50 L1398,68 L1440,68 L1440,88 Z"
            fill="#FAF8F5"
          />
        </svg>
      </div>
    </section>
  );
}
