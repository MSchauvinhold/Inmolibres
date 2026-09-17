"use client";

import type { ReactNode } from "react";

// Estructura visual compartida de los Kanban del CRM (Prospectos, Contactos):
// columnas con barra de color, contador, tarjetas il-card y el select "Mover a…".
// El contenido de cada tarjeta lo define la pantalla con renderCard.

export type KanbanTone = "info" | "neutral" | "warning" | "accent" | "success" | "danger";

export interface KanbanColumna<K extends string> {
  key: K;
  label: string;
  tone: KanbanTone;
}

const TONE_BAR: Record<KanbanTone, string> = {
  info:    "var(--info-500, #3B82F6)",
  neutral: "var(--antracita-500, #6B6459)",
  warning: "var(--warning-500, #F59E0B)",
  accent:  "#7C3AED",
  success: "var(--success-500, #22C55E)",
  danger:  "var(--danger-500, #EF4444)",
};

interface Props<T, K extends string> {
  columnas: KanbanColumna<K>[];
  items: T[];
  getId: (item: T) => string;
  getColumna: (item: T) => K;
  renderCard: (item: T) => ReactNode;
  /** Texto de la columna vacía (ej: "Sin prospectos") */
  vacio: string;
  /** Si no se pasa, las tarjetas no se pueden mover (columnas calculadas) */
  onMover?: (item: T, destino: K) => void;
  moviendoId?: string | null;
}

export function KanbanBoard<T, K extends string>({
  columnas, items, getId, getColumna, renderCard, vacio, onMover, moviendoId,
}: Props<T, K>) {
  return (
    <div style={{ overflowX: "auto", paddingBottom: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columnas.length}, minmax(180px, 1fr))`,
          gap: 12,
          minHeight: 480,
        }}
      >
        {columnas.map((col) => {
          const grupo = items.filter((item) => getColumna(item) === col.key);

          return (
            <div
              key={col.key}
              style={{
                background: "var(--crema-100, #F0E9DC)",
                borderRadius: 12,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                border: "1px solid var(--border)",
                borderTop: `3px solid ${TONE_BAR[col.tone]}`,
              }}
            >
              {/* Column header */}
              <div style={{ padding: "4px 6px" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--antracita-900)" }}>
                  {col.label}
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--antracita-300)", marginLeft: 6 }}>
                  {grupo.length}
                </span>
              </div>

              {/* Cards */}
              {grupo.map((item) => {
                const id = getId(item);
                return (
                  <div
                    key={id}
                    className="il-card"
                    style={{ padding: 12, paddingBottom: 18, position: "relative", cursor: "default" }}
                  >
                    {renderCard(item)}

                    {/* Mover select */}
                    {onMover && (
                      <div style={{ marginTop: 8 }}>
                        <select
                          value=""
                          disabled={moviendoId === id}
                          onChange={(e) => {
                            if (e.target.value) onMover(item, e.target.value as K);
                          }}
                          style={{
                            width: "100%",
                            fontSize: 10,
                            padding: "3px 6px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--crema-50, #FBF8F2)",
                            color: "var(--antracita-500)",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">Mover a…</option>
                          {columnas.filter((c) => c.key !== col.key).map((target) => (
                            <option key={target.key} value={target.key}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty state */}
              {grupo.length === 0 && (
                <div
                  style={{
                    padding: "28px 12px",
                    textAlign: "center",
                    fontSize: 11.5,
                    color: "var(--antracita-300)",
                    border: "1px dashed var(--border)",
                    borderRadius: 10,
                    fontStyle: "italic",
                  }}
                >
                  {vacio}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Etiqueta chica apoyada en el borde inferior de la tarjeta (origen del lead, rol del contacto…) */
export function KanbanCardBadge({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: -1,
        left: 12,
        fontSize: 9,
        color: "var(--antracita-300)",
        background: "#fff",
        padding: "0 6px",
        borderRadius: 4,
        transform: "translateY(50%)",
        lineHeight: "16px",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}
