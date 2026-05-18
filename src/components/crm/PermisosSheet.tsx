"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

interface Permisos {
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

const DEFAULT_PERMISOS: Permisos = {
  verPropiedades: true,
  editarPropiedades: true,
  verClientes: true,
  editarClientes: true,
  verVisitas: true,
  editarVisitas: true,
  verAlquileres: true,
  editarAlquileres: false,
  verConsultas: true,
  verCalculadoras: true,
  verFinanzas: false,
  verDocumentos: true,
  verReportes: false,
};

const MODULOS = [
  { key: "Propiedades", ver: "verPropiedades", editar: "editarPropiedades" },
  { key: "Clientes", ver: "verClientes", editar: "editarClientes" },
  { key: "Visitas", ver: "verVisitas", editar: "editarVisitas" },
  { key: "Alquileres", ver: "verAlquileres", editar: "editarAlquileres" },
  { key: "Consultas", ver: "verConsultas", editar: null },
  { key: "Calculadoras", ver: "verCalculadoras", editar: null },
  { key: "Documentos", ver: "verDocumentos", editar: null },
  { key: "Finanzas", ver: "verFinanzas", editar: null },
  { key: "Reportes", ver: "verReportes", editar: null },
] as const;

interface Props {
  agentId: string;
  inmobiliariaId: string;
  agentName: string;
  initialPermisos: Permisos | null;
  onClose: () => void;
  onSave: (permisos: Permisos) => void;
}

export function PermisosSheet({ agentId, agentName, initialPermisos, onClose, onSave }: Props) {
  const [permisos, setPermisos] = useState<Permisos>(initialPermisos ?? DEFAULT_PERMISOS);
  const [saving, setSaving] = useState(false);

  function toggle(key: keyof Permisos) {
    setPermisos((p) => ({ ...p, [key]: !p[key] }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/permisos/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permisos),
      });
      if (!res.ok) throw new Error();
      onSave(permisos);
      toast.success("Permisos actualizados");
    } catch {
      toast.error("Error al guardar permisos");
    } finally {
      setSaving(false);
    }
  }

  function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
      <button
        type="button"
        onClick={onChange}
        className="relative w-9 h-5 rounded-full transition-colors shrink-0"
        style={{ background: checked ? "var(--brand-primary)" : "var(--border)" }}
        role="switch" aria-checked={checked}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full sm:w-[420px] h-[90vh] sm:h-full flex flex-col rounded-t-2xl sm:rounded-none overflow-hidden"
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-text-primary">Permisos del agente</h3>
            <p className="text-xs text-text-muted">{agentName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">Módulos del CRM</p>

          {MODULOS.map(({ key, ver, editar }) => (
            <div key={key} className="py-3 border-b border-border last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">{key}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-muted">Ver</span>
                    <Toggle checked={permisos[ver as keyof Permisos]} onChange={() => toggle(ver as keyof Permisos)} />
                  </div>
                  {editar && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-muted">Editar</span>
                      <Toggle
                        checked={permisos[editar as keyof Permisos] && permisos[ver as keyof Permisos]}
                        onChange={() => {
                          if (!permisos[ver as keyof Permisos]) return;
                          toggle(editar as keyof Permisos);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {editar && !permisos[ver as keyof Permisos] && permisos[editar as keyof Permisos] && (
                <p className="text-[10px] text-warning mt-1">Activá &quot;Ver&quot; para habilitar edición</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline text-sm flex-1">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Guardar permisos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
