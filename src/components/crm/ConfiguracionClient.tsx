"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Plus, Eye, EyeOff, UserCheck, UserX, AlertTriangle,
  Settings, Shield, ChevronDown, ChevronUp, ImageIcon, Upload, Trash2,
  Volume2, VolumeX, Lock, PenLine,
} from "lucide-react";
import { formatDate, ESTADO_INMOBILIARIA_LABELS, ESTADO_INMOBILIARIA_COLORS } from "@/lib/utils";
import { puedeAgregarAgente, toPlanKey, LIMITES_PLAN } from "@/lib/planes";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { PermisosSheet } from "./PermisosSheet";
import { FirmaCanvas } from "./FirmaCanvas";

interface PermisosAgente {
  verPropiedades: boolean;
  editarPropiedades: boolean;
  verClientes: boolean;
  editarClientes: boolean;
  verVisitas: boolean;
  editarVisitas: boolean;
  verAlquileres: boolean;
  editarAlquileres: boolean;
  verConsultas: boolean;
  verCalculadoras: boolean;
  verFinanzas: boolean;
  verDocumentos: boolean;
  verReportes: boolean;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  comisionPersonalPct: number | null;
  permisos: PermisosAgente | null;
}

interface Inmobiliaria {
  id: string;
  nombre: string;
  whatsapp: string;
  email: string;
  plan: string;
  estado: "ACTIVA" | "INACTIVA" | "PRUEBA" | "SUSPENDIDA";
  fechaVencimiento: string | null;
  logoUrl: string | null;
  firmaUrl: string | null;
  usuarios: Usuario[];
  _count: { propiedades: number; clientes: number };
}

interface Config {
  id: string;
  comisionVendedorPct: number;
  comisionCompradorPct: number;
  comisionAlquilerMeses: number;
  comisionAgentePct: number;
  comisionInmobPct: number;
  ivaIncluido: boolean;
  monedaPreferida: "ARS" | "USD";
  colorPrimario: string;
  colorSecundario: string;
  logoEnContrato: boolean;
  clausulasAdicionales: string | null;
  piePaginaContrato: string | null;
  cuit: string | null;
  razonSocial: string | null;
  domicilioLegal: string | null;
  matriculaCorredora: string | null;
}

interface Props {
  inmobiliaria: Inmobiliaria;
  isAdmin: boolean;
  diasRestantes: number | null;
  config: Config;
}

const SLIDER_MAX = 10;

