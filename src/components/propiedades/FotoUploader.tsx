"use client";

import { useState, useRef } from "react";
import { Upload, X, Star, Loader2 } from "lucide-react";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary";
import { toast } from "sonner";
import type { CloudinaryUploadResult } from "@/lib/cloudinary";

export interface FotoData {
  urlCloudinary: string;
  orden: number;
  esPortada: boolean;
}

interface Props {
  value: FotoData[];
  onChange: (fotos: FotoData[]) => void;
  maxFotos?: number;
}

export function FotoUploader({ value, onChange, maxFotos = 15 }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const folder = "inmolibres/propiedades";

  async function handleFiles(files: FileList) {
    const remaining = maxFotos - value.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${maxFotos} fotos por propiedad`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const results: CloudinaryUploadResult[] = [];
      for (const file of toUpload) {
        const compressed = await compressImage(file);
        const result = await uploadToCloudinary(compressed, folder);
        results.push(result);
      }
      const newFotos: FotoData[] = results.map((r, i) => ({
        urlCloudinary: r.secure_url,
        orden: value.length + i,
        esPortada: value.length === 0 && i === 0,
      }));
      onChange([...value, ...newFotos]);
    } catch {
      toast.error("Error al subir fotos");
    } finally {
      setUploading(false);
    }
  }

  function remove(idx: number) {
    const next = value.filter((_, i) => i !== idx).map((f, i) => ({ ...f, orden: i }));
    if (next.length > 0 && !next.some((f) => f.esPortada)) {
      next[0].esPortada = true;
    }
    onChange(next);
  }

  function setPortada(idx: number) {
    onChange(value.map((f, i) => ({ ...f, esPortada: i === idx })));
  }

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          uploading
            ? "border-brand-primary/40 bg-brand-primary/5 cursor-not-allowed"
            : "border-border hover:border-brand-primary/50 hover:bg-surface-raised"
        }`}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto mb-2" />
        ) : (
          <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
        )}
        <p className="text-sm text-text-secondary">
          {uploading ? "Subiendo..." : "Arrastrá fotos aquí o hacé clic"}
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          {value.length}/{maxFotos} fotos · JPG, PNG
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Preview grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((foto, idx) => (
            <div key={foto.urlCloudinary + idx} className="relative group aspect-square rounded-lg overflow-hidden bg-surface-raised">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.urlCloudinary} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => setPortada(idx)}
                  title="Marcar como portada"
                  className={`p-1 rounded-full ${foto.esPortada ? "bg-brand-accent text-[#1B4332]" : "bg-white/20 text-white hover:bg-white/40"}`}
                >
                  <Star className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-1 rounded-full bg-danger/80 text-white hover:bg-danger"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {foto.esPortada && (
                <div className="absolute bottom-0 left-0 right-0 bg-brand-accent/90 text-[#1B4332] text-[9px] font-bold text-center py-0.5">
                  PORTADA
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
