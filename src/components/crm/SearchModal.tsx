"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Users, FileText, Loader2, X } from "lucide-react";
import { TIPO_PROPIEDAD_LABELS, TIPO_OPERACION_LABELS, ESTADO_PIPELINE_LABELS } from "@/lib/utils";
import type { EstadoPipeline } from "@prisma/client";

interface SearchResults {
  propiedades: { id: string; titulo: string; direccion: string; tipo: string; operacion: string }[];
  clientes: { id: string; nombre: string; telefono: string; estadoPipeline: string }[];
  contratos: { id: string; inquilinoNombre: string; propiedad: { titulo: string } }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setQuery("");
        setResults(null);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) { queueMicrotask(() => setResults(null)); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const totalResults = results
    ? results.propiedades.length + results.clientes.length + results.contratos.length
    : 0;

  const hasResults = totalResults > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-elevated overflow-hidden border border-border">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          {loading
            ? <Loader2 className="w-4 h-4 text-text-muted shrink-0 animate-spin" />
            : <Search className="w-4 h-4 text-text-muted shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar propiedades, clientes, contratos..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-0.5 rounded text-text-muted hover:text-text-secondary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] text-text-muted border border-border rounded px-1.5 py-0.5 font-mono shrink-0">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 && (
            <p className="text-center text-sm text-text-muted py-8">Escribí al menos 2 caracteres</p>
          )}

          {query.length >= 2 && !loading && !hasResults && (
            <p className="text-center text-sm text-text-muted py-8">Sin resultados para &quot;{query}&quot;</p>
          )}

          {results && hasResults && (
            <div className="py-2">
              {/* Propiedades */}
              {results.propiedades.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold px-4 py-2">
                    Propiedades
                  </p>
                  {results.propiedades.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/propiedades/${p.id}/editar`)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-surface-raised transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{p.titulo}</p>
                        <p className="text-xs text-text-muted truncate">
                          {TIPO_OPERACION_LABELS[p.operacion as keyof typeof TIPO_OPERACION_LABELS]} ·{" "}
                          {TIPO_PROPIEDAD_LABELS[p.tipo as keyof typeof TIPO_PROPIEDAD_LABELS]} · {p.direccion}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Clientes */}
              {results.clientes.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold px-4 py-2">
                    Clientes
                  </p>
                  {results.clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/clientes/${c.id}`)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-surface-raised transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-info/10 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-info" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{c.nombre}</p>
                        <p className="text-xs text-text-muted">{c.telefono} · {ESTADO_PIPELINE_LABELS[c.estadoPipeline as EstadoPipeline]}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Contratos */}
              {results.contratos.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold px-4 py-2">
                    Contratos
                  </p>
                  {results.contratos.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/alquileres`)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-surface-raised transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{c.inquilinoNombre}</p>
                        <p className="text-xs text-text-muted truncate">{c.propiedad.titulo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4">
          <span className="text-[10px] text-text-muted">
            <kbd className="border border-border rounded px-1 py-0.5 font-mono">↑↓</kbd> navegar
          </span>
          <span className="text-[10px] text-text-muted">
            <kbd className="border border-border rounded px-1 py-0.5 font-mono">Enter</kbd> abrir
          </span>
          <span className="text-[10px] text-text-muted">
            <kbd className="border border-border rounded px-1 py-0.5 font-mono">Esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
