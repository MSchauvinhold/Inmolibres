"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Search, FileText, Shield, Trash2, ExternalLink,
  User, Users, Home, ShoppingCart, X, Loader2, ChevronDown,
} from "lucide-react";
import type { RolContacto } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactoRow {
  id: string;
  nombre: string;
  roles: RolContacto[];
  telefono: string | null;
  email: string | null;
  dni: string | null;
  garante: { id: string } | null;
  _count: { documentos: number };
  createdAt: string;
}

interface Props {
  contactos: ContactoRow[];
}

// ─── Role config ──────────────────────────────────────────────────────────────

const ROL_CFG: Record<RolContacto, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  PROPIETARIO: { label: "Propietario", bg: "#E8F5E9", text: "#1B5E20", icon: Home },
  INQUILINO:   { label: "Inquilino",   bg: "#E3F2FD", text: "#0D47A1", icon: Users },
  COMPRADOR:   { label: "Comprador",   bg: "#FFF8E1", text: "#E65100", icon: ShoppingCart },
};

const TABS: Array<{ key: RolContacto | "TODOS"; label: string }> = [
  { key: "TODOS",      label: "Todos" },
  { key: "PROPIETARIO", label: "Propietarios" },
  { key: "INQUILINO",   label: "Inquilinos" },
  { key: "COMPRADOR",   label: "Compradores" },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ nombre, rol }: { nombre: string; rol: RolContacto | undefined }) {
  const bg = rol ? ROL_CFG[rol].bg : "#F3F1EE";
  const text = rol ? ROL_CFG[rol].text : "#6a6a6a";
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
      style={{ background: bg, color: text }}
    >
      {nombre.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── NuevoContactoModal ───────────────────────────────────────────────────────

const ESTADO_CIVIL = ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a"];

function NuevoContactoModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: ContactoRow) => void }) {
  const [form, setForm] = useState({
    roles: [] as RolContacto[],
    nombre: "",
    dni: "",
    fechaNacimiento: "",
    estadoCivil: "",
    domicilio: "",
    telefono: "",
    email: "",
    ocupacion: "",
    notas: "",
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function toggleRol(r: RolContacto) {
    setForm((p) => ({
      ...p,
      roles: p.roles.includes(r) ? p.roles.filter((x) => x !== r) : [...p.roles, r],
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (form.roles.length === 0) e.roles = "Seleccioná al menos un rol";
    if (form.telefono && form.telefono.trim().length < 7) e.telefono = "Teléfono inválido";
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errsNew = validate();
    if (Object.keys(errsNew).length > 0) { setErrs(errsNew); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { data?: ContactoRow; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al crear");
      onCreated({ ...json.data!, garante: null, _count: { documentos: 0 } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#8B4513]/20 focus:border-[#8B4513]";
  const inpStyle = { borderColor: "#D4D0CB", background: "#FAFAF8" };
  const lbl = "block text-xs font-semibold mb-1.5 text-[#3a3a3a]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "90vh" }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: "var(--brand-primary)" }}>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-white/70" />
            <p className="text-white font-bold text-sm">Nuevo contacto</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Roles */}
          <div>
            <p className={lbl}>Rol del contacto *</p>
            <div className="flex gap-2 flex-wrap">
              {(["PROPIETARIO", "INQUILINO", "COMPRADOR"] as RolContacto[]).map((r) => {
                const cfg = ROL_CFG[r];
                const active = form.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRol(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
                    style={{
                      background: active ? cfg.bg : "#FAFAF8",
                      color: active ? cfg.text : "#6a6a6a",
                      borderColor: active ? cfg.text : "#D4D0CB",
                    }}
                  >
                    <cfg.icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            {errs.roles && <p className="text-[11px] text-red-500 mt-1">{errs.roles}</p>}
          </div>

          {/* Nombre + DNI */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nombre completo *</label>
              <input className={inp} style={inpStyle} value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Juan Pérez" />
              {errs.nombre && <p className="text-[11px] text-red-500 mt-1">{errs.nombre}</p>}
            </div>
            <div>
              <label className={lbl}>DNI</label>
              <input className={inp} style={inpStyle} value={form.dni} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))} placeholder="12.345.678" />
            </div>
          </div>

          {/* Nacimiento + Estado civil */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Fecha de nacimiento</label>
              <input type="date" className={inp} style={inpStyle} value={form.fechaNacimiento} onChange={(e) => setForm((p) => ({ ...p, fechaNacimiento: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Estado civil</label>
              <select className={inp} style={inpStyle} value={form.estadoCivil} onChange={(e) => setForm((p) => ({ ...p, estadoCivil: e.target.value }))}>
                <option value="">Sin especificar</option>
                {ESTADO_CIVIL.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Domicilio */}
          <div>
            <label className={lbl}>Domicilio</label>
            <input className={inp} style={inpStyle} value={form.domicilio} onChange={(e) => setForm((p) => ({ ...p, domicilio: e.target.value }))} placeholder="Av. San Martín 123" />
          </div>

          {/* Tel + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Teléfono</label>
              <input className={inp} style={inpStyle} value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} placeholder="+54 3772 ..." />
              {errs.telefono && <p className="text-[11px] text-red-500 mt-1">{errs.telefono}</p>}
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" className={inp} style={inpStyle} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="juan@email.com" />
            </div>
          </div>

          {/* Ocupación */}
          <div>
            <label className={lbl}>Ocupación</label>
            <input className={inp} style={inpStyle} value={form.ocupacion} onChange={(e) => setForm((p) => ({ ...p, ocupacion: e.target.value }))} placeholder="Empleado, comerciante..." />
          </div>

          {/* Notas */}
          <div>
            <label className={lbl}>Notas internas</label>
            <textarea rows={3} className={inp + " resize-none"} style={inpStyle} value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} placeholder="Observaciones privadas..." />
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 border-t flex gap-3" style={{ borderColor: "#E8E5E0" }}>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors" style={{ borderColor: "#D4D0CB", color: "#3a3a3a" }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: "var(--brand-primary)" }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear contacto
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContactosClient({ contactos: initial }: Props) {
  const router = useRouter();
  const [contactos, setContactos] = useState(initial);
  const [tab, setTab] = useState<RolContacto | "TODOS">("TODOS");
  const [q, setQ] = useState("");
  const [showNuevo, setShowNuevo] = useState(false);

  const filtered = useMemo(() => {
    let list = contactos;
    if (tab !== "TODOS") list = list.filter((c) => c.roles.includes(tab));
    if (q.trim()) {
      const lq = q.toLowerCase();
      list = list.filter((c) =>
        c.nombre.toLowerCase().includes(lq) ||
        (c.dni ?? "").includes(lq) ||
        (c.telefono ?? "").includes(lq) ||
        (c.email ?? "").toLowerCase().includes(lq)
      );
    }
    return list;
  }, [contactos, tab, q]);

  const handleCreated = useCallback((c: ContactoRow) => {
    setContactos((prev) => [c, ...prev]);
    setShowNuevo(false);
    toast.success("Contacto creado");
  }, []);

  const handleDelete = useCallback(async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el contacto "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/contactos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setContactos((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contacto eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  }, []);

  // Contadores por tipo
  const cntProp = contactos.filter((c) => c.roles.includes("PROPIETARIO")).length;
  const cntInq  = contactos.filter((c) => c.roles.includes("INQUILINO")).length;
  const cntComp = contactos.filter((c) => c.roles.includes("COMPRADOR")).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <User className="w-5 h-5 text-brand-primary" />
            Contactos
          </h1>
          <p className="text-sm text-text-muted mt-0.5">{contactos.length} contacto{contactos.length !== 1 ? "s" : ""} registrado{contactos.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowNuevo(true)} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          Nuevo contacto
        </button>
      </div>

      {/* Mini dashboard de tipos */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { rol: "PROPIETARIO" as RolContacto, label: "Propietarios", count: cntProp, icon: Home,         bg: "#E8F5E9", text: "#1B5E20" },
          { rol: "INQUILINO"   as RolContacto, label: "Inquilinos",   count: cntInq,  icon: Users,        bg: "#E3F2FD", text: "#0D47A1" },
          { rol: "COMPRADOR"   as RolContacto, label: "Compradores",  count: cntComp, icon: ShoppingCart, bg: "#FFF8E1", text: "#E65100" },
        ]).map(({ rol, label, count, icon: Icon, bg, text }) => {
          const active = tab === rol;
          return (
            <button
              key={rol}
              type="button"
              onClick={() => setTab(active ? "TODOS" : rol)}
              className="rounded-xl p-3 flex items-center gap-3 border transition-all text-left"
              style={{
                background: bg,
                borderColor: active ? text : "transparent",
                boxShadow: active ? `0 0 0 2px ${text}22` : "none",
                opacity: tab === "TODOS" || active ? 1 : 0.55,
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.5)" }}>
                <Icon className="w-4 h-4" style={{ color: text }} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none" style={{ color: text }}>{count}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: text, opacity: 0.8 }}>{label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="input-base w-full pl-9 text-sm"
            placeholder="Buscar por nombre, DNI, teléfono o email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === key ? "var(--surface)" : "transparent",
                color: tab === key ? "var(--brand-primary)" : "var(--text-muted)",
                boxShadow: tab === key ? "var(--shadow-card)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <User className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">
            {q || tab !== "TODOS" ? "Sin resultados para los filtros aplicados" : "No hay contactos registrados aún"}
          </p>
          {(q || tab !== "TODOS") && (
            <button onClick={() => { setQ(""); setTab("TODOS"); }} className="text-brand-primary text-xs mt-2 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--surface-raised)" }}>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted px-4 py-3">Contacto</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted px-4 py-3 hidden sm:table-cell">Rol</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-text-muted px-4 py-3 hidden md:table-cell">Teléfono</th>
                <th className="text-center text-[10px] font-bold uppercase tracking-widest text-text-muted px-4 py-3 hidden lg:table-cell">Docs</th>
                <th className="text-center text-[10px] font-bold uppercase tracking-widest text-text-muted px-4 py-3 hidden lg:table-cell">Garante</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="group cursor-pointer transition-colors hover:bg-[#F9F7F4]"
                  style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                  onClick={() => router.push(`/contactos/${c.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nombre={c.nombre} rol={c.roles[0]} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-text-primary truncate">{c.nombre}</p>
                        {c.dni && <p className="text-xs text-text-muted">DNI {c.dni}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {c.roles.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: ROL_CFG[r].bg, color: ROL_CFG[r].text }}
                        >
                          {ROL_CFG[r].label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm text-text-primary">{c.telefono ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-xs font-semibold text-text-primary">{c._count.documentos}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-center">
                    {c.garante ? (
                      <Shield className="w-4 h-4 mx-auto" style={{ color: "var(--brand-primary)" }} />
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/contactos/${c.id}`)}
                        className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-primary transition-colors"
                        title="Ver detalle"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.nombre)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNuevo && <NuevoContactoModal onClose={() => setShowNuevo(false)} onCreated={handleCreated} />}
    </div>
  );
}
