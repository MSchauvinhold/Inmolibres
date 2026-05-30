"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Save, CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ESTADO_INMOBILIARIA_LABELS, ESTADO_INMOBILIARIA_COLORS } from "@/lib/utils";

interface Inmobiliaria {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string;
  plan: string;
  estado: "ACTIVA" | "INACTIVA" | "PRUEBA" | "SUSPENDIDA";
  fechaVencimiento: string | null;
  _count: { usuarios: number; propiedades: number; clientes: number };
}

const PLANES = [
  { value: "BASICO",   label: "Básico" },
  { value: "AVANZADO", label: "Avanzado" },
  { value: "PRO",      label: "Pro" },
];

const ESTADOS = [
  { value: "ACTIVA",     label: "Activa" },
  { value: "PRUEBA",     label: "Prueba" },
  { value: "SUSPENDIDA", label: "Suspender" },
  { value: "INACTIVA",   label: "Inactivar" },
];

export default function AdminInmobiliariasPage() {
  const [inmobiliarias, setInmobiliarias] = useState<Inmobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Edit state per row: { [id]: { fechaVencimiento, plan } }
  const [edits, setEdits] = useState<Record<string, { fecha: string; plan: string }>>({});

  const [form, setForm] = useState({
    nombre: "", whatsapp: "", email: "", plan: "AVANZADO",
    adminNombre: "", adminEmail: "", adminPassword: "",
    fechaVencimiento: "",
  });

  async function load() {
    const res = await fetch("/api/inmobiliarias");
    if (res.ok) {
      const data = (await res.json()).data as Inmobiliaria[];
      setInmobiliarias(data);
      // Initialize edit state with current values
      const initial: Record<string, { fecha: string; plan: string }> = {};
      data.forEach((i) => {
        initial[i.id] = {
          fecha: i.fechaVencimiento ? i.fechaVencimiento.split("T")[0] : "",
          plan: i.plan,
        };
      });
      setEdits(initial);
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...form,
        fechaVencimiento: form.fechaVencimiento ? new Date(form.fechaVencimiento).toISOString() : undefined,
      };
      const res = await fetch("/api/inmobiliarias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json() as {
          error?: string;
          details?: { fieldErrors?: Record<string, string[]> };
        };
        // Mostrar qué campo(s) específicamente fallan
        const fieldErrors = json.details?.fieldErrors;
        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
          const LABELS: Record<string, string> = {
            nombre: "Nombre", whatsapp: "WhatsApp", email: "Email de la inmobiliaria",
            plan: "Plan", fechaVencimiento: "Vencimiento",
            adminNombre: "Nombre del admin", adminEmail: "Email del admin",
            adminPassword: "Contraseña",
          };
          const msgs = Object.entries(fieldErrors).map(
            ([campo, errs]) => `${LABELS[campo] ?? campo}: ${errs[0]}`
          );
          toast.error(msgs.join(" · "));
        } else {
          toast.error(json.error ?? "Error al crear");
        }
        return;
      }
      toast.success("Inmobiliaria creada");
      setShowForm(false);
      setForm({ nombre: "", whatsapp: "", email: "", plan: "AVANZADO", adminNombre: "", adminEmail: "", adminPassword: "", fechaVencimiento: "" });
      load();
    } catch { toast.error("Error inesperado"); }
    finally { setSubmitting(false); }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}" permanentemente? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/inmobiliarias/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Inmobiliaria eliminada"); load(); }
    else toast.error((await res.json()).error ?? "Error al eliminar");
  }

  async function guardarCambios(id: string) {
    setSavingId(id);
    const edit = edits[id];
    try {
      const res = await fetch(`/api/inmobiliarias/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: edit.plan,
          fechaVencimiento: edit.fecha ? new Date(edit.fecha + "T00:00:00").toISOString() : null,
        }),
      });
      if (res.ok) {
        toast.success("Suscripción actualizada");
        load();
      } else {
        toast.error("Error al guardar");
      }
    } catch { toast.error("Error inesperado"); }
    finally { setSavingId(null); }
  }

  async function cambiarEstado(id: string, estado: string) {
    const res = await fetch(`/api/inmobiliarias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) { toast.success("Estado actualizado"); load(); }
    else toast.error("Error al actualizar");
  }

  // Extender N días desde hoy o desde vencimiento actual (el que sea mayor)
  function extender(id: string, dias: number) {
    const inmo = inmobiliarias.find((i) => i.id === id);
    const base = inmo?.fechaVencimiento
      ? new Date(inmo.fechaVencimiento)
      : new Date();
    const desde = base > new Date() ? base : new Date();
    desde.setDate(desde.getDate() + dias);
    const newDate = desde.toISOString().split("T")[0];
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], fecha: newDate } }));
    toast.info(`Fecha ajustada a ${newDate} — guardá para confirmar`);
  }

  const inp = "input-base w-full text-sm";
  const lbl = "block text-xs font-medium text-text-primary mb-1";

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Inmobiliarias</h1>
        <button onClick={() => setShowForm((p) => !p)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva inmobiliaria
        </button>
      </div>

      {/* Form nueva inmobiliaria */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Nueva inmobiliaria + admin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["nombre",   "Nombre",   "Inmobiliaria XYZ"],
              ["whatsapp", "WhatsApp", "+54 3772..."],
              ["email",    "Email",    "contacto@inmo.com"],
            ].map(([k, l, ph]) => (
              <div key={k}>
                <label className={lbl}>{l} *</label>
                <input
                  value={(form as Record<string, string>)[k]}
                  onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                  placeholder={ph}
                  className={inp}
                  required
                />
              </div>
            ))}
            <div>
              <label className={lbl}>Plan</label>
              <select value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))} className={inp}>
                {PLANES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Vencimiento suscripción</label>
              <input type="date" value={form.fechaVencimiento} onChange={(e) => setForm((p) => ({ ...p, fechaVencimiento: e.target.value }))} className={inp} />
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-text-muted uppercase mb-3">Cuenta de Administrador</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[["adminNombre", "Nombre completo"], ["adminEmail", "Email"], ["adminPassword", "Contraseña (mín. 8 char)"]].map(([k, l]) => (
                <div key={k}>
                  <label className={lbl}>{l} *</label>
                  <input
                    type={k === "adminPassword" ? "password" : "text"}
                    value={(form as Record<string, string>)[k]}
                    onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                    className={inp}
                    required
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Crear
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Inmobiliaria</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Plan</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Estado</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Vencimiento suscripción</th>
                  <th className="text-center px-4 py-3 text-text-muted font-medium">Props.</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inmobiliarias.map((i) => {
                  const edit = edits[i.id] ?? { fecha: "", plan: i.plan };
                  const changed =
                    edit.plan !== i.plan ||
                    edit.fecha !== (i.fechaVencimiento ? i.fechaVencimiento.split("T")[0] : "");

                  return (
                    <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface-raised/50">
                      {/* Nombre */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{i.nombre}</p>
                        <p className="text-xs text-text-muted">{i.email}</p>
                      </td>

                      {/* Plan — editable inline */}
                      <td className="px-4 py-3">
                        <select
                          value={edit.plan}
                          onChange={(e) => setEdits((p) => ({ ...p, [i.id]: { ...edit, plan: e.target.value } }))}
                          className="text-xs border border-border rounded-lg px-2 py-1 bg-surface font-semibold"
                          style={{
                            color: edit.plan === "PRO" ? "#A0790A" : edit.plan === "AVANZADO" ? "#1D4ED8" : "#555",
                          }}
                        >
                          {PLANES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <select
                          value={i.estado}
                          onChange={(e) => cambiarEstado(i.id, e.target.value)}
                          className="text-xs border border-border rounded-lg px-2 py-1 bg-surface"
                        >
                          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                      </td>

                      {/* Fecha vencimiento — editable + botones rápidos */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <input
                              type="date"
                              value={edit.fecha}
                              onChange={(e) => setEdits((p) => ({ ...p, [i.id]: { ...edit, fecha: e.target.value } }))}
                              className="text-xs border border-border rounded-lg px-2 py-1 bg-surface text-text-secondary"
                            />
                          </div>
                          {/* Botones de extensión rápida */}
                          <div className="flex gap-1 flex-wrap">
                            {[30, 60, 90].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => extender(i.id, d)}
                                className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-surface-raised transition-colors text-text-muted"
                              >
                                +{d}d
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Propiedades */}
                      <td className="px-4 py-3 text-center font-price font-semibold">{i._count.propiedades}</td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Guardar cambios de plan/fecha */}
                          {changed && (
                            <button
                              onClick={() => guardarCambios(i.id)}
                              disabled={savingId === i.id}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-brand-primary text-white font-medium transition-opacity hover:opacity-90"
                            >
                              {savingId === i.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Save className="w-3 h-3" />}
                              Guardar
                            </button>
                          )}

                          {/* Eliminar (solo INACTIVA) */}
                          {i.estado === "INACTIVA" && (
                            <button
                              onClick={() => eliminar(i.id, i.nombre)}
                              className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                              title="Eliminar inmobiliaria"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
