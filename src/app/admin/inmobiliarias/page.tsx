"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Trash2 } from "lucide-react";
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

export default function AdminInmobiliariasPage() {
  const [inmobiliarias, setInmobiliarias] = useState<Inmobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nombre: "", whatsapp: "", email: "", plan: "AVANZADO",
    adminNombre: "", adminEmail: "", adminPassword: "",
    fechaVencimiento: "",
  });

  async function load() {
    const res = await fetch("/api/inmobiliarias");
    if (res.ok) setInmobiliarias((await res.json()).data);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { ...form, fechaVencimiento: form.fechaVencimiento ? new Date(form.fechaVencimiento).toISOString() : undefined };
      const res = await fetch("/api/inmobiliarias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error((await res.json()).error); return; }
      toast.success("Inmobiliaria creada");
      setShowForm(false);
      setForm({ nombre: "", whatsapp: "", email: "", plan: "AVANZADO", adminNombre: "", adminEmail: "", adminPassword: "", fechaVencimiento: "" });
      load();
    } catch { toast.error("Error inesperado"); }
    finally { setSubmitting(false); }
  }

  async function eliminarInmobiliaria(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}" permanentemente? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/inmobiliarias/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Inmobiliaria eliminada"); load(); }
    else toast.error((await res.json()).error ?? "Error al eliminar");
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

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Nueva inmobiliaria + admin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["nombre", "Nombre", "Inmobiliaria XYZ"],
              ["whatsapp", "WhatsApp", "+54 3772..."],
              ["email", "Email", "contacto@inmo.com"],
            ].map(([k, l, ph]) => (
              <div key={k}>
                <label className={lbl}>{l} *</label>
                <input value={(form as Record<string,string>)[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} placeholder={ph} className={inp} required />
              </div>
            ))}
            <div>
              <label className={lbl}>Plan</label>
              <select value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))} className={inp}>
                <option value="BASICO">Básico — Particulares</option>
                <option value="AVANZADO">Avanzado — CRM completo</option>
                <option value="PRO">Pro — Contratos + Finanzas</option>
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
              {[["adminNombre","Nombre completo"],["adminEmail","Email"],["adminPassword","Contraseña (mín. 8 char)"]].map(([k,l]) => (
                <div key={k}>
                  <label className={lbl}>{l} *</label>
                  <input type={k === "adminPassword" ? "password" : "text"} value={(form as Record<string,string>)[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} className={inp} required />
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

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Inmobiliaria</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Vencimiento</th>
                <th className="text-center px-4 py-3 text-text-muted font-medium">Propiedades</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {inmobiliarias.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface-raised/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{i.nombre}</p>
                    <p className="text-xs text-text-muted">{i.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: i.plan === "PRO"
                          ? "rgba(212,168,83,0.15)"
                          : i.plan === "AVANZADO"
                          ? "rgba(59,130,246,0.10)"
                          : "rgba(100,100,100,0.10)",
                        color: i.plan === "PRO"
                          ? "#A0790A"
                          : i.plan === "AVANZADO"
                          ? "#1D4ED8"
                          : "#555",
                      }}
                    >
                      {i.plan === "PRO" ? "Pro" : i.plan === "AVANZADO" ? "Avanzado" : i.plan === "BASICO" ? "Básico" : i.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_INMOBILIARIA_COLORS[i.estado]}`}>
                      {ESTADO_INMOBILIARIA_LABELS[i.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{i.fechaVencimiento ? formatDate(i.fechaVencimiento) : "—"}</td>
                  <td className="px-4 py-3 text-center font-price font-semibold">{i._count.propiedades}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue={i.estado}
                        onChange={(e) => cambiarEstado(i.id, e.target.value)}
                        className="text-xs border border-border rounded-lg px-2 py-1 bg-surface"
                      >
                        <option value="ACTIVA">Activar</option>
                        <option value="PRUEBA">Prueba</option>
                        <option value="SUSPENDIDA">Suspender</option>
                        <option value="INACTIVA">Inactivar</option>
                      </select>
                      {i.estado === "INACTIVA" && (
                        <button
                          onClick={() => eliminarInmobiliaria(i.id, i.nombre)}
                          className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                          title="Eliminar inmobiliaria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
