"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Upload, Loader2, X, FileText, Eye, Trash2, RefreshCw, Plus } from "lucide-react";
import type { TipoDocumento } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocItem {
  id: string;
  tipo: TipoDocumento;
  label: string | null;
  url: string;
  esImagen: boolean;
  createdAt: string;
}

type OwnerKind = "contacto" | "garante";

interface Props {
  contactoId: string;
  garanteId?: string;
  ownerKind: OwnerKind;
  docs: DocItem[];
  onDocsChange: (docs: DocItem[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoDocumento, string> = {
  DNI_FRENTE:          "DNI Frente",
  DNI_DORSO:           "DNI Dorso",
  RECIBO_SUELDO:       "Recibo de sueldo",
  RECIBO_SUELDO_GARANTE: "Recibo sueldo (garante)",
  DNI_GARANTE_FRENTE:  "DNI Garante Frente",
  DNI_GARANTE_DORSO:   "DNI Garante Dorso",
  ESCRITURA_PROPIEDAD: "Escritura",
  PLANO_APROBADO:      "Plano aprobado",
  CONSTANCIA_CUIL:     "Constancia CUIL",
  CONSTANCIA_CUIL_GARANTE: "CUIL Garante",
  CONTRATO_FIRMADO:    "Contrato firmado",
  BOLETO_COMPRAVENTA:  "Boleto de compraventa",
  RECIBO_PAGO:         "Recibo de pago",
  FOTO_ESTADO_INMUEBLE: "Foto inmueble",
  OTRO:                "Otro",
};

const FIXED_SLOTS: TipoDocumento[] = ["DNI_FRENTE", "DNI_DORSO", "RECIBO_SUELDO"];
const FIXED_SLOTS_GARANTE: TipoDocumento[] = ["DNI_FRENTE", "DNI_DORSO", "RECIBO_SUELDO"];

const EXTRA_TIPOS: TipoDocumento[] = [
  "ESCRITURA_PROPIEDAD", "PLANO_APROBADO", "CONSTANCIA_CUIL",
  "CONTRATO_FIRMADO", "BOLETO_COMPRAVENTA", "RECIBO_PAGO",
  "FOTO_ESTADO_INMUEBLE", "OTRO",
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Single doc card ──────────────────────────────────────────────────────────

function DocCard({
  doc, contactoId, onDelete, onReplace,
}: {
  doc: DocItem;
  contactoId: string;
  onDelete: (id: string) => void;
  onReplace: (id: string, tipo: TipoDocumento, label: string | null) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Eliminar este documento?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contactos/${contactoId}/documentos/${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDelete(doc.id);
      toast.success("Documento eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  const isPdf = !doc.esImagen || doc.url.includes(".pdf");

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#E8E5E0" }}>
      {/* Preview */}
      <div className="h-28 flex items-center justify-center" style={{ background: "#F3F1EE" }}>
        {doc.esImagen && !isPdf ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doc.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText className="w-10 h-10" style={{ color: "#9a9a9a" }} />
        )}
      </div>
      {/* Info */}
      <div className="p-2.5 space-y-1.5">
        <p className="text-xs font-semibold text-text-primary leading-tight truncate">
          {doc.label ?? TIPO_LABELS[doc.tipo]}
        </p>
        <p className="text-[10px] text-text-muted">{fmtDate(doc.createdAt)}</p>
        <div className="flex gap-1">
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:bg-[#F3F1EE]"
            style={{ color: "#1B4332" }}
          >
            <Eye className="w-3 h-3" /> Ver
          </a>
          <button
            onClick={() => onReplace(doc.id, doc.tipo, doc.label)}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:bg-[#F3F1EE]"
            style={{ color: "#6a6a6a" }}
          >
            <RefreshCw className="w-3 h-3" /> Reemplazar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded-lg hover:bg-red-50 transition-colors"
            style={{ color: "#9a9a9a" }}
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty slot ───────────────────────────────────────────────────────────────

function EmptySlot({ tipo, onUpload }: { tipo: TipoDocumento; onUpload: (tipo: TipoDocumento, label: null) => void }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 h-28 cursor-pointer transition-colors hover:border-[#1B4332] hover:bg-[#F0F7F4] p-3"
      style={{ borderColor: "#D4D0CB" }}
      onClick={() => onUpload(tipo, null)}
    >
      <Upload className="w-5 h-5" style={{ color: "#9a9a9a" }} />
      <p className="text-[11px] font-semibold text-center leading-tight" style={{ color: "#6a6a6a" }}>
        {TIPO_LABELS[tipo]}
      </p>
    </div>
  );
}

// ─── Main DocUploader ─────────────────────────────────────────────────────────

export function DocUploader({ contactoId, garanteId, ownerKind, docs, onDocsChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingTipo, setPendingTipo] = useState<TipoDocumento | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [pendingReplaceId, setPendingReplaceId] = useState<string | null>(null);
  const [showExtraMenu, setShowExtraMenu] = useState(false);
  const [extraTipo, setExtraTipo] = useState<TipoDocumento>("OTRO");
  const [extraLabel, setExtraLabel] = useState("");

  const fixedSlots = ownerKind === "garante" ? FIXED_SLOTS_GARANTE : FIXED_SLOTS;

  function triggerUpload(tipo: TipoDocumento, label: string | null, replaceId?: string) {
    setPendingTipo(tipo);
    setPendingLabel(label);
    if (replaceId) setPendingReplaceId(replaceId);
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingTipo) return;
    e.target.value = "";

    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo no puede superar los 10 MB");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, "inmolibres/documentos", (p) => setProgress(p));
      const isImage = file.type.startsWith("image/");

      // Delete old if replacing
      if (pendingReplaceId) {
        await fetch(`/api/contactos/${contactoId}/documentos/${pendingReplaceId}`, { method: "DELETE" });
        onDocsChange(docs.filter((d) => d.id !== pendingReplaceId));
      }

      const res = await fetch(`/api/contactos/${contactoId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garanteId: garanteId ?? null,
          tipo: pendingTipo,
          label: pendingLabel,
          url: result.secure_url,
          esImagen: isImage,
        }),
      });
      const json = await res.json() as { data?: DocItem };
      if (!res.ok) throw new Error("Error al guardar");
      onDocsChange([...docs.filter((d) => d.id !== pendingReplaceId), json.data!]);
      toast.success("Documento cargado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      setProgress(0);
      setPendingTipo(null);
      setPendingLabel(null);
      setPendingReplaceId(null);
    }
  }

  async function handleExtra() {
    if (!extraTipo) return;
    triggerUpload(extraTipo, extraLabel.trim() || null);
    setShowExtraMenu(false);
    setExtraLabel("");
  }

  const docsByTipo = Object.fromEntries(docs.map((d) => [d.tipo, d]));
  const extraDocs = docs.filter((d) => !fixedSlots.includes(d.tipo));

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFile} />

      {/* Upload progress */}
      {uploading && (
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F0F7F4" }}>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "#1B4332" }} />
          <div className="flex-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#D4D0CB" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "#1B4332" }} />
            </div>
          </div>
          <span className="text-xs font-semibold tabular-nums" style={{ color: "#1B4332" }}>{progress}%</span>
        </div>
      )}

      {/* Fixed slots grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fixedSlots.map((tipo) => {
          const doc = docsByTipo[tipo];
          return doc ? (
            <DocCard
              key={tipo}
              doc={doc}
              contactoId={contactoId}
              onDelete={(id) => onDocsChange(docs.filter((d) => d.id !== id))}
              onReplace={(id, t, l) => triggerUpload(t, l, id)}
            />
          ) : (
            <EmptySlot key={tipo} tipo={tipo} onUpload={triggerUpload} />
          );
        })}
      </div>

      {/* Extra docs */}
      {extraDocs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {extraDocs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              contactoId={contactoId}
              onDelete={(id) => onDocsChange(docs.filter((d) => d.id !== id))}
              onReplace={(id, t, l) => triggerUpload(t, l, id)}
            />
          ))}
        </div>
      )}

      {/* Add extra doc */}
      {showExtraMenu ? (
        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: "#E8E5E0" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-text-primary">Agregar documento</p>
            <button onClick={() => setShowExtraMenu(false)}><X className="w-3.5 h-3.5 text-text-muted" /></button>
          </div>
          <select
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: "#D4D0CB" }}
            value={extraTipo}
            onChange={(e) => setExtraTipo(e.target.value as TipoDocumento)}
          >
            {EXTRA_TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
          </select>
          {extraTipo === "OTRO" && (
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "#D4D0CB" }}
              placeholder="Nombre del documento"
              value={extraLabel}
              onChange={(e) => setExtraLabel(e.target.value)}
            />
          )}
          <button
            onClick={handleExtra}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#1B4332" }}
          >
            Seleccionar archivo
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowExtraMenu(true)}
          className="flex items-center gap-2 text-sm font-semibold transition-colors hover:underline"
          style={{ color: "#1B4332" }}
        >
          <Plus className="w-4 h-4" />
          Agregar otro documento
        </button>
      )}
    </div>
  );
}
