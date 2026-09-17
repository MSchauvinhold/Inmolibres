"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Copy, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  propiedadId: string;
  titulo: string;
  publicada?: boolean;
  canDelete?: boolean;
}

export function PropiedadCardMenu({ propiedadId, titulo, publicada = true, canDelete = true }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      const json = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al duplicar la propiedad");
      toast.success("Propiedad duplicada — no publicada");
      router.push(`/propiedades/${json.data!.id}/editar`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al duplicar la propiedad");
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
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al cambiar la publicación");
      toast.success(publicada ? "Propiedad pausada — fuera del marketplace" : "Propiedad publicada en el marketplace");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar la publicación");
    } finally {
      setBusy(false);
    }
  }

  // Antes usaba window.confirm(): si el navegador bloquea o autodescarta el diálogo
  // nativo, devuelve false y la acción se cortaba sin request ni aviso.
  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/propiedades/${propiedadId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al eliminar la propiedad");
      toast.success("Propiedad eliminada");
      setConfirmDelete(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar la propiedad");
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
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              router.push(`/propiedades/${propiedadId}/editar`);
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-primary hover:bg-surface-raised transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-text-muted" />
            Editar
          </button>

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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                setConfirmDelete(true);
              }}
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

      {/* El menú vive dentro del <Link> de la card: los clicks del diálogo (portal) igual
          suben por el árbol de React y navegarían a la ficha. Se cortan acá. */}
      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="¿Eliminar esta propiedad?"
          confirmLabel="Eliminar definitivamente"
          destructive
          loading={busy}
          onConfirm={handleDelete}
          description={
            <>
              <p><strong>{titulo}</strong></p>
              <p>Se borran también sus fotos y visitas. Esta acción no se puede deshacer.</p>
              <p>Las consultas, tasaciones y gastos quedan en sus módulos, sin propiedad vinculada. Si tiene contratos de alquiler, no se va a poder eliminar hasta quitarlos desde Contratos.</p>
            </>
          }
        />
      </div>
    </div>
  );
}
