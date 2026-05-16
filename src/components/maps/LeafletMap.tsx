"use client";

import { useEffect, useRef } from "react";

export interface MapMarker {
  lat: number;
  lon: number;
  label?: string;
}

interface LeafletMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

// Default: Paso de los Libres, Corrientes
const DEFAULT_CENTER: [number, number] = [-29.7139, -57.0847];

export function LeafletMap({
  markers = [],
  center,
  zoom = 14,
  className = "h-64 w-full rounded-xl",
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!document.getElementById("leaflet-css")) {
      const el = Object.assign(document.createElement("link"), {
        id: "leaflet-css",
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      });
      document.head.appendChild(el);
    }

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current) return;

      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      const mapCenter = center ?? (markers[0] ? [markers[0].lat, markers[0].lon] as [number, number] : DEFAULT_CENTER);

      const map = L.map(containerRef.current!).setView(mapCenter, zoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      markers.forEach(({ lat, lon, label }) => {
        const m = L.marker([lat, lon], { icon }).addTo(map);
        if (label) m.bindPopup(label);
      });
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
