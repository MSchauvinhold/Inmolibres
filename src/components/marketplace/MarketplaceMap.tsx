"use client";

import { useEffect, useRef } from "react";

export interface MapProperty {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  operacion: "VENTA" | "ALQUILER" | "ALQUILER_TEMPORARIO";
  precio: number;
  moneda: string;
  latitud: number;
  longitud: number;
  inmobiliariaId: string;
  inmobiliariaNombre: string | null;
  fotoUrl?: string | null;
  whatsapp?: string | null;
}

interface MarketplaceMapProps {
  properties: MapProperty[];
  className?: string;
}

const OPERACION_COLOR: Record<string, string> = {
  VENTA: "#C1694F",
  ALQUILER: "#2980B9",
  ALQUILER_TEMPORARIO: "#2D6A4F",
};

const OPERACION_LABEL: Record<string, string> = {
  VENTA: "Venta",
  ALQUILER: "Alquiler",
  ALQUILER_TEMPORARIO: "Temporario",
};

const DEFAULT_CENTER: [number, number] = [-29.7139, -57.0847];

function formatPrecio(precio: number, moneda: string): string {
  const num = Math.round(precio).toLocaleString("es-AR");
  return moneda === "USD" ? `U$S ${num}` : `$ ${num}`;
}

function sanitizeWhatsapp(raw: string): string {
  return raw.replace(/\D/g, "");
}

function buildPopupHtml(prop: MapProperty): string {
  const color = OPERACION_COLOR[prop.operacion] ?? "#C1694F";
  const opLabel = OPERACION_LABEL[prop.operacion] ?? prop.operacion;
  const precioLabel = formatPrecio(prop.precio, prop.moneda);

  const fotoHtml = prop.fotoUrl
    ? `<img src="${prop.fotoUrl}" alt="" style="width:240px;height:130px;object-fit:cover;display:block;" />`
    : `<div style="width:240px;height:80px;background:#f0ede8;display:flex;align-items:center;justify-content:center;"><span style="color:#9c9590;font-size:12px;font-family:system-ui;">Sin foto</span></div>`;

  const wpNum = prop.whatsapp ? sanitizeWhatsapp(prop.whatsapp) : null;
  const wpLink = wpNum
    ? `<a href="https://wa.me/${wpNum}?text=Hola!%20Me%20interesa%20la%20propiedad%20%22${encodeURIComponent(prop.titulo)}%22" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;font-size:11px;font-weight:700;padding:7px 6px;background:#25D366;color:white;border-radius:8px;text-decoration:none;display:block;">WhatsApp</a>`
    : "";

  return `
    <div style="width:240px;font-family:system-ui,sans-serif;overflow:hidden;border-radius:12px;">
      ${fotoHtml}
      <div style="padding:10px 12px 12px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1a1612;line-height:1.3;">${prop.titulo}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${color};color:white;">${opLabel}</span>
          <span style="font-size:12px;font-weight:700;color:#1a1612;">${precioLabel}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <a href="/propiedades/${prop.inmobiliariaId}/${prop.slug}" style="flex:1;text-align:center;font-size:11px;font-weight:700;padding:7px 6px;background:#2C2C2C;color:white;border-radius:8px;text-decoration:none;display:block;">Ver propiedad</a>
          ${wpLink}
        </div>
      </div>
    </div>
  `;
}

