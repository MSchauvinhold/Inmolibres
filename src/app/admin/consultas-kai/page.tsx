"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, MessageSquare, Phone, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ConsultaKai {
  id: string;
  nombreVisitante: string;
  telefono: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

export default function ConsultasKaiPage() {
  const [consultas, setConsultas] = useState<ConsultaKai[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/consultas-kai");
        if (res.ok) setConsultas((await res.json()).data ?? []);
      } catch {
        toast.error("Error al cargar consultas");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function marcarLeida(id: string) {
    const res = await fetch("/api/consultas-kai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("Marcada como leída");
      setConsultas((prev) => prev.map((c) => c.id === id ? { ...c, leida: true } : c));
    }
  }

  const noLeidas = consultas.filter((c) => !c.leida).length;

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/mascota-kai.svg" alt="Kai" width={32} height={32} style={{ objectFit: "contain" }} />
            <h1 className="text-2xl font-bold text-text-primary">Consultas de Kai</h1>
            {noLeidas > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#1B4332", color: "white" }}
              >
                {noLeidas} nueva{noLeidas !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Personas que dejaron sus datos a través del chat de Kai
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        </div>
      ) : consultas.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">Todavía no hay consultas desde Kai</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="text-left px-4 py-3 text-text-muted font-medium">Persona</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Mensaje</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-text-muted font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {consultas.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-surface-raised/50"
                  style={!c.leida ? { borderLeft: "3px solid #1B4332" } : undefined}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                        style={{ background: "#1B4332" }}
                      >
                        {c.nombreVisitante[0]?.toUpperCase()}
                      </div>
                      <p className="font-medium text-text-primary">{c.nombreVisitante}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: "#25D366" }}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {c.telefono}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-[220px] truncate" title={c.mensaje}>
                    {c.mensaje}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {c.leida ? (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Check className="w-3 h-3" /> Leída
                      </span>
                    ) : (
                      <button
                        onClick={() => marcarLeida(c.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                        style={{ background: "rgba(27,67,50,0.1)", color: "#1B4332" }}
                      >
                        Marcar leída
                      </button>
                    )}
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
