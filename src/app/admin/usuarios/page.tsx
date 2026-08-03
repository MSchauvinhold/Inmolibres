"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound, Copy, Search, X, Trash2, AlertTriangle } from "lucide-react";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "SUPERADMIN" | "ADMIN" | "AGENTE" | "PARTICULAR";
  activo: boolean;
  createdAt: string;
  inmobiliaria: { id: string; nombre: string; estado: string } | null;
}

const ROL_LABELS: Record<string, string> = {
  SUPERADMIN: "SuperAdmin",
  ADMIN: "Admin",
  AGENTE: "Agente",
  PARTICULAR: "Particular",
};

const ROL_COLOR: Record<string, string> = {
  SUPERADMIN: "#7E3F26",
  ADMIN: "#A85737",
  AGENTE: "#555",
  PARTICULAR: "#1D4ED8",
};

function generarPassword(): string {
  // Contraseña temporal legible que cumple las reglas: 8+ chars, 1 mayúscula, 1 número
  const palabras = ["Casa", "Llave", "Puerta", "Techo", "Patio", "Muro"];
  const palabra = palabras[Math.floor(Math.random() * palabras.length)];
  const numero = Math.floor(1000 + Math.random() * 9000);
  return `${palabra}${numero}`;
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>("TODOS");
  const [filtroInmobiliaria, setFiltroInmobiliaria] = useState<string>("TODAS");

  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Eliminar usuario
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [impacto, setImpacto] = useState<{ propiedades: number; clientes: number; visitas: number; operaciones: number } | null>(null);
  const [bloqueo, setBloqueo] = useState<string | null>(null);
  const [loadingImpacto, setLoadingImpacto] = useState(false);
  const [confirmNombre, setConfirmNombre] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function abrirDelete(u: Usuario) {
    setDeleteTarget(u);
    setConfirmNombre("");
    setImpacto(null);
    setBloqueo(null);
    setLoadingImpacto(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`);
      if (res.ok) {
        const json = await res.json() as { data: { impacto: typeof impacto; motivoBloqueo: string | null } };
        setImpacto(json.data.impacto);
        setBloqueo(json.data.motivoBloqueo);
      }
    } catch { /* el modal igual permite confirmar; el server valida */ }
    finally { setLoadingImpacto(false); }
  }

  async function confirmarDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json() as { error?: string; reasignado?: { visitas: number; operaciones: number } | null };
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo eliminar el usuario");
        return;
      }
      if (json.reasignado && (json.reasignado.operaciones > 0 || json.reasignado.visitas > 0)) {
        toast.success(`Usuario eliminado. Se reasignaron ${json.reasignado.operaciones} operación(es) y ${json.reasignado.visitas} visita(s) al administrador.`);
      } else {
        toast.success("Usuario eliminado");
      }
      setUsuarios((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      toast.error("Error inesperado");
    } finally {
      setDeleting(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/usuarios");
      if (res.ok) {
        const json = await res.json() as { data: Usuario[] };
        setUsuarios(json.data);
      } else {
        toast.error("Error al cargar usuarios");
      }
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  function abrirReset(u: Usuario) {
    setResetTarget(u);
    setNuevaPassword(generarPassword());
  }

  async function confirmarReset() {
    if (!resetTarget) return;
    if (nuevaPassword.length < 8) {
      toast.error("Mínimo 8 caracteres");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: nuevaPassword }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Error al blanquear la contraseña");
        return;
      }
      toast.success(`Contraseña actualizada para ${resetTarget.nombre}`);
      setResetTarget(null);
    } catch {
      toast.error("Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  // Inmobiliarias únicas presentes en la lista, para el filtro
  const inmobiliariasDisponibles = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; nombre: string }[] = [];
    for (const u of usuarios) {
      if (u.inmobiliaria && !seen.has(u.inmobiliaria.id)) {
        seen.add(u.inmobiliaria.id);
        result.push({ id: u.inmobiliaria.id, nombre: u.inmobiliaria.nombre });
      }
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [usuarios]);

  const filtrados = usuarios.filter((u) => {
    if (filtroRol !== "TODOS" && u.rol !== filtroRol) return false;
    if (filtroInmobiliaria === "SIN_INMOBILIARIA" && u.inmobiliaria) return false;
    if (filtroInmobiliaria !== "TODAS" && filtroInmobiliaria !== "SIN_INMOBILIARIA" && u.inmobiliaria?.id !== filtroInmobiliaria) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.inmobiliaria?.nombre.toLowerCase().includes(q) ?? false)
    );
  });

  const inp = "input-base w-full text-sm";

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Usuarios</h1>
          <p className="text-sm text-text-muted mt-1">
            Todos los usuarios del sistema, de todas las inmobiliarias. {usuarios.length} en total.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email o inmobiliaria..."
            className={`${inp} pl-9`}
          />
        </div>
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="input-base text-sm"
        >
          <option value="TODOS">Todos los roles</option>
          <option value="ADMIN">Admin</option>
          <option value="AGENTE">Agente</option>
          <option value="PARTICULAR">Particular</option>
          <option value="SUPERADMIN">SuperAdmin</option>
        </select>
        <select
          value={filtroInmobiliaria}
          onChange={(e) => setFiltroInmobiliaria(e.target.value)}
          className="input-base text-sm"
        >
          <option value="TODAS">Todas las inmobiliarias</option>
          <option value="SIN_INMOBILIARIA">Sin inmobiliaria (particulares)</option>
          {inmobiliariasDisponibles.map((i) => (
            <option key={i.id} value={i.id}>{i.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Rol</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Inmobiliaria</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Estado</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-raised/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{u.nombre}</p>
                      <p className="text-xs text-text-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${ROL_COLOR[u.rol]}18`, color: ROL_COLOR[u.rol] }}
                      >
                        {ROL_LABELS[u.rol] ?? u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {u.inmobiliaria?.nombre ?? <span className="text-text-muted italic">Sin inmobiliaria</span>}
                    </td>
                    <td className="px-4 py-3">
                      {u.activo
                        ? <span className="text-xs font-medium text-success">Activo</span>
                        : <span className="text-xs font-medium text-danger">Inactivo</span>}
                    </td>
                    <td className="px-4 py-3">
                      {u.rol !== "SUPERADMIN" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => abrirReset(u)}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-raised transition-colors text-text-secondary"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Blanquear contraseña
                          </button>
                          <button
                            onClick={() => abrirDelete(u)}
                            title="Eliminar usuario"
                            className="flex items-center justify-center p-1.5 rounded-lg border border-border hover:bg-red-50 transition-colors text-text-muted hover:text-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">
                      Sin usuarios que coincidan con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de eliminación de usuario */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div className="card w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-danger" />
                Eliminar usuario
              </h2>
              <button onClick={() => !deleting && setDeleteTarget(null)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-text-secondary">
              Vas a eliminar a <strong>{deleteTarget.nombre}</strong> ({deleteTarget.email}).
              Esta acción no se puede deshacer.
            </p>

            {loadingImpacto ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" /> Calculando impacto…
              </div>
            ) : bloqueo ? (
              <div
                className="rounded-lg p-3 text-xs space-y-1"
                style={{ background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.3)" }}
              >
                <p className="font-semibold" style={{ color: "var(--danger-600, #C0392B)" }}>
                  No se puede eliminar este usuario
                </p>
                <p className="text-text-secondary">{bloqueo}</p>
              </div>
            ) : impacto && (
              <div className="rounded-lg border border-border p-3 space-y-1.5 text-xs">
                <p className="font-medium text-text-primary mb-1">Qué pasa con sus datos:</p>
                <p className="text-text-secondary">
                  · <strong>{impacto.operaciones}</strong> operación(es) de Finanzas y{" "}
                  <strong>{impacto.visitas}</strong> visita(s) se <strong>reasignan al administrador</strong> de
                  la inmobiliaria (no se pierde el historial contable).
                </p>
                <p className="text-text-secondary">
                  · <strong>{impacto.propiedades}</strong> propiedad(es) y{" "}
                  <strong>{impacto.clientes}</strong> cliente(s) quedan sin asesor asignado,
                  pero siguen siendo de la inmobiliaria.
                </p>
              </div>
            )}

            {!bloqueo && (
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Para confirmar, escribí <span className="font-mono">{deleteTarget.nombre}</span>
                </label>
                <input
                  value={confirmNombre}
                  onChange={(e) => setConfirmNombre(e.target.value)}
                  className="input-base w-full text-sm"
                  placeholder={deleteTarget.nombre}
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="btn-outline" disabled={deleting}>
                {bloqueo ? "Entendido" : "Cancelar"}
              </button>
              {!bloqueo && (
                <button
                  onClick={confirmarDelete}
                  disabled={deleting || confirmNombre.trim() !== deleteTarget.nombre}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--danger-600, #C0392B)" }}
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Eliminar definitivamente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de reset de contraseña */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setResetTarget(null)}
        >
          <div
            className="card w-full max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-text-primary">Blanquear contraseña</h2>
              <button onClick={() => !saving && setResetTarget(null)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-text-secondary">
              Se va a establecer una nueva contraseña para <strong>{resetTarget.nombre}</strong> ({resetTarget.email}).
              Cualquier link de recuperación pendiente quedará invalidado.
            </p>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Nueva contraseña</label>
              <div className="flex gap-2">
                <input
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  className="input-base flex-1 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setNuevaPassword(generarPassword())}
                  className="btn-outline text-xs px-3"
                  title="Generar otra"
                >
                  Generar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(nuevaPassword);
                    toast.success("Copiada al portapapeles");
                  }}
                  className="btn-outline px-3"
                  title="Copiar"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Mínimo 8 caracteres, 1 mayúscula y 1 número. Pasásela al usuario por un canal seguro.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setResetTarget(null)} className="btn-outline" disabled={saving}>
                Cancelar
              </button>
              <button onClick={confirmarReset} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
