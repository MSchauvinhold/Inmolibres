/**
 * Marcador de precio del mapa: pill tipo "callout" con cola apuntando hacia abajo,
 * dibujado como SVG inline dentro de un L.divIcon.
 *
 * La punta de la cola es el punto que señala la coordenada real: el iconAnchor se
 * calcula para caer exactamente ahí (centro horizontal, borde inferior), no en el
 * centro del pill.
 */

import type * as LeafletNS from "leaflet";

export type TipoPublicacion = "venta" | "alquiler" | "temporario";

/**
 * Colores por tipo de publicación.
 * Venta usa el token de marca; alquiler y temporario conservan los tonos históricos
 * del mapa (no hay token equivalente en la paleta y se decidió mantenerlos).
 */
const COLOR_POR_TIPO: Record<TipoPublicacion, string> = {
  venta:      "var(--terracota-500, #C1694F)",
  alquiler:   "#2980B9",
  temporario: "#2D6A4F",
};

// ─── Geometría ────────────────────────────────────────────────────────────────

const FONT_SIZE = 12;
const FONT = `700 ${FONT_SIZE}px system-ui, -apple-system, sans-serif`;
const PAD_X = 11;          // padding horizontal a cada lado del texto
const PILL_H = 24;         // alto del rectángulo (sin la cola)
const TAIL_W = 10;         // ancho de la base de la cola
const TAIL_H = 7;          // alto de la cola
const RADIUS = 8;          // rx del rectángulo redondeado
const MIN_W = 52;          // no achicar más que esto (precios cortos)
const MAX_W = 220;         // tope para montos muy largos ($ 200.000.000 entra holgado)

/**
 * Mide el ancho real del texto con canvas. Cae a una aproximación por cantidad de
 * caracteres si no hay DOM disponible (SSR) o si el contexto 2D no está.
 */
let medidor: CanvasRenderingContext2D | null = null;

function medirTexto(texto: string): number {
  if (typeof document === "undefined") return texto.length * FONT_SIZE * 0.62;
  if (!medidor) {
    medidor = document.createElement("canvas").getContext("2d");
  }
  if (!medidor) return texto.length * FONT_SIZE * 0.62;
  medidor.font = FONT;
  return medidor.measureText(texto).width;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Path del callout completo: rectángulo redondeado + cola centrada abajo que
 * termina en punta. Se dibuja como una sola figura para que el borde y la sombra
 * envuelvan también la cola.
 */
function buildCalloutPath(w: number): string {
  const cx = w / 2;
  const h = PILL_H;
  const half = TAIL_W / 2;
  const tipY = PILL_H + TAIL_H;

  return [
    `M ${RADIUS} 0`,
    `H ${w - RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${w} ${RADIUS}`,
    `V ${h - RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${w - RADIUS} ${h}`,
    `H ${cx + half}`,
    `L ${cx} ${tipY}`,      // punta de la cola
    `L ${cx - half} ${h}`,
    `H ${RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 0 ${h - RADIUS}`,
    `V ${RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} 0`,
    "Z",
  ].join(" ");
}

/** Traduce el enum de operación de la base al tipo visual del marcador. */
export function tipoDeOperacion(operacion: string): TipoPublicacion {
  if (operacion === "ALQUILER") return "alquiler";
  if (operacion === "ALQUILER_TEMPORARIO") return "temporario";
  return "venta";
}

/** Ancho del pill en función del texto, acotado entre MIN_W y MAX_W. */
export function anchoParaPrecio(precio: string): number {
  const textoW = medirTexto(precio);
  return Math.round(Math.min(MAX_W, Math.max(MIN_W, textoW + PAD_X * 2)));
}

/**
 * Devuelve el L.divIcon del marcador de precio.
 *
 * Recibe la instancia de Leaflet porque los mapas la cargan con `await import("leaflet")`
 * (evita romper el SSR); importarla estáticamente acá anularía esa protección.
 */
export function createPriceMarkerIcon(
  L: typeof LeafletNS,
  precio: string,
  tipo: TipoPublicacion
): LeafletNS.DivIcon {
  const w = anchoParaPrecio(precio);
  const h = PILL_H + TAIL_H;
  const color = COLOR_POR_TIPO[tipo] ?? COLOR_POR_TIPO.venta;

  const svg = `
<svg class="price-callout" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(precio)}">
  <path d="${buildCalloutPath(w)}" fill="${color}" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" stroke-linejoin="round"/>
  <text x="${w / 2}" y="${PILL_H / 2}" text-anchor="middle" dominant-baseline="central"
        fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif"
        font-size="${FONT_SIZE}" font-weight="700" letter-spacing="0.01em"
    >${escapeHtml(precio)}</text>
</svg>`.trim();

  return L.divIcon({
    html: `<div class="price-callout-wrap">${svg}</div>`,
    className: "",
    iconSize: L.point(w, h),
    // La punta de la cola (centro horizontal, borde inferior) es lo que apunta a la coordenada.
    iconAnchor: L.point(w / 2, h),
    popupAnchor: L.point(0, -h),
  });
}

/** Estilos del marcador. Se inyectan una vez junto al resto de estilos del mapa. */
export const PRICE_MARKER_STYLES = `
  .price-callout-wrap {
    cursor: pointer;
    pointer-events: auto;
    line-height: 0;
    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.28));
    transition: transform 0.15s ease, filter 0.15s ease;
    transform-origin: 50% 100%;
  }
  .price-callout-wrap:hover {
    transform: scale(1.12);
    filter: drop-shadow(0 6px 14px rgba(0,0,0,0.34));
    z-index: 9999 !important;
  }
  .price-callout { display: block; overflow: visible; }
`;
