"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Upload, Eye, Trash2, FileText, Loader2, X, StickyNote } from "lucide-react";
import Image from "next/image";
import type { TipoDocumento } from "@prisma/client";

interface Documento {
  id: string;
  tipo: TipoDocumento;
  nombre: string;
  urlCloudinary: string;
  esImagen: boolean;
  notas: string | null;
  createdAt: string;
}

const TIPO_LABELS: Record<TipoDocumento, string> = {
  DNI_FRENTE: "DNI Frente",
  DNI_DORSO: "DNI Dorso",
  RECIBO_SUELDO: "Recibo de sueldo",
  RECIBO_SUELDO_GARANTE: "Recibo sueldo garante",
  DNI_GARANTE_FRENTE: "DNI garante frente",
  DNI_GARANTE_DORSO: "DNI garante dorso",
  ESCRITURA_PROPIEDAD: "Escritura de propiedad",
  PLANO_APROBADO: "Plano aprobado",
  CONSTANCIA_CUIL: "Constancia de CUIL",
  CONSTANCIA_CUIL_GARANTE: "CUIL garante",
  CONTRATO_FIRMADO: "Contrato firmado",
  BOLETO_COMPRAVENTA: "Boleto de compraventa",
  RECIBO_PAGO: "Recibo de pago",
  FOTO_ESTADO_INMUEBLE: "Foto estado inmueble",
  OTRO: "Otro documento",
};

const TIPOS_ORDEN: TipoDocumento[] = [
  "DNI_FRENTE", "DNI_DORSO", "RECIBO_SUELDO", "RECIBO_SUELDO_GARANTE",
  "DNI_GARANTE_FRENTE", "DNI_GARANTE_DORSO", "CONSTANCIA_CUIL",
  "CONSTANCIA_CUIL_GARANTE", "ESCRITURA_PROPIEDAD", "PLANO_APROBADO",
  "CONTRATO_FIRMADO", "BOLETO_COMPRAVENTA", "RECIBO_PAGO",
  "FOTO_ESTADO_INMUEBLE", "OTRO",
];

interface Props {
  clienteId: string;
  initialDocumentos: Documento[];
}

export function DocumentosExpediente({ clienteId, initialDocumentos }: Props) {
  const [documentos, setDocumentos] = useState(initialDocumentos);
  const [uploading, setUploading] = useState<TipoDocumento | null>(null);
  const [preview, setPreview] = useState<Documento | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notaDocId, setNotaDocId] = useState<string | null>(null);
  const [notaText, setNotaText] = useState("");
  const [savingNota, setSavingNota] = useState(false);

  const docsMap = new Map(documentos.map((d) => [d.tipo, d]));
  const cargados = documentos.length;
  const total = TIPOS_ORDEN.length;

  const handleUpload = useCallback(async (tipo: TipoDocumento, file: File) => {
    setUploading(tipo);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", `documentos/${clienteId}`);

      const upRes = await fetch("/api/upload", { method: "POST", body: form });
      const upData = (await upRes.json()) as { url?: string; error?: string };
      if (!upRes.ok || !upData.url) throw new Error(upData.error ?? "Error de upload");

      const esImagen = file.type.startsWith("image/");
      const res = await fetch(`/api/clientes/${clienteId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          nombre: TIPO_LABELS[tipo],
          urlCloudinary: upData.url,
          esImagen,
        }),
      });
      const data = (await res.json()) as { data?: Documento; error?: string };
      if (!res.ok) throw new Error(data.error);

      setDocumentos((prev) => {
        const filtered = prev.filter((d) => d.tipo !== tipo);
        return [...filtered, data.data!];
      });
      toast.success(`${TIPO_LABELS[tipo]} cargado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir documento");
    } finally {
      setUploading(null);
    }
  }, [clienteId]);

  async function eliminar(id: string) {
    const doc = documentos.find((d) => d.id === id);
    if (!doc) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/documentos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDocumentos((p) => p.filter((d) => d.id !== id));
      if (preview?.id === id) setPreview(null);
      toast.success("Documento eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  async function guardarNota() {
    if (!notaDocId) return;
    setSavingNota(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/documentos/${notaDocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas: notaText }),
      });
      if (!res.ok) throw new Error();
      setDocumentos((p) => p.map((d) => d.id === notaDocId ? { ...d, notas: notaText } : d));
      setNotaDocId(null);
      toast.success("Nota guardada");
    } catch {
      toast.error("Error al guardar nota");
    } finally {
      setSavingNota(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Badge de completitud */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          <span className="font-bold text-text-primary">{cargados}</span>/{total} documentos cargados
        </p>
        <div className="h-2 w-48 bg-surface-raised rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(cargados / total) * 100}%`,
              background: cargados === total ? "var(--success)" : "var(--brand-primary)",
            }}
          />
        </div>
      </div>

      {/* Lista de tipos */}
      <div className="space-y-1.5">
        {TIPOS_ORDEN.map((tipo) => {
          const doc = docsMap.get(tipo);
          const isUploading = uploading === tipo;

          return (
            <div
              key={tipo}
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ borderColor: "var(--border)", background: doc ? "var(--surface)" : "var(--surface-raised)" }}
            >
              {/* Estado */}
              {doc ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
              ) : (
                <Circle className="w-4 h-4 shrink-0 text-text-muted" />
              )}

              {/* Nombre */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{TIPO_LABELS[tipo]}</p>
                {doc?.notas && (
                  <p className="text-xs text-text-muted truncate">{doc.notas}</p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1.5 shrink-0">
                {doc ? (
                  <>
                    <button
                      onClick={() => setPreview(doc)}
                      className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted"
                      title="Ver"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setNotaDocId(doc.id); setNotaText(doc.notas ?? ""); }}
                      className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted"
                      title="Nota"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => eliminar(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      title="Eliminar"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUpload(tipo, file);
                        e.target.value = "";
                      }}
                    />
                    <span
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      style={{
                        background: "var(--brand-primary)",
                        color: "white",
                        opacity: isUploading ? 0.7 : 1,
                      }}
                    >
                      {isUploading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      Subir
                    </span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Preview */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold text-text-primary">{TIPO_LABELS[preview.tipo]}</p>
                {preview.notas && <p className="text-xs text-text-muted">{preview.notas}</p>}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={preview.urlCloudinary}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-raised"
                >
                  Descargar
                </a>
                <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4">
              {preview.esImagen ? (
                <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                  <Image
                    src={preview.urlCloudinary}
                    alt={TIPO_LABELS[preview.tipo]}
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <FileText className="w-12 h-12 text-text-muted" />
                  <p className="text-sm text-text-secondary">Archivo PDF</p>
                  <a
                    href={preview.urlCloudinary}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-sm"
                  >
                    Abrir PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nota */}
      {notaDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <p className="font-semibold text-text-primary">Agregar nota</p>
              <button onClick={() => setNotaDocId(null)} className="p-1 rounded-lg hover:bg-surface-raised text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={notaText}
                onChange={(e) => setNotaText(e.target.value)}
                className="input-base w-full text-sm min-h-[80px] resize-none"
                placeholder="Ej: Vence en diciembre 2025..."
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={() => setNotaDocId(null)} className="btn-outline text-sm flex-1">Cancelar</button>
                <button onClick={guardarNota} disabled={savingNota} className="btn-primary text-sm flex-1 flex items-center justify-center gap-2">
                  {savingNota && <Loader2 className="w-3 h-3 animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
