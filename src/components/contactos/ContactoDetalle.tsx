"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Edit2, Save, X, Plus, Shield, Phone,
  Mail, MapPin, Calendar, Briefcase, FileText,
  Check, Loader2, Home, Users, ShoppingCart, ScrollText,
} from "lucide-react";
import { DocUploader, type DocItem } from "./DocUploader";
import type { RolContacto, TipoDocumento } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GaranteData {
  id: string;
  nombre: string;
  dni: string | null;
  fechaNacimiento: string | null;
  domicilio: string | null;
  telefono: string | null;
  relacionConContacto: string | null;
  documentos: DocItem[];
}

interface ContratoVinculado {
  id: string;
  rol: string;
  contrato: {
    id: string;
    fechaInicio: string;
    fechaFin: string;
    estadoPago: string;
    propiedad: { titulo: string; direccion: string };
  };
}

export interface ContactoFull {
  id: string;
  nombre: string;
  roles: RolContacto[];
  dni: string | null;
  fechaNacimiento: string | null;
  domicilio: string | null;
  telefono: string | null;
  email: string | null;
  estadoCivil: string | null;
  ocupacion: string | null;
  notas: string | null;
  createdAt: string;
  documentos: DocItem[];
  garante: GaranteData | null;
  contratos: ContratoVinculado[];
}

// ─── Role config ──────────────────────────────────────────────────────────────

const ROL_CFG: Record<RolContacto, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  PROPIETARIO: { label: "Propietario", bg: "#E8F5E9", text: "#1B5E20", icon: Home },
  INQUILINO:   { label: "Inquilino",   bg: "#E3F2FD", text: "#0D47A1", icon: Users },
  COMPRADOR:   { label: "Comprador",   bg: "#FFF8E1", text: "#E65100", icon: ShoppingCart },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{title}</p>
      {children}
    </div>
  );
}

function DataRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-text-muted uppercase font-semibold">{label}</p>
        <p className="text-sm text-text-primary mt-0.5">{value}</p>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]";
const inpStyle = { borderColor: "#D4D0CB", background: "#FAFAF8" };
const lbl = "block text-xs font-semibold mb-1 text-[#3a3a3a]";
const ESTADO_CIVIL = ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a"];

// ─── GaranteSection ───────────────────────────────────────────────────────────

