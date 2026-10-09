"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArchiveRestore } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AvatarInitials } from "@/components/ui/avatar-initials";

interface Archivado {
  id: string;
  nombre: string;
  telefono: string;
  agente?: { nombre: string } | null;
  archivadoAt: string | null;
}

// Prospectos cerrados que se sacaron del tablero. No se borran: se pueden volver a
// traer al tablero (a la columna Cerrado) con "Desarchivar".
export function ProspectosArchivados({ clientes }: { clientes: Archivado[] }) {
  const router = useRouter();
  // Se ocultan al instante los que se desarchivan, sin esperar al refresh del servidor
  const [quitados, setQuitados] = useState<string[]>([]);
  const [procesando, setProcesando] = useState<string | null>(null);
  const items = clientes.filter((c) => !quitados.includes(c.id));

  async function desarchivar(c: Archivado) {
    setProcesando(c.id);
    try {
      const res = await fetch("/api/clientes/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "desarchivar", ids: [c.id] }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al desarchivar");
      setQuitados((prev) => [...prev, c.id]);
      toast.success(`${c.nombre} volvió al tablero`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al desarchivar");
    } finally {
      setProcesando(null);
    }
  }

  if (items.length === 0) {
    return (
      <div
        className="il-card"
        style={{ padding: "40px 16px", textAlign: "center", fontSize: 13, color: "var(--antracita-300)", fontStyle: "italic" }}
      >
        No hay prospectos archivados
      </div>
    );
  }

  return (
    <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
      {items.map((c, i) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderTop: i === 0 ? "none" : "1px solid var(--border)",
          }}
        >
          <AvatarInitials name={c.nombre} size={30} bg="var(--antracita-300, #A09890)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              href={`/clientes/${c.id}`}
              style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", textDecoration: "none" }}
            >
              {c.nombre}
            </Link>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)" }}>
              {c.telefono} · {c.agente?.nombre ?? "Sin asignar"}
            </div>
          </div>
          {c.archivadoAt && (
            <span style={{ fontSize: 11, color: "var(--antracita-400)", whiteSpace: "nowrap" }}>
              Archivado el {formatDate(c.archivadoAt)}
            </span>
          )}
          <button
            type="button"
            onClick={() => desarchivar(c)}
            disabled={procesando === c.id}
            className="il-btn il-btn--ghost"
            style={{ height: 30, fontSize: 12, gap: 6 }}
          >
            <ArchiveRestore size={13} />
            Desarchivar
          </button>
        </div>
      ))}
    </div>
  );
}
