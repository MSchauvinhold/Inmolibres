"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Copy, Loader2 } from "lucide-react";

interface Props {
  propiedadId: string;
}

export function PropiedadCardMenu({ propiedadId }: Props) {
  const [open, setOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
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
    setDuplicating(true);
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
      setDuplicating(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((p) => !p); }}
        className="p-1.5 rounded-lg bg-white/90 hover:bg-white shadow-sm transition-colors"
        aria-label="Acciones"
      >
        {duplicating
          ? <Loader2 className="w-3.5 h-3.5 text-text-secondary animate-spin" />
          : <MoreVertical className="w-3.5 h-3.5 text-text-secondary" />
        }
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-elevated border border-border z-50 overflow-hidden">
          <a
            href={`/propiedades/${propiedadId}/editar`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-raised transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-text-muted" />
            Editar
          </a>
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-text-primary hover:bg-surface-raised transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-text-muted" />
            Duplicar
          </button>
        </div>
      )}
    </div>
  );
}
