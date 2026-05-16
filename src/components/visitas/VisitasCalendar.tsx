"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const ESTADO_COLORS = {
  PENDIENTE: "bg-amber-400",
  REALIZADA: "bg-green-500",
  CANCELADA: "bg-red-400",
} as const;

const ESTADO_LABELS = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  REALIZADA: "bg-green-100 text-green-800",
  CANCELADA: "bg-red-100 text-red-800",
} as const;

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_CORTOS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

export function VisitasCalendar({ visitas }: Props) {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(hoy.getDate());

  function prevMes() {
    if (mes === 0) { setMes(11); setAnio((a) => a - 1); }
    else setMes((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMes() {
    if (mes === 11) { setMes(0); setAnio((a) => a + 1); }
    else setMes((m) => m + 1);
    setSelectedDay(null);
  }

  // Días del mes
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  // Visitas indexadas por día
  const visitasPorDia = new Map<number, Visita[]>();
  visitas.forEach((v) => {
    const d = new Date(v.fechaHora);
    if (d.getFullYear() === anio && d.getMonth() === mes) {
      const dia = d.getDate();
      if (!visitasPorDia.has(dia)) visitasPorDia.set(dia, []);
      visitasPorDia.get(dia)!.push(v);
    }
  });

  // Visitas del día seleccionado
  const visitasDelDia = selectedDay ? (visitasPorDia.get(selectedDay) ?? []) : [];

  const celdas = Array.from({ length: primerDia + diasEnMes }, (_, i) =>
    i < primerDia ? null : i - primerDia + 1
  );
  // Pad to full weeks
  while (celdas.length % 7 !== 0) celdas.push(null);

  return (
    <div className="space-y-4">
      {/* Header navegación */}
      <div className="flex items-center justify-between">
        <button onClick={prevMes} className="p-1.5 rounded-lg hover:bg-surface-raised transition-colors">
          <ChevronLeft className="w-4 h-4 text-text-secondary" />
        </button>
        <p className="text-sm font-semibold text-text-primary">
          {MESES[mes]} {anio}
        </p>
        <button onClick={nextMes} className="p-1.5 rounded-lg hover:bg-surface-raised transition-colors">
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Días de la semana */}
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-text-muted py-1">
            {d}
          </div>
        ))}

        {/* Celdas */}
        {celdas.map((dia, i) => {
          if (dia === null) return <div key={`empty-${i}`} />;
          const esHoy = dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
          const visitsHoy = visitasPorDia.get(dia) ?? [];
          const isSelected = dia === selectedDay;

          return (
            <button
              key={dia}
              onClick={() => setSelectedDay(dia === selectedDay ? null : dia)}
              className={`relative flex flex-col items-center pt-1.5 pb-1 rounded-xl transition-colors min-h-[48px] ${
                isSelected
                  ? "bg-brand-primary text-white"
                  : esHoy
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "hover:bg-surface-raised text-text-primary"
              }`}
            >
              <span className={`text-xs font-medium leading-none ${esHoy && !isSelected ? "font-bold" : ""}`}>
                {dia}
              </span>
              {visitsHoy.length > 0 && (
                <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                  {visitsHoy.slice(0, 3).map((v) => (
                    <span
                      key={v.id}
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/80" : ESTADO_COLORS[v.estado]}`}
                    />
                  ))}
                  {visitsHoy.length > 3 && (
                    <span className={`text-[8px] leading-none ${isSelected ? "text-white/70" : "text-text-muted"}`}>
                      +{visitsHoy.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-[10px] text-text-muted">
        {(["PENDIENTE","REALIZADA","CANCELADA"] as const).map((e) => (
          <span key={e} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${ESTADO_COLORS[e]}`} />
            {e === "PENDIENTE" ? "Pendiente" : e === "REALIZADA" ? "Realizada" : "Cancelada"}
          </span>
        ))}
      </div>

      {/* Detalle del día */}
      {selectedDay && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
            {selectedDay} de {MESES[mes]}
          </p>
          {visitasDelDia.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">Sin visitas este día</p>
          ) : (
            visitasDelDia
              .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())
              .map((v) => {
                const hora = new Date(v.fechaHora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={v.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-raised">
                    <div className="text-center min-w-[36px] shrink-0">
                      <p className="text-sm font-bold text-brand-primary leading-none">{hora}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{v.propiedad.titulo}</p>
                      <p className="text-xs text-text-muted">{v.cliente.nombre} · {v.agente.nombre}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${ESTADO_LABELS[v.estado]}`}>
                      {v.estado}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