const MAP_STYLES = `
  .price-marker-wrap {
    position: relative;
    width: 0;
    height: 0;
  }
  .price-pill {
    position: absolute;
    transform: translate(-50%, -100%) translateY(-4px);
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    font-family: system-ui, sans-serif;
    line-height: 1;
    border: 2px solid rgba(255,255,255,0.25);
    letter-spacing: 0.01em;
    pointer-events: auto;
  }
  .price-pill::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px 4px 0;
    border-style: solid;
    border-color: inherit;
    border-left-color: transparent;
    border-right-color: transparent;
    border-bottom-color: transparent;
  }
  .price-pill:hover {
    transform: translate(-50%, -100%) translateY(-4px) scale(1.1);
    box-shadow: 0 6px 18px rgba(0,0,0,0.32);
    z-index: 9999 !important;
  }
  .mc-brand {
    background: rgba(27,67,50,0.14) !important;
    border: 2px solid #1B4332 !important;
    border-radius: 50% !important;
  }
  .mc-brand div {
    background: #1B4332 !important;
    color: white !important;
    font-weight: 700 !important;
    font-size: 13px !important;
    font-family: system-ui, sans-serif !important;
    border-radius: 50% !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
  }
  .leaflet-popup-content-wrapper {
    border-radius: 12px !important;
    box-shadow: 0 8px 28px rgba(0,0,0,0.15) !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
  }
  .leaflet-popup-close-button {
    z-index: 1 !important;
    color: white !important;
    background: rgba(0,0,0,0.35) !important;
    border-radius: 50% !important;
    width: 20px !important;
    height: 20px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    top: 6px !important;
    right: 6px !important;
    font-size: 14px !important;
    line-height: 1 !important;
    padding: 0 !important;
  }
`;

export function MarketplaceMap({ properties, className = "w-full h-full" }: MarketplaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let alive = true;

    (async () => {
      // Load Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const el = Object.assign(document.createElement("link"), {
          id: "leaflet-css", rel: "stylesheet",
          href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        });
        document.head.appendChild(el);
      }
      // Load MarkerCluster CSS
      if (!document.getElementById("mcluster-css")) {
        const el = Object.assign(document.createElement("link"), {
          id: "mcluster-css", rel: "stylesheet",
          href: "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
        });
        document.head.appendChild(el);
      }
      // Inject custom styles once
      if (!document.getElementById("mp-map-styles")) {
        const s = document.createElement("style");
        s.id = "mp-map-styles";
        s.textContent = MAP_STYLES;
        document.head.appendChild(s);
      }

      const leafletNS = await import("leaflet");

      // The ESM module namespace is sealed (non-extensible by spec).
      // leaflet.markercluster needs to attach properties to the L object,
      // so we pass it the mutable default export, not the namespace.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = ((leafletNS as any).default ?? leafletNS) as typeof leafletNS;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).L = L;
      await import("leaflet.markercluster");

      if (!alive || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LG = L as any;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        preferCanvas: false,
      }).setView(DEFAULT_CENTER, 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Cluster group with brand styling
      const cluster = LG.markerClusterGroup({
        maxClusterRadius: 55,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        iconCreateFunction: (c: any) => {
          const n = c.getChildCount();
          const sz = n < 10 ? 36 : n < 100 ? 42 : 50;
          const inner = sz - 8;
          return L.divIcon({
            html: `<div style="width:${inner}px;height:${inner}px;">${n}</div>`,
            className: "mc-brand",
            iconSize: L.point(sz, sz),
            iconAnchor: L.point(sz / 2, sz / 2),
          });
        },
      });

      // Add a marker per property
      properties.forEach((prop) => {
        const color = OPERACION_COLOR[prop.operacion] ?? "#C1694F";
        const label = formatPrecio(prop.precio, prop.moneda);

        const icon = L.divIcon({
          html: `<div class="price-marker-wrap"><div class="price-pill" style="background:${color};">${label}</div></div>`,
          className: "",
          iconSize: L.point(0, 0),
          iconAnchor: L.point(0, 0),
        });

        const marker = L.marker([prop.latitud, prop.longitud], { icon });
        marker.bindPopup(buildPopupHtml(prop), {
          maxWidth: 260,
          minWidth: 240,
          offset: L.point(0, -6),
        });

        cluster.addLayer(marker);
      });

      map.addLayer(cluster);

      // Fit bounds to markers, fall back to default center
      if (properties.length > 0) {
        try {
          map.fitBounds(cluster.getBounds(), { padding: [40, 40], maxZoom: 15 });
        } catch {
          /* default view already set */
        }
      }
    })();

    return () => {
      alive = false;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  // The map is initialized once; property changes would require a remount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
