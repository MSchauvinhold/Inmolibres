"use client";

import { useEffect, useRef, useCallback } from "react";
import type { MapProperty } from "./MarketplaceMap";

interface Props {
  properties: MapProperty[];
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPopupHtml(prop: MapProperty): string {
  const color = OPERACION_COLOR[prop.operacion] ?? "#C1694F";
  const opLabel = OPERACION_LABEL[prop.operacion] ?? prop.operacion;
  const precioLabel = formatPrecio(prop.precio, prop.moneda);
  const safeTitulo = escapeHtml(prop.titulo);
  const safeFotoUrl = prop.fotoUrl?.startsWith("https://") ? prop.fotoUrl : null;

  const fotoHtml = safeFotoUrl
    ? `<img src="${safeFotoUrl}" alt="" style="width:260px;height:140px;object-fit:cover;display:block;" />`
    : `<div style="width:260px;height:80px;background:#f0ede8;display:flex;align-items:center;justify-content:center;"><span style="color:#9c9590;font-size:12px;font-family:system-ui;">Sin foto</span></div>`;

  const wpNum = prop.whatsapp ? prop.whatsapp.replace(/\D/g, "") : null;
  const wpLink = wpNum
    ? `<a href="https://wa.me/${wpNum}?text=Hola!%20Me%20interesa%20${encodeURIComponent(prop.titulo)}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;font-size:11px;font-weight:700;padding:7px 6px;background:#25D366;color:white;border-radius:8px;text-decoration:none;display:block;">WhatsApp</a>`
    : "";

  return `
    <div style="width:260px;font-family:system-ui,sans-serif;overflow:hidden;border-radius:12px;">
      ${fotoHtml}
      <div style="padding:10px 12px 12px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1a1612;line-height:1.3;">${safeTitulo}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${color};color:white;">${opLabel}</span>
          <span style="font-size:13px;font-weight:700;color:#1a1612;">${precioLabel}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <a href="/propiedades/${prop.id}/${prop.slug}" target="_blank" style="flex:1;text-align:center;font-size:11px;font-weight:700;padding:7px 6px;background:#2C2C2C;color:white;border-radius:8px;text-decoration:none;display:block;">Ver detalle</a>
          ${wpLink}
        </div>
      </div>
    </div>
  `;
}

const MAP_STYLES = `
  .price-pill-fs {
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
    transition: transform 0.15s ease, box-shadow 0.15s ease, z-index 0s;
    font-family: system-ui, sans-serif;
    line-height: 1;
    border: 2px solid rgba(255,255,255,0.25);
    letter-spacing: 0.01em;
    pointer-events: auto;
  }
  .price-pill-fs::after {
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
  .price-pill-fs:hover {
    transform: translate(-50%, -100%) translateY(-4px) scale(1.15);
    box-shadow: 0 6px 18px rgba(0,0,0,0.32);
    z-index: 9999 !important;
  }
  .mc-terra {
    background: rgba(193,105,79,0.15) !important;
    border: 2px solid #C1694F !important;
    border-radius: 50% !important;
  }
  .mc-terra div {
    background: #C1694F !important;
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
  .leaflet-popup-content { margin: 0 !important; }
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

export function MapaFullscreen({ properties }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const clusterRef = useRef<unknown>(null);
  const leafletRef = useRef<unknown>(null);

  const initMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (containerRef.current as any)._leaflet_id;

    if (!document.getElementById("leaflet-css")) {
      const el = Object.assign(document.createElement("link"), {
        id: "leaflet-css", rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      });
      document.head.appendChild(el);
    }
    if (!document.getElementById("mcluster-css")) {
      const el = Object.assign(document.createElement("link"), {
        id: "mcluster-css", rel: "stylesheet",
        href: "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
      });
      document.head.appendChild(el);
    }
    if (!document.getElementById("mapa-fs-styles")) {
      const s = document.createElement("style");
      s.id = "mapa-fs-styles";
      s.textContent = MAP_STYLES;
      document.head.appendChild(s);
    }

    const leafletNS = await import("leaflet");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = ((leafletNS as any).default ?? leafletNS) as typeof leafletNS;
    (window as Window & { L?: unknown }).L = L;
    leafletRef.current = L;
    await import("leaflet.markercluster");

    if (!containerRef.current || mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (containerRef.current as any)._leaflet_id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const LG = L as any;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      preferCanvas: false,
    }).setView(DEFAULT_CENTER, 14);

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control — bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // "Mi ubicación" button
    const LocControl = L.Control.extend({
      onAdd() {
        const btn = document.createElement("button");
        btn.title = "Mi ubicación";
        btn.style.cssText = `
          width:34px;height:34px;background:white;border:2px solid rgba(0,0,0,0.2);
          border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(0,0,0,0.12);font-size:16px;
        `;
        btn.innerHTML = "📍";
        btn.onclick = () => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
            () => {}
          );
        };
        return btn;
      },
    });
    new LocControl({ position: "bottomright" }).addTo(map);

    // "Centrar en Paso de los Libres" button
    const CenterControl = L.Control.extend({
      onAdd() {
        const btn = document.createElement("button");
        btn.title = "Centrar en Paso de los Libres";
        btn.style.cssText = `
          background:white;border:2px solid rgba(0,0,0,0.2);border-radius:6px;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(0,0,0,0.12);font-size:11px;font-weight:600;
          padding:0 10px;height:34px;white-space:nowrap;color:#2C2C2C;
          font-family:system-ui,sans-serif;
        `;
        btn.textContent = "Paso de los Libres";
        btn.onclick = () => map.setView(DEFAULT_CENTER, 14);
        return btn;
      },
    });
    new CenterControl({ position: "bottomright" }).addTo(map);

    // Cluster group
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
          className: "mc-terra",
          iconSize: L.point(sz, sz),
          iconAnchor: L.point(sz / 2, sz / 2),
        });
      },
    });
    clusterRef.current = cluster;

    properties.forEach((prop) => {
      const color = OPERACION_COLOR[prop.operacion] ?? "#C1694F";
      const label = formatPrecio(prop.precio, prop.moneda);
      const icon = L.divIcon({
        html: `<div style="position:relative;width:0;height:0;"><div class="price-pill-fs" style="background:${color};">${label}</div></div>`,
        className: "",
        iconSize: L.point(0, 0),
        iconAnchor: L.point(0, 0),
      });
      const marker = L.marker([prop.latitud, prop.longitud], { icon });
      marker.bindPopup(buildPopupHtml(prop), {
        maxWidth: 280, minWidth: 260, offset: L.point(0, -8),
      });
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);

    if (properties.length > 0) {
      try {
        map.fitBounds(cluster.getBounds(), { padding: [60, 60], maxZoom: 15 });
      } catch { /* default view */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    (async () => {
      if (alive) await initMap();
    })();
    return () => {
      alive = false;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
        clusterRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-populate markers whenever filtered properties change
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = leafletRef.current as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cluster = clusterRef.current as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!L || !cluster || !map) return;

    cluster.clearLayers();

    properties.forEach((prop) => {
      const color = OPERACION_COLOR[prop.operacion] ?? "#C1694F";
      const label = formatPrecio(prop.precio, prop.moneda);
      const icon = L.divIcon({
        html: `<div style="position:relative;width:0;height:0;"><div class="price-pill-fs" style="background:${color};">${label}</div></div>`,
        className: "",
        iconSize: L.point(0, 0),
        iconAnchor: L.point(0, 0),
      });
      const marker = L.marker([prop.latitud, prop.longitud], { icon });
      marker.bindPopup(buildPopupHtml(prop), {
        maxWidth: 280, minWidth: 260, offset: L.point(0, -8),
      });
      cluster.addLayer(marker);
    });

    if (properties.length > 0) {
      try {
        map.fitBounds(cluster.getBounds(), { padding: [60, 60], maxZoom: 15 });
      } catch { /* keep current view */ }
    }
  }, [properties]);

  return <div ref={containerRef} className="w-full h-full" />;
}
