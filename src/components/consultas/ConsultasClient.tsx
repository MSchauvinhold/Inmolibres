"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { MessageSquare, Phone, ArrowRight, Check, Mail } from "lucide-react";
import { formatRelativeTime, buildWhatsAppLink } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Consulta {
  id: string;
  nombreVisitante: string;
  telefono: string;
  email?: string | null;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  propiedad: {
    titulo: string;
    slug: string;
    tipo: string;
    fotos: { urlCloudinary: string }[];
  } | null;
}

interface Props {
  consultas: Consulta[];
  inmobiliariaId: string;
}

export function ConsultasClient({ consultas: initial }: Props) {
  const [consultas, setConsultas] = useState(initial);
  const [selected, setSelected] = useState<Consulta | null>(null);
  const [filter, setFilter] = useState<"todas" | "noLeidas" | "leidas">("todas");
  const [converting, setConverting] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filtered = consultas.filter((c) => {
    if (filter === "noLeidas") return !c.leida;
    if (filter === "leidas") return c.leida;
    return true;
  });

  async function marcarLeida(id: string) {
    try {
      const res = await fetch(`/api/consultas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leida: true }),
      });
      if (!res.ok) throw new Error();
      setConsultas((prev) => prev.map((c) => (c.id === id ? { ...c, leida: true } : c)));
      if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, leida: true } : null));
      window.dispatchEvent(new CustomEvent("notif:refresh"));
    } catch {
      toast.error("Error al marcar como leída");
    }
  }

  function openConsulta(c: Consulta) {
    setSelected(c);
    if (!c.leida) marcarLeida(c.id);
  }

  async function convertirEnCliente(consulta: Consulta) {
    setConverting(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: consulta.nombreVisitante,
          telefono: consulta.telefono,
          origen: "PORTAL",
          notas: `Consulta del marketplace sobre: "${consulta.propiedad?.titulo ?? ""}". Mensaje: "${consulta.mensaje}"`,
          estadoPipeline: "NUEVO",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error");
      }
      toast.success(`${consulta.nombreVisitante} agregado como cliente`);
      setSelected(null);
      startTransition(() => router.push("/clientes"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al convertir en cliente");
    } finally {
      setConverting(false);
    }
  }

  const waLink = selected
    ? buildWhatsAppLink(
        selected.telefono,
        `Hola ${selected.nombreVisitante}, te contactamos desde InmoLibres en relación a tu consulta sobre "${selected.propiedad?.titulo ?? ""}". ¿Cómo te podemos ayudar?`
      )
    : "#";

  return (
    <>
      <div className="space-y-3">
        {/* Filter tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-surface-raised w-fit">
          {[
            { key: "todas", label: "Todas" },
            { key: "noLeidas", label: `Sin leer (${consultas.filter((c) => !c.leida).length})` },
            { key: "leidas", label: "Leídas" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === key
                  ? "bg-white shadow-sm text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">Sin consultas en este filtro</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => openConsulta(c)}
                className={`w-full text-left card p-4 transition-all hover:shadow-md ${
                  !c.leida ? "border-l-4 border-[#C1694F]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#8B4513]/10 flex items-center justify-center shrink-0 text-sm font-bold text-[#8B4513]">
                      {c.nombreVisitante[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!c.leida && (
                          <span className="w-2 h-2 rounded-full bg-[#C1694F] shrink-0 animate-pulse" />
                        )}
                        <p className="font-medium text-text-primary text-sm">{c.nombreVisitante}</p>
                        <span className="text-xs text-text-muted hidden sm:inline">sobre</span>
                        <p className="text-xs text-brand-primary font-medium truncate hidden sm:block">
                          {c.propiedad?.titulo ?? "(sin propiedad)"}
                        </p>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{c.telefono}</p>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-1">{c.mensaje}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted shrink-0 mt-1">
                    {formatRelativeTime(c.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="light-portal max-w-md w-full p-0 overflow-hidden">
          {selected && (
            <>
              {/* Header con avatar */}
              <div className="flex items-start gap-4 p-5 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-[#8B4513]/10 flex items-center justify-center shrink-0 text-lg font-bold text-[#8B4513]">
                  {selected.nombreVisitante[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-text-primary leading-snug">
                      {selected.nombreVisitante}
                    </DialogTitle>
                  </DialogHeader>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                    selected.leida ? "bg-gray-100 text-gray-500" : "bg-[#C1694F]/10 text-[#C1694F]"
                  }`}>
                    {selected.leida ? "Leída" : "No leída"}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted shrink-0 mt-1">
                  {formatRelativeTime(selected.createdAt)}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Datos de contacto */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <Phone className="w-4 h-4 text-text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Teléfono</p>
                      <p className="text-sm font-medium text-text-primary">{selected.telefono}</p>
                    </div>
                  </div>
                  {selected.email ? (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Mail className="w-4 h-4 text-text-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Email</p>
                        <a
                          href={`mailto:${selected.email}`}
                          className="text-sm font-medium text-brand-primary hover:underline truncate block"
                        >
                          {selected.email}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Mail className="w-4 h-4 text-text-muted shrink-0" />
                      <p className="text-sm text-text-muted italic">Sin email</p>
                    </div>
                  )}
                </div>

                {/* Propiedad consultada */}
                {selected.propiedad && (
                  <div className="rounded-xl bg-surface-raised p-3 flex items-center gap-3">
                    {selected.propiedad.fotos[0] ? (
                      <Image
                        src={selected.propiedad.fotos[0].urlCloudinary}
                        alt={selected.propiedad.titulo}
                        width={56} height={56}
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-border flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Propiedad consultada</p>
                      <p className="font-medium text-text-primary text-sm truncate">{selected.propiedad.titulo}</p>
                      <p className="text-xs text-text-muted">{selected.propiedad.tipo}</p>
                    </div>
                  </div>
                )}

                {/* Mensaje */}
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium mb-2">Mensaje</p>
                  <div className="bg-surface-raised rounded-xl p-3">
                    <p className="text-sm text-text-primary leading-relaxed">{selected.mensaje}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="space-y-2 pt-1">
                  {/* WhatsApp — número del visitante */}
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                    style={{ background: "#25D366", color: "white", textDecoration: "none" }}
                  >
                    {/* WhatsApp icon inline */}
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Responder por WhatsApp
                  </a>

                  {selected.email && (
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: consulta sobre "${selected.propiedad?.titulo ?? ""}"`)}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-raised transition-colors"
                      style={{ textDecoration: "none" }}
                    >
                      <Mail className="w-4 h-4" />
                      Responder por email
                    </a>
                  )}

                  <button
                    onClick={() => convertirEnCliente(selected)}
                    disabled={converting}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#8B4513] text-[#8B4513] text-sm font-medium hover:bg-[#8B4513]/5 transition-colors disabled:opacity-60"
                  >
                    {converting ? (
                      <span className="w-4 h-4 border-2 border-[#8B4513]/30 border-t-[#8B4513] rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    Convertir en cliente
                  </button>

                  {!selected.leida && (
                    <button
                      onClick={() => marcarLeida(selected.id)}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-text-muted text-sm hover:bg-surface-raised transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Marcar como leída
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