function GaranteSection({
  contactoId, garante, onGaranteChange,
}: {
  contactoId: string;
  garante: GaranteData | null;
  onGaranteChange: (g: GaranteData) => void;
}) {
  const [expanded, setExpanded] = useState(!garante);
  const [form, setForm] = useState({
    nombre: garante?.nombre ?? "",
    dni: garante?.dni ?? "",
    fechaNacimiento: garante?.fechaNacimiento?.slice(0, 10) ?? "",
    domicilio: garante?.domicilio ?? "",
    telefono: garante?.telefono ?? "",
    relacionConContacto: garante?.relacionConContacto ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nombre.trim()) { toast.error("Nombre del garante requerido"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/contactos/${contactoId}/garante`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { data?: { id: string } & typeof form };
      if (!res.ok) throw new Error();
      onGaranteChange({
        id: json.data!.id,
        nombre: form.nombre,
        dni: form.dni || null,
        fechaNacimiento: form.fechaNacimiento || null,
        domicilio: form.domicilio || null,
        telefono: form.telefono || null,
        relacionConContacto: form.relacionConContacto || null,
        documentos: garante?.documentos ?? [],
      });
      setExpanded(false);
      toast.success(garante ? "Garante actualizado" : "Garante agregado");
    } catch {
      toast.error("Error al guardar garante");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Garante</p>
        {garante && !expanded && (
          <button onClick={() => setExpanded(true)} className="text-xs text-brand-primary hover:underline flex items-center gap-1">
            <Edit2 className="w-3 h-3" /> Editar
          </button>
        )}
      </div>

      {garante && !expanded ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ background: "#1B4332" }}>
              {garante.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm text-text-primary">{garante.nombre}</p>
              {garante.relacionConContacto && <p className="text-xs text-text-muted">{garante.relacionConContacto}</p>}
            </div>
          </div>
          {garante.dni && <DataRow icon={FileText} label="DNI" value={garante.dni} />}
          {garante.telefono && <DataRow icon={Phone} label="Teléfono" value={garante.telefono} />}
          {garante.domicilio && <DataRow icon={MapPin} label="Domicilio" value={garante.domicilio} />}
        </div>
      ) : expanded ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nombre completo *</label>
              <input className={inp} style={inpStyle} value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>DNI</label>
              <input className={inp} style={inpStyle} value={form.dni} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Fecha de nacimiento</label>
              <input type="date" className={inp} style={inpStyle} value={form.fechaNacimiento} onChange={(e) => setForm((p) => ({ ...p, fechaNacimiento: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Teléfono</label>
              <input className={inp} style={inpStyle} value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Domicilio</label>
              <input className={inp} style={inpStyle} value={form.domicilio} onChange={(e) => setForm((p) => ({ ...p, domicilio: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Relación con el contacto</label>
              <input className={inp} style={inpStyle} value={form.relacionConContacto} onChange={(e) => setForm((p) => ({ ...p, relacionConContacto: e.target.value }))} placeholder="padre, cónyuge, hermano..." />
            </div>
          </div>
          <div className="flex gap-2">
            {garante && <button onClick={() => setExpanded(false)} className="px-4 py-2 rounded-xl border text-sm font-semibold" style={{ borderColor: "#D4D0CB" }}><X className="w-3.5 h-3.5 inline mr-1" />Cancelar</button>}
            <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "#1B4332" }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {garante ? "Actualizar garante" : "Guardar garante"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setExpanded(true)} className="flex items-center gap-2 text-sm font-semibold transition-colors hover:underline" style={{ color: "#1B4332" }}>
          <Plus className="w-4 h-4" /> Agregar garante
        </button>
      )}
    </div>
  );
}

// ─── Edit form inline ─────────────────────────────────────────────────────────

function EditForm({
  contacto, onSave, onCancel,
}: {
  contacto: ContactoFull;
  onSave: (updated: Partial<ContactoFull>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    roles: contacto.roles as RolContacto[],
    nombre: contacto.nombre,
    dni: contacto.dni ?? "",
    fechaNacimiento: contacto.fechaNacimiento?.slice(0, 10) ?? "",
    estadoCivil: contacto.estadoCivil ?? "",
    domicilio: contacto.domicilio ?? "",
    telefono: contacto.telefono ?? "",
    email: contacto.email ?? "",
    ocupacion: contacto.ocupacion ?? "",
    notas: contacto.notas ?? "",
  });
  const [saving, setSaving] = useState(false);

  function toggleRol(r: RolContacto) {
    setForm((p) => ({ ...p, roles: p.roles.includes(r) ? p.roles.filter((x) => x !== r) : [...p.roles, r] }));
  }

  async function save() {
    if (!form.nombre.trim()) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/contactos/${contacto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      onSave(form);
      toast.success("Contacto actualizado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Editar datos</p>

      {/* Roles */}
      <div>
        <p className={lbl}>Roles</p>
        <div className="flex gap-2 flex-wrap">
          {(["PROPIETARIO", "INQUILINO", "COMPRADOR"] as RolContacto[]).map((r) => {
            const cfg = ROL_CFG[r]; const active = form.roles.includes(r);
            return (
              <button key={r} type="button" onClick={() => toggleRol(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
                style={{ background: active ? cfg.bg : "#FAFAF8", color: active ? cfg.text : "#6a6a6a", borderColor: active ? cfg.text : "#D4D0CB" }}>
                <cfg.icon className="w-3.5 h-3.5" />{cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Nombre *</label>
          <input className={inp} style={inpStyle} value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} />
        </div>
        <div>
          <label className={lbl}>DNI</label>
          <input className={inp} style={inpStyle} value={form.dni} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))} />
        </div>
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
        <div className="col-span-2">
          <label className={lbl}>Domicilio</label>
          <input className={inp} style={inpStyle} value={form.domicilio} onChange={(e) => setForm((p) => ({ ...p, domicilio: e.target.value }))} />
        </div>
        <div>
          <label className={lbl}>Teléfono</label>
          <input className={inp} style={inpStyle} value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} />
        </div>
        <div>
          <label className={lbl}>Email</label>
          <input type="email" className={inp} style={inpStyle} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Ocupación</label>
          <input className={inp} style={inpStyle} value={form.ocupacion} onChange={(e) => setForm((p) => ({ ...p, ocupacion: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Notas internas</label>
          <textarea rows={3} className={inp + " resize-none"} style={inpStyle} value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: "#D4D0CB" }}>Cancelar</button>
        <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#1B4332" }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContactoDetalle({ contacto: initial }: { contacto: ContactoFull }) {
  const router = useRouter();
  const [contacto, setContacto] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [docs, setDocs] = useState<DocItem[]>(initial.documentos);
  const [garanteDocs, setGaranteDocs] = useState<DocItem[]>(initial.garante?.documentos ?? []);

  const handleSave = useCallback((updated: Partial<ContactoFull>) => {
    setContacto((p) => ({ ...p, ...updated }));
    setEditing(false);
  }, []);

  const handleGaranteChange = useCallback((g: GaranteData) => {
    setContacto((p) => ({ ...p, garante: { ...g, documentos: garanteDocs } }));
  }, [garanteDocs]);

  const fmtRoles = contacto.roles.map((r) => ROL_CFG[r].label).join(", ");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-surface-raised transition-colors text-text-muted">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-white"
            style={{ background: contacto.roles[0] ? ROL_CFG[contacto.roles[0]].text : "#1B4332" }}
          >
            {contacto.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{contacto.nombre}</h1>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {contacto.roles.map((r) => (
                <span key={r} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: ROL_CFG[r].bg, color: ROL_CFG[r].text }}>
                  {ROL_CFG[r].label}
                </span>
              ))}
            </div>
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-outline text-sm flex items-center gap-2">
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {editing ? (
            <EditForm contacto={contacto} onSave={handleSave} onCancel={() => setEditing(false)} />
          ) : (
            <SectionCard title="Datos personales">
              <div className="space-y-3">
                {contacto.dni && <DataRow icon={FileText} label="DNI" value={contacto.dni} />}
                {contacto.fechaNacimiento && <DataRow icon={Calendar} label="Fecha de nacimiento" value={fmtFecha(contacto.fechaNacimiento)} />}
                {contacto.estadoCivil && <DataRow icon={Users} label="Estado civil" value={contacto.estadoCivil} />}
                {contacto.domicilio && <DataRow icon={MapPin} label="Domicilio" value={contacto.domicilio} />}
                {contacto.telefono && <DataRow icon={Phone} label="Teléfono" value={contacto.telefono} />}
                {contacto.email && <DataRow icon={Mail} label="Email" value={contacto.email} />}
                {contacto.ocupacion && <DataRow icon={Briefcase} label="Ocupación" value={contacto.ocupacion} />}
                {!contacto.dni && !contacto.telefono && !contacto.email && !contacto.domicilio && (
                  <p className="text-sm text-text-muted">Sin datos adicionales registrados.</p>
                )}
              </div>
              {contacto.notas && (
                <div className="p-3 rounded-xl mt-2" style={{ background: "#FFFBEB" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Notas internas</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{contacto.notas}</p>
                </div>
              )}
            </SectionCard>
          )}

          <GaranteSection
            contactoId={contacto.id}
            garante={contacto.garante ? { ...contacto.garante, documentos: garanteDocs } : null}
            onGaranteChange={handleGaranteChange}
          />

          {/* Contratos vinculados */}
          {contacto.contratos.length > 0 && (
            <SectionCard title="Contratos vinculados">
              <div className="space-y-2">
                {contacto.contratos.map((cp) => (
                  <button
                    key={cp.id}
                    onClick={() => router.push(`/alquileres`)}
                    className="w-full text-left p-3 rounded-xl border transition-colors hover:border-brand-primary hover:bg-[#F0F7F4] group"
                    style={{ borderColor: "#E8E5E0" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-text-primary capitalize">{cp.rol} — {cp.contrato.propiedad.titulo}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{cp.contrato.propiedad.direccion}</p>
                      </div>
                      <ScrollText className="w-4 h-4 text-text-muted group-hover:text-brand-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right column — Documents */}
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Documentos del contacto</p>
            <DocUploader
              contactoId={contacto.id}
              ownerKind="contacto"
              docs={docs}
              onDocsChange={setDocs}
            />
          </div>

          {contacto.garante && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" style={{ color: "#1B4332" }} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Documentos del garante</p>
              </div>
              <DocUploader
                contactoId={contacto.id}
                garanteId={contacto.garante.id}
                ownerKind="garante"
                docs={garanteDocs}
                onDocsChange={setGaranteDocs}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
