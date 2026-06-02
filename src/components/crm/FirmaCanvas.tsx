"use client";

import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, RotateCcw, Save, PenLine } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface Props {
  inmobiliariaId: string;
  firmaActual: string | null;
  onGuardada: (url: string) => void;
}

export function FirmaCanvas({ inmobiliariaId, firmaActual, onGuardada }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [reemplazando, setReemplazando] = useState(!firmaActual);

  // ── Sincronizar resolución interna del canvas con su tamaño renderizado ──────
  // Sin esto, si el canvas tiene width=500 interno pero se muestra más angosto,
  // las coordenadas del mouse no coinciden y el trazo aparece desplazado.
  useEffect(() => {
    if (!reemplazando) return;

    function syncSize() {
      const container = containerRef.current;
      const canvas = sigRef.current?.getCanvas();
      if (!container || !canvas) return;

      const { width } = container.getBoundingClientRect();
      if (width === 0 || canvas.width === Math.round(width)) return;

      // Guardar el contenido actual (si lo hay) para restaurarlo tras el resize
      const dataUrl = canvas.toDataURL();
      canvas.width = Math.round(width);
      canvas.height = 150;

      // Restaurar si había trazo
      if (!sigRef.current?.isEmpty()) {
        const img = new Image();
        img.onload = () => canvas.getContext("2d")?.drawImage(img, 0, 0);
        img.src = dataUrl;
      }
    }

    // Sincronizar al montar
    syncSize();

    // Re-sincronizar si la ventana cambia de tamaño (ej: panel lateral)
    const observer = new ResizeObserver(syncSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [reemplazando]);

  async function handleGuardar() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Dibujá tu firma antes de guardar");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "firma.png", { type: "image/png" });

      const result = await uploadToCloudinary(file, `firmas/${inmobiliariaId}`);

      const apiRes = await fetch(`/api/inmobiliarias/${inmobiliariaId}/firma`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmaUrl: result.secure_url }),
      });
      if (!apiRes.ok) throw new Error();

      onGuardada(result.secure_url);
      setReemplazando(false);
      toast.success("Firma guardada correctamente");
    } catch {
      toast.error("Error al guardar la firma");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview firma actual */}
      {firmaActual && !reemplazando && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Firma guardada</p>
          <div
            className="rounded-xl border p-4 flex items-center justify-between gap-4"
            style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}
          >
            <img
              src={firmaActual}
              alt="Firma actual"
              className="h-14 max-w-[220px] object-contain"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.12))" }}
            />
            <button
              type="button"
              onClick={() => setReemplazando(true)}
              className="btn-ghost text-xs flex items-center gap-1.5 shrink-0"
            >
              <PenLine size={13} /> Reemplazar
            </button>
          </div>
        </div>
      )}

      {/* Canvas de dibujo */}
      {reemplazando && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
            {firmaActual ? "Nueva firma" : "Dibujá tu firma"}
          </p>

          {/* El ref va en el contenedor para poder medir su ancho real */}
          <div
            ref={containerRef}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)", touchAction: "none", background: "#fff" }}
          >
            {/*
              NO poner width ni height en canvasProps — se fijan dinámicamente
              por el ResizeObserver para que el sistema de coordenadas del canvas
              coincida exactamente con el tamaño visible.
            */}
            <SignatureCanvas
              ref={sigRef}
              penColor="#1A1612"
              canvasProps={{
                height: 150,
                style: { display: "block", width: "100%" },
              }}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => sigRef.current?.clear()}
              className="btn-ghost text-sm flex items-center gap-1.5"
            >
              <RotateCcw size={13} /> Limpiar
            </button>
            {firmaActual && (
              <button
                type="button"
                onClick={() => setReemplazando(false)}
                className="btn-ghost text-sm"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleGuardar}
              disabled={uploading}
              className="btn-primary text-sm flex items-center gap-1.5 ml-auto"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {uploading ? "Guardando…" : "Guardar firma"}
            </button>
          </div>
        </div>
      )}

      {/* Aviso legal */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#FFFBEB", borderLeft: "4px solid #D4A853" }}
      >
        <p className="text-sm font-semibold" style={{ color: "#92400E" }}>⚠️ Aviso</p>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: "#78350F" }}>
          Esta es una firma electrónica (imagen de tu firma), no una firma digital certificada por AFIP (Ley 25.506).
        </p>
      </div>
    </div>
  );
}
