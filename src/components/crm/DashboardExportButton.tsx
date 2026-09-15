"use client";

import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv-export";

interface Props {
  kpis: { label: string; valor: number | string }[];
  visitas: { fecha: string; propiedad: string; cliente: string; agente: string }[];
  consultas: { fecha: string; nombre: string; propiedad: string; leida: boolean }[];
  contratosPorVencer: { propiedad: string; inquilino: string; fechaFin: string; diasRestantes: number }[];
}

export function DashboardExportButton({ kpis, visitas, consultas, contratosPorVencer }: Props) {
  function exportar() {
    downloadCsv(`dashboard_${new Date().toISOString().slice(0, 10)}.csv`, [
      {
        titulo: "RESUMEN",
        columnas: ["Indicador", "Valor"],
        filas: kpis.map((k) => [k.label, k.valor]),
      },
      {
        titulo: "VISITAS (HOY Y PRÓXIMAS)",
        columnas: ["Fecha", "Propiedad", "Cliente", "Agente"],
        filas: visitas.map((v) => [v.fecha, v.propiedad, v.cliente, v.agente]),
      },
      {
        titulo: "CONSULTAS RECIENTES",
        columnas: ["Fecha", "Nombre", "Propiedad", "Leída"],
        filas: consultas.map((c) => [c.fecha, c.nombre, c.propiedad, c.leida ? "Sí" : "No"]),
      },
      {
        titulo: "CONTRATOS QUE VENCEN (30 DÍAS)",
        columnas: ["Propiedad", "Inquilino", "Fin de contrato", "Días restantes"],
        filas: contratosPorVencer.map((c) => [c.propiedad, c.inquilino, c.fechaFin, c.diasRestantes]),
      },
    ]);
  }

  return (
    <button
      onClick={exportar}
      className="il-btn il-btn--ghost"
      style={{ height: 34, fontSize: 12.5, gap: 6 }}
    >
      <Download size={13} />
      Exportar
    </button>
  );
}
