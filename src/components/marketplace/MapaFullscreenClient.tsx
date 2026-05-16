"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useMemo } from "react";
import { X, Filter } from "lucide-react";
import type { MapProperty } from "./MarketplaceMap";

const MapaFullscreen = dynamic(
  () => import("./MapaFullscreen").then((m) => m.MapaFullscreen),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "#e8e0d4" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "var(--terra-mid)", borderTopColor: "transparent" }}
          />
          <p style={{ color: "var(--antracite-mid)", fontFamily: "var(--font-jakarta)", fontSize: 14 }}>
            Cargando mapa...
          </p>
        </div>
      </div>
    ),
  }
);

type Operacion = "VENTA" | "ALQUILER" | "ALQUILER_TEMPORARIO";
type TipoFiltro = "" | "CASA" | "DEPARTAMENTO" | "LOCAL" | "GALPON" | "TERRENO" | "OFICINA";

const TIPO_LABELS: Record<string, string> = {
  CASA: "Casa",
  DEPARTAMENTO: "Departamento",
  TERRENO: "Terreno",
  LOCAL: "Local",
  GALPON: "Galpón",
  OFICINA: "Oficina",
};

const OP_STYLE: Record<Operacion, { bg: string; text: string; label: string }> = {
  VENTA: { bg: "#C1694F", text: "white", label: "Venta" },
  ALQUILER: { bg: "#2980B9", text: "white", label: "Alquiler" },
  ALQUILER_TEMPORARIO: { bg: "#2D6A4F", text: "white", label: "Temporario" },
};

interface Props {
  properties: MapProperty[];
}

