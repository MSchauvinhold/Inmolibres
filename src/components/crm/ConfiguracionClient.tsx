"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Eye, EyeOff, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { formatDate, ESTADO_INMOBILIARIA_LABELS, ESTADO_INMOBILIARIA_COLORS } from "@/lib/utils";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

interface Inmobiliaria {
  id: string;
  nombre: string;
  whatsapp: string;
  email: string;
  plan: string;
  estado: "ACTIVA" | "INACTIVA" | "PRUEBA" | "SUSPENDIDA";
  fechaVencimiento: string | null;
  usuarios: Usuario[];
  _count: { propiedades: number; clientes: number };
}

interface Props {
  inmobiliaria: Inmobiliaria;
  isAdmin: boolean;
  diasRestantes: number | null;
}

export function ConfiguracionClient({ inmobiliaria: initial, isAdmin, diasRestantes }: Props) {
  const [inmo, setInmo] = useState(initial);
  const [editingWa, setEditingWa] = useState(false);
  const [whatsappVal, setWhatsappVal] = useState(initial.whatsapp);
  const [savingWa, setSavingWa] = useState(false);

  const [showNewAgent, setShowNewAgent] = useState(false);
  const [agentForm, setAgentForm] = useState({ nombre: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const agentes = inmo.usuarios.filter((u) => u.rol === "AGENTE");
  const canAddAgent = agentes.length < 3;

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
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear agente");
        return;
      }
      setInmo((p) => ({ ...p, usuarios: [...p.usuarios, data.data] }));
      setAgentForm({ nombre: "", email: "", password: "" });
      setShowNewAgent(false);
      toast.success(`Agente ${data.data.nombre} creado`);
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

  const suscripcionColor =
    diasRestantes === null ? "" :
    diasRestantes <= 2 ? "text-danger" :
    diasRestantes <= 7 ? "text-warning" :
    "text-success";

  const barPct = diasRestantes !== null && diasRestantes > 0
    ? Math.min(100, Math.round((diasRestantes / 365) * 100))
    : 0;

  const inp = "input-base w-full text-sm";
  const lbl = "block text-xs font-medium text-text-primary mb-1";

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Configuración</h1>

      {/* Alerta suscripción próxima a vencer */}
      {diasRestantes !== null && diasRestantes <= 7 && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          diasRestantes <= 2
            ? "bg-danger/10 border-danger/30"
            : "bg-warning/10 border-warning/30"
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
        <h2 className="font-semibold text-text-primary border-b border-border pb-2">
          Datos de la inmobiliaria
        </h2>
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

          {/* WhatsApp editable */}
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
                <button
                  onClick={saveWhatsApp}
                  disabled={savingWa}
                  className="btn-primary text-sm flex items-center gap-1"
                >
                  {savingWa && <Loader2 className="w-3 h-3 animate-spin" />}
                  Guardar
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
        </div>
      </div>

      {/* Suscripción */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-text-primary border-b border-border pb-2">
          Suscripción
        </h2>
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

      {/* Gestión de agentes — solo ADMIN */}
      {isAdmin && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-text-primary">
              Equipo ({inmo.usuarios.length} usuarios · {agentes.length}/3 agentes)
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

          {/* Form nuevo agente */}
          {showNewAgent && (
            <form onSubmit={crearAgente} className="space-y-3 p-3 rounded-xl bg-surface-raised">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Nuevo agente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Nombre *</label>
                  <input
                    value={agentForm.nombre}
                    onChange={(e) => setAgentForm((p) => ({ ...p, nombre: e.target.value }))}
                    className={inp}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div>
                  <label className={lbl}>Email *</label>
                  <input
                    type="email"
                    value={agentForm.email}
                    onChange={(e) => setAgentForm((p) => ({ ...p, email: e.target.value }))}
                    className={inp}
                    placeholder="agente@email.com"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Contraseña inicial *</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={agentForm.password}
                      onChange={(e) => setAgentForm((p) => ({ ...p, password: e.target.value }))}
                      className={`${inp} pr-10`}
                      placeholder="mín. 8 caracteres"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNewAgent(false)} className="btn-outline text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={savingAgent} className="btn-primary text-sm flex items-center gap-1.5">
                  {savingAgent && <Loader2 className="w-3 h-3 animate-spin" />}
                  Crear agente
                </button>
              </div>
            </form>
          )}

          {/* Lista de usuarios */}
          <div className="space-y-2">
            {inmo.usuarios.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{u.nombre}</p>
                    {!u.activo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{u.email} · {u.rol}</p>
                </div>
                {u.rol === "AGENTE" && (
                  <button
                    onClick={() => toggleAgente(u.id, u.activo)}
                    disabled={togglingId === u.id}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      u.activo
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
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
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
