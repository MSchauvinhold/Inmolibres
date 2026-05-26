"use client";

import { useRef, useState } from "react";
import { Upload, Download, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ImportButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ importadas: number; errores: string[] } | null>(null);

  function handleClick() {
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Solo se aceptan archivos .csv");
      return;
    }

    setImporting(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/propiedades/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json() as { importadas: number; errores: string[] };
      setResult(data);
      if (data.importadas > 0) {
        toast.success(`${data.importadas} propiedad${data.importadas !== 1 ? "es" : ""} importada${data.importadas !== 1 ? "s" : ""} (sin publicar)`);
      }
      if (data.errores.length > 0) {
        toast.warning(`${data.errores.length} fila${data.errores.length !== 1 ? "s" : ""} con error`);
      }
    } catch {
      toast.error("Error al importar el archivo");
    } finally {
      setImporting(false);
      // Reset input so el mismo archivo puede volver a seleccionarse
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function downloadTemplate() {
    const res = await fetch("/api/propiedades/import");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_propiedades.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {/* Dropdown-style panel */}
      <div style={{ position: "relative" }}>
        <button
          className="il-btn il-btn--ghost"
          style={{ height: 36, fontSize: 13, gap: 6, color: "var(--antracita-700)" }}
          onClick={handleClick}
          disabled={importing}
          title="Importar propiedades desde CSV"
        >
          <Upload size={14} />
          {importing ? "Importando…" : "Importar CSV"}
        </button>
      </div>

      {/* Resultado */}
      {result && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 200,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "14px 16px",
            minWidth: 280,
            maxWidth: 360,
            boxShadow: "0 8px 32px rgba(58,35,18,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)" }}>
              Resultado de importación
            </span>
            <button
              onClick={() => setResult(null)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--antracita-400)" }}
            >
              <X size={14} />
            </button>
          </div>

          {result.importadas > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--success-600)" }}>
              <CheckCircle2 size={14} />
              {result.importadas} importada{result.importadas !== 1 ? "s" : ""} (sin publicar, revisar antes de publicar)
            </div>
          )}

          {result.errores.length > 0 && (
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--warning-600)", marginBottom: 6 }}>
                <AlertCircle size={14} />
                {result.errores.length} fila{result.errores.length !== 1 ? "s" : ""} con error
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                {result.errores.slice(0, 5).map((err, i) => (
                  <li key={i} style={{ fontSize: 11, color: "var(--antracita-500)", paddingLeft: 22 }}>
                    · {err}
                  </li>
                ))}
                {result.errores.length > 5 && (
                  <li style={{ fontSize: 11, color: "var(--antracita-400)", paddingLeft: 22 }}>
                    · y {result.errores.length - 5} más…
                  </li>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={downloadTemplate}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 11,
              color: "var(--antracita-600)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              width: "fit-content",
            }}
          >
            <Download size={11} />
            Descargar plantilla CSV
          </button>
        </div>
      )}

      {/* Template download link (always available) */}
      {!result && (
        <button
          onClick={downloadTemplate}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            color: "var(--antracita-400)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 4px",
          }}
          title="Descargar plantilla CSV"
        >
          <Download size={11} />
          plantilla
        </button>
      )}
    </>
  );
}
