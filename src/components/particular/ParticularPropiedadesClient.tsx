"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, MapPin, Eye, EyeOff, Pencil, Loader2, X, Check } from "lucide-react";

export interface ParticularPropiedad {
  id: string;
  slug: string;
  titulo: string;
  direccion: string;
  precio: number;
  moneda: string;
  publicada: boolean;
  descripcion: string | null;
  fotoUrl: string | null;
  habitaciones: number | null;
  superficieCubierta: number | null;
}

export function ParticularPropiedadesClient({ propiedades }: { propiedades: ParticularPropiedad[] }) {
  const [items, setItems] = useState(propiedades);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [precioForm, setPrecioForm] = useState("");
  const [descForm, setDescForm] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function abrirEdicion(p: ParticularPropiedad) {
    setEditingId(p.id);
    setPrecioForm(String(p.precio));
    setDescForm(p.descripcion ?? "");
  }

  async function guardarEdicion(id: string) {
    const precio = Number(precioForm);
    if (!precio || precio <= 0) {
      toast.error("Ingresá un precio válido");
      return;
    }
    if (descForm.length > 2000) {
      toast.error("La descripción no puede superar los 2000 caracteres");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/particular/propiedades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio, descripcion: descForm || null }),
      });
      const json = (await res.json()) as { error?: string; data?: { precio: number; descripcion: string | null } };
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, precio: json.data!.precio, descripcion: json.data!.descripcion } : p)));
      setEditingId(null);
      toast.success("Cambios guardados");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublicada(p: ParticularPropiedad) {
    setTogglingId(p.id);
    try {
      const res = await fetch(`/api/particular/propiedades/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicada: !p.publicada }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al actualizar");
      setItems((prev) => prev.map((it) => (it.id === p.id ? { ...it, publicada: !p.publicada } : it)));
      toast.success(!p.publicada ? "Propiedad reactivada" : "Propiedad pausada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setTogglingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3"
        style={{ borderColor: "var(--terracota-200, #EDCBB8)", background: "var(--terracota-50, #FBF1EC)" }}
      >
        <Building2 className="w-10 h-10" style={{ color: "var(--terracota-300, #E0A088)" }} />
        <p className="font-medium text-sm" style={{ color: "var(--antracita-700)" }}>
          Todavía no tenés propiedades
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: "var(--antracita-400)" }}>
          Contactate con InmoLibres para publicar tu primera propiedad en el marketplace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((p) => {
        const editing = editingId === p.id;
        return (
          <div key={p.id} className="il-card overflow-hidden" style={{ padding: 0 }}>
            <div className="flex">
              <div
                className="w-28 shrink-0 bg-cover bg-center"
                style={{
                  backgroundImage: p.fotoUrl ? `url(${p.fotoUrl})` : undefined,
                  background: p.fotoUrl ? undefined : "var(--crema-200, #ECE4D6)",
                  minHeight: 96,
                }}
              >
                {!p.fotoUrl && (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-7 h-7" style={{ color: "var(--antracita-300)" }} />
                  </div>
                )}
              </div>

              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight truncate" style={{ color: "var(--antracita-900)" }}>
                      {p.titulo}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full shrink-0 font-semibold flex items-center gap-1"
                      style={{
                        background: p.publicada ? "rgba(27,67,50,0.08)" : "var(--crema-200)",
                        color: p.publicada ? "var(--brand-primary, #1B4332)" : "var(--antracita-400)",
                      }}
                    >
                      {p.publicada ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      {p.publicada ? "Publicada" : "Oculta"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <MapPin className="w-3 h-3 shrink-0" style={{ color: "var(--antracita-300)" }} />
                    <p className="text-xs truncate" style={{ color: "var(--antracita-400)" }}>{p.direccion}</p>
                  </div>
                  {p.habitaciones && (
                    <p className="text-xs mt-1" style={{ color: "var(--antracita-400)" }}>
                      {p.habitaciones} amb.
                      {p.superficieCubierta ? ` · ${p.superficieCubierta} m²` : ""}
                    </p>
                  )}
                </div>

                {editing ? (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--antracita-300)" }}>Precio</label>
                      <input
                        type="number"
                        min={0}
                        value={precioForm}
                        onChange={(e) => setPrecioForm(e.target.value)}
                        className="input-base w-full text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--antracita-300)" }}>Descripción</label>
                      <textarea
                        value={descForm}
                        onChange={(e) => setDescForm(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        className="input-base w-full text-sm mt-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: "var(--border)", color: "var(--antracita-500)" }}
                      >
                        <X className="w-3 h-3" /> Cancelar
                      </button>
                      <button
                        onClick={() => guardarEdicion(p.id)}
                        disabled={saving}
                        className="btn-primary flex items-center gap-1 text-xs px-3 py-1.5"
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                    <span className="text-sm font-semibold mono" style={{ color: "var(--terracota-600)" }}>
                      {p.moneda === "USD" ? "US$ " : "$ "}
                      {p.precio.toLocaleString("es-AR")}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => abrirEdicion(p)}
                        className="flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: "var(--terracota-500)" }}
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => togglePublicada(p)}
                        disabled={togglingId === p.id}
                        className="flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: "var(--antracita-500)" }}
                      >
                        {togglingId === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : p.publicada ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        {p.publicada ? "Pausar" : "Reactivar"}
                      </button>
                      <Link
                        href={`/propiedades/${p.id}/${p.slug}`}
                        className="text-xs font-medium hover:underline"
                        style={{ color: "var(--antracita-400)" }}
                      >
                        Ver →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
