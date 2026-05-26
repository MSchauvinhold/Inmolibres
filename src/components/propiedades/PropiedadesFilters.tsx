"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Search, LayoutGrid, List, ChevronDown, Check } from "lucide-react";

interface Option { value: string; label: string }

const OPERACION_OPTIONS: Option[] = [
  { value: "", label: "Todas" },
  { value: "VENTA", label: "Venta" },
  { value: "ALQUILER", label: "Alquiler" },
  { value: "ALQUILER_TEMPORARIO", label: "Temporario" },
];

const ESTADO_OPTIONS: Option[] = [
  { value: "", label: "Todos" },
  { value: "DISPONIBLE", label: "Disponibles" },
  { value: "RESERVADA", label: "Reservadas" },
  { value: "ALQUILADA", label: "Alquiladas" },
  { value: "VENDIDA", label: "Vendidas" },
];

// ─── FilterChip con dropdown ───────────────────────────────────────────────────

function FilterChip({
  label, currentValue, options, onChange,
}: {
  label: string;
  currentValue: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = !!currentValue;
  const displayLabel = options.find((o) => o.value === currentValue)?.label ?? "Todos";

  // Close on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }, []);

  const toggleOpen = () => {
    if (!open) document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    setOpen((p) => !p);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          padding: "7px 12px",
          borderRadius: 8,
          fontSize: 12,
          background: active ? "var(--terracota-100, #F4D8C9)" : "var(--crema-100, #F0E9DC)",
          border: active ? "1px solid var(--terracota-300, #E8A888)" : "1px solid var(--border)",
          color: active ? "var(--terracota-700, #7E3F26)" : "var(--antracita-700)",
          cursor: "pointer",
          display: "inline-flex",
          gap: 5,
          alignItems: "center",
          fontWeight: active ? 600 : 500,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: active ? "var(--terracota-400)" : "var(--antracita-300)", fontWeight: 500 }}>
          {label}:
        </span>
        {displayLabel}
        <ChevronDown size={11} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(58,35,18,0.1)",
            zIndex: 50,
            minWidth: 150,
            overflow: "hidden",
            padding: "4px 0",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                document.removeEventListener("mousedown", handleClickOutside);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 14px",
                fontSize: 13,
                color: currentValue === opt.value ? "var(--terracota-600)" : "var(--antracita-700)",
                background: currentValue === opt.value ? "var(--terracota-50, #FDF0EA)" : "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: currentValue === opt.value ? 600 : 400,
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (currentValue !== opt.value)
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--crema-100, #F0E9DC)";
              }}
              onMouseLeave={(e) => {
                if (currentValue !== opt.value)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {opt.label}
              {currentValue === opt.value && <Check size={12} style={{ color: "var(--terracota-500)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PropiedadesFilters ────────────────────────────────────────────────────────

export function PropiedadesFilters({ total }: { total: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const operacion = sp.get("operacion") ?? "";
  const estado = sp.get("estado") ?? "";
  const view = sp.get("view") ?? "grid";
  const search = sp.get("search") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`/propiedades?${params.toString()}`);
    },
    [router, sp]
  );

  const submitSearch = useCallback(() => {
    const val = searchRef.current?.value ?? "";
    update("search", val);
  }, [update]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>

      {/* ── Barra búsqueda + chips ── */}
      <div
        className="il-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Search size={16} style={{ color: "var(--antracita-300)", flexShrink: 0 }} />
        <input
          ref={searchRef}
          defaultValue={search}
          placeholder="Buscar por dirección, código o título…"
          onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
          style={{
            border: "none",
            flex: 1,
            minWidth: 160,
            fontSize: 13.5,
            background: "transparent",
            outline: "none",
            color: "var(--antracita-700)",
          }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FilterChip
            label="Operación"
            currentValue={operacion}
            options={OPERACION_OPTIONS}
            onChange={(v) => update("operacion", v)}
          />
          <FilterChip
            label="Estado"
            currentValue={estado}
            options={ESTADO_OPTIONS}
            onChange={(v) => update("estado", v)}
          />
        </div>
      </div>

      {/* ── Total + view toggle ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <span
            className="display"
            style={{ fontSize: 22, color: "var(--antracita-900)" }}
          >
            {total} {total === 1 ? "propiedad" : "propiedades"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => update("view", "grid")}
            title="Grilla"
            style={{
              background: view !== "list" ? "#fff" : "var(--crema-100, #F0E9DC)",
              padding: 7,
              border: "1px solid var(--border)",
              borderRadius: 8,
              display: "flex",
              cursor: "pointer",
              transition: "all 120ms",
            }}
          >
            <LayoutGrid
              size={14}
              style={{ color: view !== "list" ? "var(--antracita-700)" : "var(--antracita-300)" }}
            />
          </button>
          <button
            onClick={() => update("view", "list")}
            title="Lista"
            style={{
              background: view === "list" ? "#fff" : "var(--crema-100, #F0E9DC)",
              padding: 7,
              border: "1px solid var(--border)",
              borderRadius: 8,
              display: "flex",
              cursor: "pointer",
              transition: "all 120ms",
            }}
          >
            <List
              size={14}
              style={{ color: view === "list" ? "var(--antracita-700)" : "var(--antracita-300)" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