export function ConfiguracionClient({ inmobiliaria: initial, isAdmin, diasRestantes, config: initialConfig }: Props) {
  const [inmo, setInmo] = useState(initial);
  const [editingWa, setEditingWa] = useState(false);
  const [whatsappVal, setWhatsappVal] = useState(initial.whatsapp);
  const [savingWa, setSavingWa] = useState(false);

  const [showNewAgent, setShowNewAgent] = useState(false);
  const [agentForm, setAgentForm] = useState({ nombre: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [config, setConfig] = useState(initialConfig);
  const [savingConfig, setSavingConfig] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const [permisosAgentId, setPermisosAgentId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [sonidoActivo, setSonidoActivo] = useState(true);

  // Leer preferencia de sonido del localStorage al montar
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setSonidoActivo(localStorage.getItem("inmolibres_sonido_notif") !== "false");
  }, []);
  const [logoProgress, setLogoProgress] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const agentes = inmo.usuarios.filter((u) => u.rol === "AGENTE");
  const planKey = toPlanKey(inmo.plan);
  const maxAgentes = LIMITES_PLAN[planKey].maxAgentes;
  const canAddAgent = puedeAgregarAgente(planKey, agentes.filter((a) => a.activo).length);

  const inp = "input-base w-full text-sm";
  const lbl = "block text-xs font-medium text-text-primary mb-1";

  async function saveWhatsApp() {
    if (!whatsappVal.trim()) return;
    setSavingWa(true);
    try {
      const res = await fetch(`/api/inmobiliarias/${inmo.id}/whatsapp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: whatsappVal }),
      });
      if (!res.ok) throw new Error();
      setInmo((p) => ({ ...p, whatsapp: whatsappVal }));
      setEditingWa(false);
      toast.success("WhatsApp actualizado");
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSavingWa(false);
    }
  }

  async function crearAgente(e: React.FormEvent) {
    e.preventDefault();
    if (agentForm.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setSavingAgent(true);
    try {
      const res = await fetch(`/api/inmobiliarias/${inmo.id}/agentes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentForm),
      });
      const data = (await res.json()) as { error?: string; data?: Usuario };
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear agente");
        return;
      }
      setInmo((p) => ({ ...p, usuarios: [...p.usuarios, data.data!] }));
      setAgentForm({ nombre: "", email: "", password: "" });
      setShowNewAgent(false);
      toast.success(`Agente ${data.data!.nombre} creado`);
    } catch {
      toast.error("Error inesperado");
    } finally {
      setSavingAgent(false);
    }
  }

  async function toggleAgente(id: string, activo: boolean) {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/inmobiliarias/${inmo.id}/agentes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !activo }),
      });
      if (!res.ok) throw new Error();
      setInmo((p) => ({
        ...p,
        usuarios: p.usuarios.map((u) => u.id === id ? { ...u, activo: !activo } : u),
      }));
      toast.success(activo ? "Agente desactivado" : "Agente activado");
    } catch {
      toast.error("Error al actualizar agente");
    } finally {
      setTogglingId(null);
    }
  }

  async function saveConfig(patch: Partial<Config>) {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { data?: Config; error?: string };
      if (!res.ok) throw new Error(data.error);
      setConfig((p) => ({ ...p, ...data.data }));
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSavingConfig(false);
    }
  }

  async function saveComisionAgente(agentId: string, pct: number | null) {
    try {
      const res = await fetch(`/api/inmobiliarias/${inmo.id}/agentes/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comisionPersonalPct: pct }),
      });
      if (!res.ok) throw new Error();
      setInmo((p) => ({
        ...p,
        usuarios: p.usuarios.map((u) =>
          u.id === agentId ? { ...u, comisionPersonalPct: pct } : u
        ),
      }));
      toast.success("Comisión actualizada");
    } catch {
      toast.error("Error al guardar comisión");
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setLogoProgress(0);
    try {
      const result = await uploadToCloudinary(file, "logos", setLogoProgress);
      const res = await fetch("/api/configuracion/logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: result.secure_url }),
      });
      if (!res.ok) throw new Error();
      setInmo((p) => ({ ...p, logoUrl: result.secure_url }));
      toast.success("Logo subido correctamente");
    } catch {
      toast.error("Error al subir el logo");
    } finally {
      setUploadingLogo(false);
      setLogoProgress(0);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    try {
      const res = await fetch("/api/configuracion/logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: null }),
      });
      if (!res.ok) throw new Error();
      setInmo((p) => ({ ...p, logoUrl: null }));
      setConfig((p) => ({ ...p, logoEnContrato: false }));
      toast.success("Logo eliminado");
    } catch {
      toast.error("Error al eliminar el logo");
    }
  }

  const suscripcionColor =
    diasRestantes === null ? "" :
    diasRestantes <= 2 ? "text-danger" :
    diasRestantes <= 7 ? "text-warning" :
    "text-success";

  const barPct = diasRestantes !== null && diasRestantes > 0
    ? Math.min(100, Math.round((diasRestantes / 365) * 100))
    : 0;

  function SectionHeader({ id, title, icon: Icon }: { id: string; title: string; icon: React.ElementType }) {
    const open = openSection === id;
    return (
      <button
        onClick={() => setOpenSection(open ? null : id)}
        className="flex items-center justify-between w-full border-b border-border pb-2"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-muted" />
          <h2 className="font-semibold text-text-primary">{title}</h2>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>
    );
  }

  return (
    <div className="w-full max-w-[860px] mx-auto space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Configuración</h1>

      {/* Alerta suscripción */}
      {diasRestantes !== null && diasRestantes <= 7 && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          diasRestantes <= 2 ? "bg-danger/10 border-danger/30" : "bg-warning/10 border-warning/30"
        }`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 ${diasRestantes <= 2 ? "text-danger" : "text-warning"}`} />
          <p className="text-sm font-medium text-text-primary">
            {diasRestantes <= 0
              ? "La suscripción está vencida. Contactá al administrador."
              : `La suscripción vence en ${diasRestantes} día${diasRestantes > 1 ? "s" : ""}. Contactá al administrador para renovar.`}
          </p>
        </div>
      )}

      {/* Datos de la inmobiliaria */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-text-primary border-b border-border pb-2">Datos de la inmobiliaria</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-muted text-xs mb-0.5">Nombre</p>
            <p className="font-medium text-text-primary">{inmo.nombre}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-0.5">Plan</p>
            <p className="font-medium text-text-primary">{inmo.plan}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-0.5">Estado</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_INMOBILIARIA_COLORS[inmo.estado]}`}>
              {ESTADO_INMOBILIARIA_LABELS[inmo.estado]}
            </span>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-0.5">Email</p>
            <p className="font-medium text-text-primary">{inmo.email}</p>
          </div>
          <div className="col-span-2">
            <p className="text-text-muted text-xs mb-0.5">WhatsApp</p>
            {editingWa ? (
              <div className="flex gap-2">
                <input
                  value={whatsappVal}
                  onChange={(e) => setWhatsappVal(e.target.value)}
                  className={inp}
                  placeholder="+54 3772 ..."
                />
                <button onClick={saveWhatsApp} disabled={savingWa} className="btn-primary text-sm flex items-center gap-1">
                  {savingWa && <Loader2 className="w-3 h-3 animate-spin" />}Guardar
                </button>
                <button onClick={() => { setEditingWa(false); setWhatsappVal(inmo.whatsapp); }} className="btn-outline text-sm">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="font-medium text-text-primary">{inmo.whatsapp}</p>
                {isAdmin && (
                  <button onClick={() => setEditingWa(true)} className="text-xs text-brand-primary hover:underline">
                    Editar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Logo */}
          <div className="col-span-2 pt-1 border-t border-border">
            <p className="text-text-muted text-xs mb-3">Logo de la inmobiliaria</p>
            <div className="flex items-center gap-5">
              {/* Preview */}
              {inmo.logoUrl ? (
                <img
                  src={inmo.logoUrl}
                  alt="Logo"
                  className="w-20 h-20 object-contain rounded-xl border border-border bg-surface"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 bg-surface-raised shrink-0">
                  <ImageIcon className="w-5 h-5 text-text-muted" />
                  <span className="text-[10px] text-text-muted">Sin logo</span>
                </div>
              )}

              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={uploadLogo}
                  />
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 disabled:opacity-60"
                  >
                    {uploadingLogo
                      ? <><Loader2 className="w-3 h-3 animate-spin" />{logoProgress}%</>
                      : <><Upload className="w-3 h-3" />{inmo.logoUrl ? "Cambiar logo" : "Subir logo"}</>
                    }
                  </button>
                  {inmo.logoUrl && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="flex items-center gap-1.5 text-xs text-danger hover:underline"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar logo
                    </button>
                  )}
                  <p className="text-[10px] text-text-muted">PNG, JPG, WebP o SVG</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suscripción */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-text-primary border-b border-border pb-2">Suscripción</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted mb-0.5">Vencimiento</p>
            <p className="font-medium text-text-primary">
              {inmo.fechaVencimiento ? formatDate(inmo.fechaVencimiento) : "Sin fecha"}
            </p>
          </div>
          {diasRestantes !== null && (
            <p className={`font-semibold text-sm ${suscripcionColor}`}>
              {diasRestantes <= 0 ? "Vencida" : `${diasRestantes} días restantes`}
            </p>
          )}
        </div>
        {diasRestantes !== null && diasRestantes > 0 && (
          <div className="w-full h-2 bg-surface-raised rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                diasRestantes <= 7 ? "bg-danger" : diasRestantes <= 30 ? "bg-warning" : "bg-success"
              }`}
              style={{ width: `${barPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Preferencias */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-text-primary border-b border-border pb-2">Preferencias</h2>
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            {sonidoActivo
              ? <Volume2 className="w-4 h-4" style={{ color: "var(--antracita-500)" }} />
              : <VolumeX className="w-4 h-4" style={{ color: "var(--antracita-300)" }} />
            }
            <div>
              <p className="text-sm font-medium text-text-primary">Sonido de notificaciones</p>
              <p className="text-xs text-text-muted">
                Reproducir sonido al recibir nuevas notificaciones
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const nuevo = !sonidoActivo;
              setSonidoActivo(nuevo);
              localStorage.setItem("inmolibres_sonido_notif", nuevo ? "true" : "false");
            }}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            style={{
              background: sonidoActivo ? "var(--terracota-500, #C1694F)" : "var(--antracita-200, #C5BDB4)",
            }}
            aria-label="Toggle sonido de notificaciones"
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
              style={{ transform: sonidoActivo ? "translateX(22px)" : "translateX(4px)" }}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center">
          <p className="font-price text-3xl font-bold text-brand-primary">{inmo._count.propiedades}</p>
          <p className="text-sm text-text-muted mt-1">Propiedades</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-price text-3xl font-bold text-brand-primary">{inmo._count.clientes}</p>
          <p className="text-sm text-text-muted mt-1">Clientes</p>
        </div>
      </div>

      {/* ─── COMISIONES (solo ADMIN) ─── */}
      {isAdmin && (
        <div className="card p-5 space-y-4">
          <SectionHeader id="comisiones" title="Comisiones" icon={Settings} />
          {openSection === "comisiones" && (
            <div className="space-y-5 pt-1">
              {/* Vendedor */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Comisión vendedor
                  </label>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "var(--brand-primary)", fontFamily: "var(--font-mono)" }}>
                    {config.comisionVendedorPct}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={SLIDER_MAX} step={0.5}
                  value={config.comisionVendedorPct}
                  onChange={(e) => setConfig((p) => ({ ...p, comisionVendedorPct: Number(e.target.value) }))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${config.comisionVendedorPct * 10}%, var(--border) ${config.comisionVendedorPct * 10}%, var(--border) 100%)`,
                    accentColor: "var(--brand-primary)",
                  }}
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>0%</span><span>5%</span><span>10%</span></div>
              </div>

              {/* Comprador */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Comisión comprador
                  </label>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "var(--brand-primary)", fontFamily: "var(--font-mono)" }}>
                    {config.comisionCompradorPct}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={SLIDER_MAX} step={0.5}
                  value={config.comisionCompradorPct}
                  onChange={(e) => setConfig((p) => ({ ...p, comisionCompradorPct: Number(e.target.value) }))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${config.comisionCompradorPct * 10}%, var(--border) ${config.comisionCompradorPct * 10}%, var(--border) 100%)`,
                    accentColor: "var(--brand-primary)",
                  }}
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>0%</span><span>5%</span><span>10%</span></div>
              </div>

              {/* Alquiler */}
              <div>
                <label className={lbl}>Comisión alquiler (meses)</label>
                <div className="flex gap-2">
                  {[0.5, 1, 1.5, 2].map((v) => (
                    <button
                      key={v}
                      onClick={() => setConfig((p) => ({ ...p, comisionAlquilerMeses: v }))}
                      className="flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors"
                      style={{
                        background: config.comisionAlquilerMeses === v ? "var(--brand-primary)" : "var(--surface)",
                        color: config.comisionAlquilerMeses === v ? "white" : "var(--text-muted)",
                        borderColor: config.comisionAlquilerMeses === v ? "var(--brand-primary)" : "var(--border)",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distribución interna */}
              <div>
                <label className={lbl}>Distribución de comisión</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-text-muted mb-1">% Inmobiliaria</p>
                    <input
                      type="number" min={0} max={100} step={1}
                      value={config.comisionInmobPct}
                      onChange={(e) => {
                        const v = Math.min(100, Math.max(0, Number(e.target.value)));
                        setConfig((p) => ({ ...p, comisionInmobPct: v, comisionAgentePct: 100 - v }));
                      }}
                      className={inp}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted mb-1">% Agente</p>
                    <input
                      type="number" min={0} max={100} step={1}
                      value={config.comisionAgentePct}
                      onChange={(e) => {
                        const v = Math.min(100, Math.max(0, Number(e.target.value)));
                        setConfig((p) => ({ ...p, comisionAgentePct: v, comisionInmobPct: 100 - v }));
                      }}
                      className={inp}
                    />
                  </div>
                </div>
              </div>

              {/* IVA */}
              <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                <div>
                  <p className="text-sm font-medium text-text-primary">IVA incluido por defecto (21%)</p>
                  <p className="text-xs text-text-muted">Se pre-carga en la calculadora de comisiones</p>
                </div>
                <button
                  onClick={() => setConfig((p) => ({ ...p, ivaIncluido: !p.ivaIncluido }))}
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{ background: config.ivaIncluido ? "var(--brand-primary)" : "var(--border)" }}
                  role="switch" aria-checked={config.ivaIncluido}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: config.ivaIncluido ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              <button
                onClick={() => saveConfig({
                  comisionVendedorPct: config.comisionVendedorPct,
                  comisionCompradorPct: config.comisionCompradorPct,
                  comisionAlquilerMeses: config.comisionAlquilerMeses,
                  comisionAgentePct: config.comisionAgentePct,
                  comisionInmobPct: config.comisionInmobPct,
                  ivaIncluido: config.ivaIncluido,
                })}
                disabled={savingConfig}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {savingConfig && <Loader2 className="w-3 h-3 animate-spin" />}
                Guardar comisiones
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── DATOS LEGALES (solo ADMIN) ─── */}
      {isAdmin && (
        <div className="card p-5 space-y-4">
          <SectionHeader id="legal" title="Datos legales" icon={Shield} />
          {openSection === "legal" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>CUIT</label>
                  <input
                    value={config.cuit ?? ""}
                    onChange={(e) => setConfig((p) => ({ ...p, cuit: e.target.value }))}
                    className={inp} placeholder="20-12345678-9"
                  />
                </div>
                <div>
                  <label className={lbl}>Razón social</label>
                  <input
                    value={config.razonSocial ?? ""}
                    onChange={(e) => setConfig((p) => ({ ...p, razonSocial: e.target.value }))}
                    className={inp} placeholder="Inmobiliaria SRL"
                  />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Domicilio legal</label>
                  <input
                    value={config.domicilioLegal ?? ""}
                    onChange={(e) => setConfig((p) => ({ ...p, domicilioLegal: e.target.value }))}
                    className={inp} placeholder="Av. San Martín 123, Paso de los Libres"
                  />
                </div>
                <div>
                  <label className={lbl}>Matrícula corredora</label>
                  <input
                    value={config.matriculaCorredora ?? ""}
                    onChange={(e) => setConfig((p) => ({ ...p, matriculaCorredora: e.target.value }))}
                    className={inp} placeholder="Nº de matrícula"
                  />
                </div>
              </div>
              <button
                onClick={() => saveConfig({
                  cuit: config.cuit,
                  razonSocial: config.razonSocial,
                  domicilioLegal: config.domicilioLegal,
                  matriculaCorredora: config.matriculaCorredora,
                })}
                disabled={savingConfig}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {savingConfig && <Loader2 className="w-3 h-3 animate-spin" />}
                Guardar datos legales
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── IDENTIDAD VISUAL CONTRATOS (solo ADMIN) ─── */}
      {isAdmin && (
        <div className="card p-5 space-y-4">
          <SectionHeader id="visual" title="Identidad visual para contratos" icon={Settings} />
          {openSection === "visual" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Color primario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.colorPrimario}
                      onChange={(e) => setConfig((p) => ({ ...p, colorPrimario: e.target.value }))}
                      className="w-10 h-9 rounded-lg border border-border cursor-pointer p-0.5"
                    />
                    <input
                      value={config.colorPrimario}
                      onChange={(e) => setConfig((p) => ({ ...p, colorPrimario: e.target.value }))}
                      className={`${inp} font-mono text-xs`}
                      placeholder="#1B4332"
                    />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Color secundario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.colorSecundario}
                      onChange={(e) => setConfig((p) => ({ ...p, colorSecundario: e.target.value }))}
                      className="w-10 h-9 rounded-lg border border-border cursor-pointer p-0.5"
                    />
                    <input
                      value={config.colorSecundario}
                      onChange={(e) => setConfig((p) => ({ ...p, colorSecundario: e.target.value }))}
                      className={`${inp} font-mono text-xs`}
                      placeholder="#2C2C2C"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle: logo en contratos */}
              {inmo.logoUrl && (
                <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Incluir logo en contratos</p>
                    <p className="text-xs text-text-muted">Aparecerá en el encabezado del contrato PDF</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, logoEnContrato: !p.logoEnContrato }))}
                    className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                    style={{ background: config.logoEnContrato ? "var(--brand-primary)" : "var(--border)" }}
                    role="switch"
                    aria-checked={config.logoEnContrato}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      style={{ transform: config.logoEnContrato ? "translateX(20px)" : "translateX(0)" }}
                    />
                  </button>
                </div>
              )}

              {/* Preview contrato */}
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="p-4 flex items-center gap-3" style={{ background: config.colorPrimario }}>
                  {config.logoEnContrato && inmo.logoUrl && (
                    <img src={inmo.logoUrl} alt="Logo" className="h-8 object-contain shrink-0" />
                  )}
                  <div className="text-white font-bold text-lg">InmoLibres</div>
                  <div className="h-5 w-px bg-white/40" />
                  <div className="text-white/80 text-sm">{inmo.nombre}</div>
                </div>
                <div className="p-4 bg-surface-raised">
                  <p className="text-xs text-text-muted">Vista previa del encabezado del contrato</p>
                </div>
              </div>

              <div>
                <label className={lbl}>Cláusulas adicionales</label>
                <textarea
                  value={config.clausulasAdicionales ?? ""}
                  onChange={(e) => setConfig((p) => ({ ...p, clausulasAdicionales: e.target.value }))}
                  className={`${inp} min-h-[80px] resize-y`}
                  placeholder="Cláusulas que se agregarán al contrato PDF..."
                  rows={3}
                />
              </div>
              <div>
                <label className={lbl}>Pie de página del contrato</label>
                <input
                  value={config.piePaginaContrato ?? ""}
                  onChange={(e) => setConfig((p) => ({ ...p, piePaginaContrato: e.target.value }))}
                  className={inp}
                  placeholder="Firma digital válida según Ley 25.506"
                />
              </div>

              <button
                onClick={() => saveConfig({
                  colorPrimario: config.colorPrimario,
                  colorSecundario: config.colorSecundario,
                  logoEnContrato: config.logoEnContrato,
                  clausulasAdicionales: config.clausulasAdicionales,
                  piePaginaContrato: config.piePaginaContrato,
                })}
                disabled={savingConfig}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {savingConfig && <Loader2 className="w-3 h-3 animate-spin" />}
                Guardar identidad visual
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── FIRMA DIGITAL ─── */}
      {isAdmin && (
        <div className="card p-5 space-y-4">
          <SectionHeader id="firma" title="Firma digital" icon={PenLine} />
          {openSection === "firma" && (
            <div className="pt-1">
              <FirmaCanvas
                inmobiliariaId={inmo.id}
                firmaActual={inmo.firmaUrl ?? null}
                onGuardada={(url) => setInmo((p) => ({ ...p, firmaUrl: url }))}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── EQUIPO Y PERMISOS ─── */}
      {isAdmin && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-text-primary">
              Equipo ({inmo.usuarios.length} usuarios · {agentes.filter((a) => a.activo).length}/{maxAgentes} agentes)
            </h2>
            {canAddAgent && !showNewAgent && (
              <button
                onClick={() => setShowNewAgent(true)}
                className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3"
              >
                <Plus className="w-3 h-3" /> Agregar agente
              </button>
            )}
          </div>

          {showNewAgent && (
            <form onSubmit={crearAgente} className="space-y-3 p-3 rounded-xl bg-surface-raised">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Nuevo agente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Nombre *</label>
                  <input
                    value={agentForm.nombre}
                    onChange={(e) => setAgentForm((p) => ({ ...p, nombre: e.target.value }))}
                    className={inp} placeholder="Nombre completo" required
                  />
                </div>
                <div>
                  <label className={lbl}>Email *</label>
                  <input
                    type="email" value={agentForm.email}
                    onChange={(e) => setAgentForm((p) => ({ ...p, email: e.target.value }))}
                    className={inp} placeholder="agente@email.com" required
                  />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Contraseña inicial *</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} value={agentForm.password}
                      onChange={(e) => setAgentForm((p) => ({ ...p, password: e.target.value }))}
                      className={`${inp} pr-10`} placeholder="mín. 8 caracteres"
                      required minLength={8}
                    />
                    <button type="button" onClick={() => setShowPass((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNewAgent(false)} className="btn-outline text-sm">Cancelar</button>
                <button type="submit" disabled={savingAgent} className="btn-primary text-sm flex items-center gap-1.5">
                  {savingAgent && <Loader2 className="w-3 h-3 animate-spin" />}Crear agente
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {inmo.usuarios.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{u.nombre}</p>
                    {!u.activo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Inactivo</span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{u.email} · {u.rol}</p>

                  {/* Comisión personal del agente */}
                  {u.rol === "AGENTE" && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-text-muted">Comisión personal:</span>
                      <AgentComisionInput
                        value={u.comisionPersonalPct}
                        defaultPct={config.comisionAgentePct}
                        onSave={(pct) => saveComisionAgente(u.id, pct)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {u.rol === "AGENTE" && (
                    <>
                      <button
                        onClick={() => setPermisosAgentId(u.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-surface-raised hover:bg-border transition-colors text-text-secondary"
                      >
                        Permisos
                      </button>
                      <button
                        onClick={() => toggleAgente(u.id, u.activo)}
                        disabled={togglingId === u.id}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          u.activo ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {togglingId === u.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : u.activo ? (
                          <UserX className="w-3 h-3" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CAMBIAR CONTRASEÑA ─── */}
      <CambiarPasswordSection />

      {/* Sheet de permisos */}
      {permisosAgentId && (
        <PermisosSheet
          agentId={permisosAgentId}
          inmobiliariaId={inmo.id}
          agentName={inmo.usuarios.find((u) => u.id === permisosAgentId)?.nombre ?? ""}
          initialPermisos={inmo.usuarios.find((u) => u.id === permisosAgentId)?.permisos ?? null}
          onClose={() => setPermisosAgentId(null)}
          onSave={(permisos) => {
            setInmo((p) => ({
              ...p,
              usuarios: p.usuarios.map((u) =>
                u.id === permisosAgentId ? { ...u, permisos } : u
              ),
            }));
            setPermisosAgentId(null);
          }}
        />
      )}
    </div>
  );
}

function CambiarPasswordSection() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [saving, setSaving] = useState(false);

  const inp = "input-base w-full text-sm pr-10";
  const lbl = "block text-xs font-medium text-text-primary mb-1";

  // Validación cliente en tiempo real
  const errores: string[] = [];
  if (nueva && nueva.length < 8) errores.push("Mínimo 8 caracteres");
  if (nueva && !/[A-Z]/.test(nueva)) errores.push("Al menos 1 mayúscula");
  if (nueva && !/[0-9]/.test(nueva)) errores.push("Al menos 1 número");
  if (confirmar && nueva !== confirmar) errores.push("Las contraseñas no coinciden");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (errores.length > 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva, confirmar }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Error al cambiar la contraseña");
        return;
      }
      toast.success("Contraseña actualizada correctamente");
      setActual(""); setNueva(""); setConfirmar("");
    } catch {
      toast.error("Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--crema-100)" }}>
          <Lock className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">Cambiar contraseña</p>
          <p className="text-xs text-text-muted">Mínimo 8 caracteres, 1 mayúscula y 1 número</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Contraseña actual */}
          <div>
            <label className={lbl}>Contraseña actual</label>
            <div className="relative">
              <input
                type={showActual ? "text" : "password"}
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className={inp}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowActual((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                tabIndex={-1}
              >
                {showActual ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className={lbl}>Nueva contraseña</label>
            <div className="relative">
              <input
                type={showNueva ? "text" : "password"}
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                className={inp}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNueva((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                tabIndex={-1}
              >
                {showNueva ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirmar */}
          <div>
            <label className={lbl}>Confirmar contraseña</label>
            <div className="relative">
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className={inp}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        {/* Errores de validación */}
        {errores.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {errores.map((e) => (
              <li key={e} className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "var(--danger-100)", color: "var(--danger-500)" }}>
                <AlertTriangle className="w-3 h-3 shrink-0" /> {e}
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          disabled={saving || errores.length > 0 || !actual || !nueva || !confirmar}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Actualizar contraseña
        </button>
      </form>
    </div>
  );
}

function AgentComisionInput({
  value, defaultPct, onSave,
}: { value: number | null; defaultPct: number; onSave: (pct: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[10px] underline text-brand-primary"
      >
        {value != null ? `${value}%` : `default (${defaultPct}%)`}
      </button>
    );
  }

  async function handle() {
    setSaving(true);
    const parsed = val.trim() === "" ? null : Number(val);
    await onSave(parsed);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min={0} max={100} step={0.5}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-16 px-2 py-0.5 text-xs rounded-lg border border-border bg-surface"
        placeholder={`${defaultPct}`}
        autoFocus
      />
      <span className="text-[10px] text-text-muted">%</span>
      <button onClick={handle} disabled={saving} className="text-[10px] text-brand-primary font-medium">
        {saving ? "..." : "OK"}
      </button>
      <button onClick={() => setEditing(false)} className="text-[10px] text-text-muted">✕</button>
    </div>
  );
}
