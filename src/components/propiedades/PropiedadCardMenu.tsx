"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Copy, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";

interface Props {
  propiedadId: string;
  publicada?: boolean;
  canDelete?: boolean;
}

export function PropiedadCardMenu({ propiedadId, publicada = true, canDelete = true }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/propiedades/${propiedadId}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      toast.success("Propiedad duplicada — no publicada");
      router.push(`/propiedades/${data.id}/editar`);
      router.refresh();
    } catch {
      toast.error("Error al duplicar la propiedad");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublicada(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/propiedades/${propiedadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicada: !publicada }),
      });
      if (!res.ok) throw new Error();
      toast.success(publicada ? "Propiedad pausada — fuera del marketplace" : "Propiedad publicada en el marketplace");
      router.refresh();
    } catch {
      toast.error("Error al cambiar la publicación");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    if (!confirm("¿Eliminar esta propiedad permanentemente? Se borrarán también sus visitas y consultas asociadas. Esta acción no se puede deshacer.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/propiedades/${propiedadId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error);
      }
      toast.success("Propiedad eliminada");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((p) => !p); }}
        className="p-1.5 rounded-lg bg-white/90 hover:bg-white shadow-sm transition-colors"
        aria-label="Acciones"
      >
        {busy
          ? <Loader2 className="w-3.5 h-3.5 text-text-secondary animate-spin" />
          : <MoreVertical className="w-3.5 h-3.5 text-text-secondary" />
        }
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-elevated border border-border z-50 overflow-hidden">
          <a
            href={`/propiedades/${propiedadId}/editar`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-raised transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-text-muted" />
            Editar
          </a>

          {/* Pausar / Publicar */}
          <button
            onClick={togglePublicada}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-primary hover:bg-surface-raised transition-colors"
          >
            {publicada
              ? <><EyeOff className="w-3.5 h-3.5 text-text-muted" /> Pausar publicación</>
              : <><Eye className="w-3.5 h-3.5 text-text-muted" /> Publicar</>}
          </button>

          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-primary hover:bg-surface-raised transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-text-muted" />
            Duplicar
          </button>

          {/* Eliminar */}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors border-t border-border"
              style={{ color: "#DC2626" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
