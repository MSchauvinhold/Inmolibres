import type { CSSProperties } from "react";
import type { EstadoPropiedad } from "@prisma/client";
import { ESTADO_PROPIEDAD_LABELS } from "@/lib/utils";

// Sello de estado comercial sobre la foto de portada (card interna, card del portal,
// portada de la galería del detalle y popup del mapa): oscurece un poco la foto y
// estampa "Reservada/Alquilada/Vendida" tipo sello de goma, en paleta del sistema.
// Es solo visual: la propiedad sigue publicada igual; sacarla del portal es otra acción
// ("Pausar publicación").
//
// Sin z-index a propósito: se pinta por orden de DOM. Renderizarlo DESPUÉS de la imagen
// y ANTES de los badges (operación, logo, "Ver galería") para que esos queden encima.

const SELLO = {
  velo: "rgba(20,17,14,0.38)",       // antracita-900 translúcido
  color: "#E0A088",                  // terracota-300 (hex: también se usa en el HTML del mapa)
  fondo: "rgba(20,17,14,0.22)",
} as const;

const TAMANOS = {
  sm: { fontSize: 14, borde: 2, padding: "4px 10px", radio: 6, offset: 2 },  // popup del mapa, card interna
  md: { fontSize: 21, borde: 3, padding: "6px 16px", radio: 8, offset: 3 },  // card del portal
  lg: { fontSize: 34, borde: 4, padding: "10px 26px", radio: 10, offset: 4 }, // portada del detalle
} as const;

interface Props {
  estado: EstadoPropiedad;
  size?: keyof typeof TAMANOS;
}

export function EstadoRibbon({ estado, size = "md" }: Props) {
  if (estado === "DISPONIBLE") return null;
  const t = TAMANOS[size];

  const velo: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: SELLO.velo,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    userSelect: "none",
  };

  const sello: CSSProperties = {
    transform: "rotate(-12deg)",
    border: `${t.borde}px solid ${SELLO.color}`,
    outline: `${Math.max(1, t.borde - 1)}px solid ${SELLO.color}`,
    outlineOffset: t.offset,
    borderRadius: t.radio,
    padding: t.padding,
    background: SELLO.fondo,
    color: SELLO.color,
    fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
    fontSize: t.fontSize,
    fontWeight: 800,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    lineHeight: 1,
    whiteSpace: "nowrap",
    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
  };

  return (
    <span style={velo} aria-label={ESTADO_PROPIEDAD_LABELS[estado]}>
      <span style={sello}>{ESTADO_PROPIEDAD_LABELS[estado]}</span>
    </span>
  );
}

/** Mismo sello (tamaño sm) como HTML, para popups de Leaflet armados como string. */
export function estadoRibbonHtml(estado: EstadoPropiedad): string {
  if (estado === "DISPONIBLE") return "";
  const t = TAMANOS.sm;
  return `<span style="position:absolute;inset:0;background:${SELLO.velo};display:flex;align-items:center;justify-content:center;pointer-events:none;"><span style="transform:rotate(-12deg);border:${t.borde}px solid ${SELLO.color};outline:1px solid ${SELLO.color};outline-offset:${t.offset}px;border-radius:${t.radio}px;padding:${t.padding};background:${SELLO.fondo};color:${SELLO.color};font-family:system-ui,sans-serif;font-size:${t.fontSize}px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;line-height:1;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.25);">${ESTADO_PROPIEDAD_LABELS[estado]}</span></span>`;
}
