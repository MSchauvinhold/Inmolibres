"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X, UserPlus, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ContactoMinimal {
  id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  domicilio: string | null;
  estadoCivil: string | null;
  email: string | null;
}

interface Props {
  label: string;
  required?: boolean;
  selected: ContactoMinimal | null;
  color?: string;
  /** Si se pasa, el selector pre-filtra por ese rol al abrir */
  rolHint?: "INQUILINO" | "PROPIETARIO" | "COMPRADOR";
  onSelect: (c: ContactoMinimal | null) => void;
  error?: string;
}

// ─── Estilos compartidos con el wizard ───────────────────────────────────────

const inp  = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#8B4513]/20 focus:border-[#8B4513]";
const inpS = { borderColor: "#D4D0CB", background: "#FAFAF8", color: "#1a1a1a" };
const lbl  = "block text-xs font-semibold mb-1.5 text-[#3a3a3a]";

const ESTADO_CIVIL = [
  { value: "soltero",    label: "Soltero/a" },
  { value: "casado",     label: "Casado/a" },
  { value: "divorciado", label: "Divorciado/a" },
  { value: "viudo",      label: "Viudo/a" },
];

// ─── Iniciales del contacto ───────────────────────────────────────────────────

function Avatar({ nombre, size = 28 }: { nombre: string; size?: number }) {
  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 999,
        background: "#1B433220", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.38, fontWeight: 700,
        color: "#1B4332", flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Mini línea de info del contacto ─────────────────────────────────────────

function ContactoInfo({ c }: { c: ContactoMinimal }) {
  const parts = [c.dni && `DNI ${c.dni}`, c.telefono].filter(Boolean);
  return (
    <span style={{ fontSize: 10.5, color: "#9a9a9a" }}>
      {parts.length ? parts.join(" · ") : "Sin datos adicionales"}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ContactoSelector({ label, required, selected, color = "#1B4332", rolHint, onSelect, error }: Props) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<ContactoMinimal[]>([]);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState<"search" | "create">("search");

  // Formulario de creación inline
  const [form, setForm] = useState({
    nombre: "", dni: "", telefono: "", domicilio: "", estadoCivil: "soltero",
  });
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // ── Cerrar con la tecla Escape ───────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setMode("search"); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function cerrar() { setOpen(false); setMode("search"); }

  // ── Búsqueda con debounce ────────────────────────────────────────────────

  const buscar = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = `/api/contactos?q=${encodeURIComponent(q)}${rolHint ? `&rol=${rolHint}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json() as { data: ContactoMinimal[] };
        setResults(json.data ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [rolHint]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => buscar(query), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, open, buscar]);

  // ── Abrir dropdown ───────────────────────────────────────────────────────

  function handleOpen() {
    setOpen(true);
    setMode("search");
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ── Seleccionar contacto ─────────────────────────────────────────────────

  function handleSelect(c: ContactoMinimal) {
    onSelect(c);
    setOpen(false);
    setQuery("");
    setMode("search");
  }

  // ── Crear contacto ───────────────────────────────────────────────────────

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles: rolHint ? [rolHint] : [],
          nombre: form.nombre.trim(),
          dni: form.dni.trim() || null,
          telefono: form.telefono.trim() || null,
          domicilio: form.domicilio.trim() || null,
          estadoCivil: form.estadoCivil || null,
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json() as { data: ContactoMinimal };
      toast.success(`Contacto "${form.nombre}" creado`);
      handleSelect(json.data);
      setForm({ nombre: "", dni: "", telefono: "", domicilio: "", estadoCivil: "soltero" });
    } catch {
      toast.error("Error al crear el contacto");
    } finally {
      setSaving(false);
    }
  }

  // ── Pre-llenar nombre del formulario de creación desde la búsqueda ───────

  function iniciarCrear() {
    setForm((f) => ({ ...f, nombre: query }));
    setMode("create");
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label className={lbl}>
        {label}{required && <span style={{ color: "#DC2626" }}> *</span>}
      </label>

      {/* ── Contacto seleccionado: chip ── */}
      {selected ? (
        <div
          className="rounded-xl border flex items-center gap-3 px-3 py-2.5"
          style={{ borderColor: color, background: `${color}08` }}
        >
          <Avatar nombre={selected.nombre} />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{selected.nombre}</div>
            <ContactoInfo c={selected} />
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            style={{
              width: 22, height: 22, borderRadius: 999,
              background: "#E0D6CC", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
            title="Cambiar contacto"
          >
            <X size={12} color="#5a5a5a" />
          </button>
        </div>
      ) : (
        /* ── Sin seleccionar: botón para abrir ── */
        <button
          type="button"
          onClick={handleOpen}
          className={inp}
          style={{
            ...inpS,
            display: "flex", alignItems: "center", gap: 8,
            textAlign: "left", borderColor: error ? "#DC2626" : "#D4D0CB",
          }}
        >
          <Search size={14} color="#9a9a9a" />
          <span style={{ color: "#9a9a9a", fontSize: 13 }}>Buscar contacto...</span>
          <ChevronDown size={13} color="#9a9a9a" style={{ marginLeft: "auto" }} />
        </button>
      )}

      {error && <p style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>{error}</p>}

      {/* ── Modal centrado (portal) — flota sobre el wizard, sin scroll ── */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(20,17,14,0.5)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
        <div
          style={{
            width: "100%", maxWidth: 460,
            background: "white", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            border: "1px solid #E8E5E0", overflow: "hidden",
            maxHeight: "82vh", display: "flex", flexDirection: "column",
          }}
        >
          {/* Encabezado del modal */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F0EDE8" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
              {mode === "search" ? `Seleccionar ${label.toLowerCase()}` : "Nuevo contacto"}
            </p>
            <button type="button" onClick={cerrar} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9a9a9a" }}>
              <X size={16} />
            </button>
          </div>

          {mode === "search" ? (
            <>
              {/* Input de búsqueda */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid #F0EDE8", display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={13} color="#9a9a9a" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nombre, DNI o teléfono..."
                  style={{ border: "none", outline: "none", flex: 1, fontSize: 13, background: "transparent", color: "#1a1a1a" }}
                />
                {loading && <Loader2 size={13} color="#9a9a9a" className="animate-spin" />}
              </div>

              {/* Lista de resultados */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {results.length === 0 && !loading ? (
                  <div style={{ padding: "14px 16px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, color: "#9a9a9a" }}>
                      {query ? `No se encontró "${query}"` : "No hay contactos cargados aún"}
                    </p>
                  </div>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      style={{
                        width: "100%", padding: "10px 14px", textAlign: "left",
                        display: "flex", alignItems: "center", gap: 10,
                        border: "none", background: "none", cursor: "pointer",
                        borderBottom: "1px solid #F7F5F2",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F5F2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <Avatar nombre={c.nombre} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{c.nombre}</div>
                        <ContactoInfo c={c} />
                      </div>
                      {selected?.id === c.id && <Check size={14} color={color} style={{ marginLeft: "auto" }} />}
                    </button>
                  ))
                )}
              </div>

              {/* Crear nuevo */}
              <button
                type="button"
                onClick={iniciarCrear}
                style={{
                  width: "100%", padding: "11px 14px", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 8,
                  border: "none", background: "#FAFAF8", cursor: "pointer",
                  borderTop: "1px solid #E8E5E0", color: color, fontSize: 13, fontWeight: 600,
                }}
              >
                <UserPlus size={14} />
                {query ? `Crear "${query}" como nuevo contacto` : "Crear nuevo contacto"}
              </button>
            </>
          ) : (
            /* ── Formulario de creación ── */
            <form onSubmit={handleCrear} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              <button
                type="button"
                onClick={() => setMode("search")}
                style={{ fontSize: 11.5, color: color, background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start", padding: 0, fontWeight: 600 }}
              >
                ← Volver a buscar
              </button>

              {/* Nombre */}
              <div>
                <label className={lbl}>Nombre completo *</label>
                <input
                  className={inp} style={inpS} required
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className={lbl}>DNI / CUIT</label>
                  <input className={inp} style={inpS} value={form.dni} onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))} placeholder="30.123.456" />
                </div>
                <div>
                  <label className={lbl}>Teléfono</label>
                  <input className={inp} style={inpS} value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="+54 3772..." />
                </div>
              </div>

              <div>
                <label className={lbl}>Domicilio</label>
                <input className={inp} style={inpS} value={form.domicilio} onChange={(e) => setForm((f) => ({ ...f, domicilio: e.target.value }))} placeholder="Calle 123" />
              </div>

              <div>
                <label className={lbl}>Estado civil</label>
                <select className={inp} style={inpS} value={form.estadoCivil} onChange={(e) => setForm((f) => ({ ...f, estadoCivil: e.target.value }))}>
                  {ESTADO_CIVIL.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setMode("search")} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "#D4D0CB", color: "#6a6a6a", background: "none", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving || !form.nombre.trim()}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                  style={{ background: color, border: "none", cursor: "pointer" }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  {saving ? "Creando…" : "Crear y seleccionar"}
                </button>
              </div>
            </form>
          )}
        </div>
        </div>,
        document.body
      )}
    </div>
  );
}
