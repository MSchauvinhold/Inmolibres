"use client";

import { Fragment, useState } from "react";

interface Visita {
  id: string;
  fechaHora: string;
  estado: "PENDIENTE" | "REALIZADA" | "CANCELADA";
  propiedad: { titulo: string; direccion: string };
  cliente: { nombre: string };
  agente: { nombre: string };
}

interface Props {
  visitas: Visita[];
}

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "var(--terracota-500)",
  REALIZADA: "var(--success-500)",
  CANCELADA: "var(--danger-500)",
};

const DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const HORAS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const ROW_H = 52;

function getMondayOf(d: Date): Date {
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const mes = sunday.toLocaleString("es-AR", { month: "long" });
  return `Semana del ${monday.getDate()} al ${sunday.getDate()} de ${mes}`;
}

export function VisitasSemana({ visitas }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const monday = getMondayOf(today);
  monday.setDate(monday.getDate() + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const getVisitas = (day: Date, hour: number) =>
    visitas.filter((v) => {
      const vd = new Date(v.fechaHora);
      return (
        vd.getFullYear() === day.getFullYear() &&
        vd.getMonth() === day.getMonth() &&
        vd.getDate() === day.getDate() &&
        vd.getHours() === hour
      );
    });

  return (
    <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 22px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h3 className="display" style={{ fontSize: 18, margin: 0, color: "var(--antracita-900)" }}>
          {formatWeekLabel(monday)}
        </h3>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: "1px solid var(--border)", background: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "var(--antracita-700)",
            }}
          >
            ←
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            style={{
              height: 28, padding: "0 10px", borderRadius: 8,
              border: "1px solid var(--border)", background: "#fff",
              cursor: "pointer", fontSize: 11, fontWeight: 600,
              color: "var(--antracita-700)",
              fontFamily: "var(--font-jetbrains-mono, monospace)",
            }}
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: "1px solid var(--border)", background: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "var(--antracita-700)",
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `48px repeat(7, 1fr)`,
            minWidth: 600,
          }}
        >
          {/* Corner + Day headers */}
          <div style={{ borderBottom: "1px solid var(--border)" }} />
          {days.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                style={{
                  padding: "10px 0",
                  textAlign: "center",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: "1px solid var(--border)",
                  fontSize: 10.5,
                  color: isToday ? "var(--terracota-600)" : "var(--antracita-500)",
                  fontFamily: "var(--font-jetbrains-mono, monospace)",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  background: isToday ? "var(--terracota-100, #FAE8E2)" : "transparent",
                }}
              >
                {DIAS[i]} {d.getDate()}
              </div>
            );
          })}

          {/* Hour rows */}
          {HORAS.map((h, hi) => (
            <Fragment key={`row-${hi}`}>
              {/* Time label cell */}
              <div
                style={{
                  borderTop: hi === 0 ? "none" : "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  padding: "4px 6px 0",
                  display: "flex",
                  alignItems: "flex-start",
                  height: ROW_H,
                  fontSize: 10.5,
                  color: "var(--antracita-300)",
                  fontFamily: "var(--font-jetbrains-mono, monospace)",
                }}
              >
                {h}:00
              </div>

              {/* Day cells */}
              {days.map((d, di) => {
                const cellVisitas = getVisitas(d, h);
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <div
                    key={`${hi}-${di}`}
                    style={{
                      borderTop: hi === 0 ? "none" : "1px solid var(--border)",
                      borderLeft: "1px solid var(--border)",
                      height: ROW_H,
                      position: "relative",
                      background: isToday ? "rgba(193,105,79,0.03)" : "transparent",
                    }}
                  >
                    {cellVisitas.map((v, vi) => (
                      <div
                        key={v.id}
                        title={`${v.cliente.nombre} · ${v.propiedad.titulo}`}
                        style={{
                          position: "absolute",
                          top: 3,
                          left: 3 + vi * 3,
                          right: 3,
                          bottom: 3,
                          background: ESTADO_COLOR[v.estado] ?? "var(--antracita-500)",
                          borderRadius: 6,
                          padding: "4px 7px",
                          color: "#fff",
                          overflow: "hidden",
                          zIndex: vi + 1,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {v.cliente.nombre}
                        </div>
                        <div
                          style={{
                            fontSize: 9.5,
                            opacity: 0.85,
                            lineHeight: 1.2,
                            marginTop: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {v.propiedad.titulo}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          padding: "10px 22px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "var(--antracita-500)",
        }}
      >
        {[
          { label: "Pendiente", color: "var(--terracota-500)" },
          { label: "Realizada",  color: "var(--success-500)" },
          { label: "Cancelada",  color: "var(--danger-500)" },
        ].map(({ label, color }) => (
          <span key={label} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
