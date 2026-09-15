/**
 * Exportación de datos a CSV, client-side (sin pasar por el servidor).
 * Usado en Finanzas, Dashboard y Reportes para mantener el mismo formato.
 */

export type CsvSection = {
  /** Título de la sección (se imprime como una línea sola antes de la tabla). Opcional. */
  titulo?: string;
  columnas: string[];
  filas: (string | number)[][];
};

function escapeCsvValue(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

/** Arma el contenido CSV (con BOM para que Excel reconozca acentos) a partir de una o más secciones. */
export function buildCsv(secciones: CsvSection[]): string {
  const lineas: string[] = [];
  secciones.forEach((s, i) => {
    if (i > 0) lineas.push("");
    if (s.titulo) lineas.push(s.titulo);
    lineas.push(s.columnas.map(escapeCsvValue).join(","));
    for (const fila of s.filas) lineas.push(fila.map(escapeCsvValue).join(","));
  });
  return "﻿" + lineas.join("\n");
}

/** Dispara la descarga de un CSV en el navegador. */
export function downloadCsv(filename: string, secciones: CsvSection[]): void {
  const blob = new Blob([buildCsv(secciones)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
