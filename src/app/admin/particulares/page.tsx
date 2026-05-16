"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2, User, Eye, EyeOff, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Particular {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  createdAt: string;
  _count?: { propiedades: number };
}

export default function AdminParticulariesPage() {
  const [particulares, setParticulares] = useState<Particular[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    whatsapp: "",
  });

  async function load() {
    try {
      const res = await fetch("/api/particulares");
      if (res.ok) setParticulares((await res.json()).data ?? []);
    } catch {
      toast.error("Error al cargar particulares");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/particulares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al crear particular");
        return;
      }
      toast.success("Cuenta particular creada");
      setShowForm(false);
      setForm({ nombre: "", email: "", password: "", whatsapp: "" });
      load();
    } catch {
      toast.error("Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActivo(id: string, activo: boolean) {
    const res = await fetch(`/api/particulares/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !activo }),
    });
    if (res.ok) {
      toast.success(activo ? "Cuenta desactivada" : "Cuenta activada");
      load();
    } else {
      toast.error("Error al actualizar");
    }
  }

  const inp = "input-base w-full text-sm";
  const lbl = "block text-xs font-medium text-text-primary mb-1";

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Particulares</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Usuarios individuales con hasta 4 propiedades activas
          </p>
        </div>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo particular
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Nueva cuenta particular</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Nombre completo *</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Juan García"
                className={inp}
                required
              />
            </div>
            <div>
              <label className={lbl}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="juan@email.com"
                className={inp}
                required
              />
            </div>
            <div>
              <label className={lbl}>WhatsApp</label>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                placeholder="+54 3772 ..."
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Contraseña inicial *</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="mín. 8 caracteres"
                  className={`${inp} pr-10`}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-outline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear cuenta
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        </div>
      ) : particulares.length === 0 ? (
        <div className="card p-12 text-center">
          <User className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No hay cuentas particulares registradas</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear primera cuenta
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Usuario</th>
                <th className="text-center px-4 py-3 text-text-muted font-medium">Propiedades</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Registrado</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {particulares.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-surface-raised/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-brand-primary">
                          {p.nombre[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{p.nombre}</p>
                        <p className="text-xs text-text-muted">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-text-muted" />
                      <span className="font-price font-semibold text-text-primary">
                        {p._count?.propiedades ?? 0}
                      </span>
                      <span className="text-xs text-text-muted">/4</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.activo
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActivo(p.id, p.activo)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        p.activo
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {p.activo ? "Desactivar" : "Activar"}
                    </button>
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