export function MapaFullscreenClient({ properties }: Props) {
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [tipo, setTipo] = useState<TipoFiltro>("");
  const [inmobiliariaId, setInmobiliariaId] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [moneda, setMoneda] = useState<"USD" | "ARS">("USD");
  const [filtersVisible, setFiltersVisible] = useState(false);

  const toggleOp = useCallback((op: Operacion) => {
    setOperaciones((prev) =>
      prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]
    );
  }, []);

  // Unique inmobiliarias derived from the properties list
  const inmobiliarias = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; nombre: string }[] = [];
    for (const p of properties) {
      if (p.inmobiliariaNombre && !seen.has(p.inmobiliariaId)) {
        seen.add(p.inmobiliariaId);
        result.push({ id: p.inmobiliariaId, nombre: p.inmobiliariaNombre });
      }
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [properties]);

  const hasFilters =
    operaciones.length > 0 ||
    tipo !== "" ||
    inmobiliariaId !== "" ||
    precioMin !== "" ||
    precioMax !== "";

  // Real-time filtering — no "Aplicar" gate
  const filteredProperties = properties.filter((p) => {
    if (operaciones.length > 0 && !operaciones.includes(p.operacion as Operacion)) return false;
    if (tipo && p.tipo !== tipo) return false;
    if (inmobiliariaId && p.inmobiliariaId !== inmobiliariaId) return false;
    const pMin = precioMin ? parseFloat(precioMin) : null;
    const pMax = precioMax ? parseFloat(precioMax) : null;
    if ((pMin != null || pMax != null) && p.moneda !== moneda) return false;
    if (pMin != null && p.precio < pMin) return false;
    if (pMax != null && p.precio > pMax) return false;
    return true;
  });

  const limpiar = () => {
    setOperaciones([]);
    setTipo("");
    setInmobiliariaId("");
    setPrecioMin("");
    setPrecioMax("");
  };

  return (
    <div className="absolute inset-0">
      {/* Filter bar — floats above map */}
      <div
        className="absolute z-[1000] left-0 right-0 flex flex-col items-center"
        style={{ top: 12, paddingLeft: 12, paddingRight: 12 }}
      >
        {/* Mobile toggle button */}
        <div className="sm:hidden w-full flex justify-end mb-2">
          <button
            onClick={() => setFiltersVisible((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg"
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--cream-border)",
              color: "var(--antracite)",
              fontFamily: "var(--font-jakarta)",
            }}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasFilters && (
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--terra-mid)" }} />
            )}
          </button>
        </div>

        {/* Filter panel */}
        <div
          className={`${filtersVisible ? "flex" : "hidden"} sm:flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 rounded-2xl flex-wrap`}
          style={{
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--cream-border)",
            boxShadow: "0 4px 24px rgba(139,69,19,0.1)",
          }}
        >
          {/* Operacion pills */}
          <div className="flex gap-1.5 flex-wrap">
            {(["VENTA", "ALQUILER", "ALQUILER_TEMPORARIO"] as Operacion[]).map((op) => {
              const s = OP_STYLE[op];
              const active = operaciones.includes(op);
              return (
                <button
                  key={op}
                  onClick={() => toggleOp(op)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: active ? s.bg : "var(--cream-dark)",
                    color: active ? s.text : "var(--antracite-mid)",
                    border: `1.5px solid ${active ? s.bg : "var(--cream-border)"}`,
                    fontFamily: "var(--font-jakarta)",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:block w-px h-6" style={{ background: "var(--cream-border)" }} />

          {/* Tipo select */}
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoFiltro)}
            className="text-sm rounded-xl px-3 py-1.5 outline-none"
            style={{
              border: "1px solid var(--cream-border)",
              background: "white",
              color: "var(--antracite)",
              fontFamily: "var(--font-jakarta)",
            }}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Inmobiliaria select — only shown when there are multiple */}
          {inmobiliarias.length > 1 && (
            <select
              value={inmobiliariaId}
              onChange={(e) => setInmobiliariaId(e.target.value)}
              className="text-sm rounded-xl px-3 py-1.5 outline-none"
              style={{
                border: "1px solid var(--cream-border)",
                background: "white",
                color: "var(--antracite)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              <option value="">Todas las inmobiliarias</option>
              {inmobiliarias.map(({ id, nombre }) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          )}

          <div className="hidden sm:block w-px h-6" style={{ background: "var(--cream-border)" }} />

          {/* Price range */}
          <div className="flex items-center gap-1.5">
            <input
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              placeholder="Desde"
              type="number"
              className="w-24 text-sm px-2.5 py-1.5 rounded-xl outline-none"
              style={{
                border: "1px solid var(--cream-border)",
                background: "white",
                color: "var(--antracite)",
                fontFamily: "var(--font-jakarta)",
              }}
            />
            <span style={{ color: "var(--antracite-light)", fontSize: 12 }}>–</span>
            <input
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              placeholder="Hasta"
              type="number"
              className="w-24 text-sm px-2.5 py-1.5 rounded-xl outline-none"
              style={{
                border: "1px solid var(--cream-border)",
                background: "white",
                color: "var(--antracite)",
                fontFamily: "var(--font-jakarta)",
              }}
            />
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value as "USD" | "ARS")}
              className="text-sm rounded-xl px-2 py-1.5 outline-none"
              style={{
                border: "1px solid var(--cream-border)",
                background: "white",
                color: "var(--antracite)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>

          {/* Limpiar — only shown when there are active filters */}
          {hasFilters && (
            <>
              <div className="hidden sm:block w-px h-6" style={{ background: "var(--cream-border)" }} />
              <button
                onClick={limpiar}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm"
                style={{
                  background: "var(--cream-dark)",
                  color: "var(--antracite-mid)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Map — fills entire container */}
      <div className="absolute inset-0">
        <MapaFullscreen properties={filteredProperties} />
      </div>

      {/* Legend — bottom left */}
      <div
        className="absolute bottom-6 left-4 z-[1000] flex items-center gap-3 px-4 py-2.5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--cream-border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          fontFamily: "var(--font-jakarta)",
        }}
      >
        {Object.entries(OP_STYLE).map(([op, s]) => (
          <div key={op} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: s.bg }}
            />
            <span style={{ fontSize: 11, color: "var(--antracite-mid)", fontWeight: 500 }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
