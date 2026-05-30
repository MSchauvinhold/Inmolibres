"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, X, Film, Link2 } from "lucide-react";
import { uploadVideoToCloudinary, MAX_VIDEO_BYTES } from "@/lib/cloudinary";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

const FOLDER = "inmolibres/videos";

function esLinkExterno(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}
function esArchivoCloudinary(url: string): boolean {
  return url.includes("cloudinary.com");
}

export function VideoUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [linkInput, setLinkInput] = useState(esLinkExterno(value) ? value : "");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("El archivo debe ser un video");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`El video supera los 50 MB (pesa ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadVideoToCloudinary(file, FOLDER, setProgress);
      onChange(result.secure_url);
      setLinkInput("");
      toast.success("Video subido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el video");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function aplicarLink() {
    const url = linkInput.trim();
    if (!url) return;
    if (!esLinkExterno(url)) {
      toast.error("Pegá un link válido de YouTube o Vimeo");
      return;
    }
    onChange(url);
    toast.success("Link de video agregado");
  }

  function quitar() {
    onChange("");
    setLinkInput("");
  }

  // ─── Si ya hay un video cargado ───────────────────────────────
  if (value) {
    return (
      <div
        className="rounded-xl border p-3 flex items-center gap-3"
        style={{ borderColor: "#D4D0CB", background: "#FAFAF8" }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: esLinkExterno(value) ? "rgba(255,0,0,0.08)" : "var(--terracota-100, #FCEAE4)" }}
        >
          {esLinkExterno(value)
            ? <Link2 className="w-5 h-5" style={{ color: "#FF0000" }} />
            : <Film className="w-5 h-5" style={{ color: "var(--terracota-600, #A85737)" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {esLinkExterno(value) ? "Link de video externo" : "Video subido"}
          </p>
          <p className="text-xs text-text-muted truncate">{value}</p>
        </div>
        {esArchivoCloudinary(value) && (
          <video
            src={value}
            className="w-16 h-10 rounded object-cover shrink-0 hidden sm:block"
            style={{ background: "#000" }}
            muted
          />
        )}
        <button
          type="button"
          onClick={quitar}
          className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          title="Quitar video"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ─── Sin video: subir archivo o pegar link ───────────────────
  return (
    <div className="space-y-3">
      {/* Subir archivo */}
      <div
        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 px-4 cursor-pointer transition-colors"
        style={{ borderColor: uploading ? "var(--terracota-400)" : "#D4D0CB" }}
        onClick={() => !uploading && fileRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--terracota-500)" }} />
            <p className="text-sm font-medium text-text-primary">Subiendo… {progress}%</p>
            <div className="w-full max-w-[200px] h-1.5 rounded-full overflow-hidden" style={{ background: "#E8E5E0" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--terracota-500)" }} />
            </div>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6" style={{ color: "#9a9a9a" }} />
            <p className="text-sm font-medium text-text-primary">Subir video desde tu dispositivo</p>
            <p className="text-xs text-text-muted">MP4, MOV o WebM · máximo 50 MB</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          onChange={handleFile}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "#E8E5E0" }} />
        <span className="text-xs text-text-muted">o pegá un link</span>
        <div className="flex-1 h-px" style={{ background: "#E8E5E0" }} />
      </div>

      {/* Link de YouTube/Vimeo */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: "#D4D0CB", background: "#FAFAF8" }}>
          <Link2 className="w-4 h-4 shrink-0" style={{ color: "#9a9a9a" }} />
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 bg-transparent py-2.5 text-sm outline-none"
            style={{ color: "var(--antracita-900)" }}
          />
        </div>
        <button
          type="button"
          onClick={aplicarLink}
          className="px-4 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{ background: "var(--terracota-500, #C1694F)" }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
