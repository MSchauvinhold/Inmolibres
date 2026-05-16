"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

interface MapPickerProps {
  lat?: number | null;
  lon?: number | null;
  onChange: (lat: number, lon: number) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [-29.7139, -57.0847];

export function MapPicker({ lat, lon, onChange, className = "h-64 w-full rounded-xl" }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
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

      const center: [number, number] = lat && lon ? [lat, lon] : DEFAULT_CENTER;
      const map = L.map(containerRef.current!).setView(center, 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      if (lat && lon) {
        markerRef.current = L.marker([lat, lon], { icon, draggable: true }).addTo(map);
        (markerRef.current as { on: (e: string, cb: (ev: { latlng: { lat: number; lng: number } }) => void) => void })
          .on("dragend", (e) => {
            const { lat: la, lng: lo } = e.latlng;
            onChangeRef.current(la, lo);
          });
      }

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: la, lng: lo } = e.latlng;
        if (markerRef.current) {
          (markerRef.current as { setLatLng: (ll: [number, number]) => void }).setLatLng([la, lo]);
        } else {
          markerRef.current = L.marker([la, lo], { icon, draggable: true }).addTo(map);
          (markerRef.current as { on: (e: string, cb: (ev: { latlng: { lat: number; lng: number } }) => void) => void })
            .on("dragend", (ev) => onChangeRef.current(ev.latlng.lat, ev.latlng.lng));
        }
        onChangeRef.current(la, lo);
      });
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div className="relative">
        <div ref={containerRef} className={className} />
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-xs text-text-secondary pointer-events-none">
          <MapPin className="w-3 h-3" />
          Hacé clic en el mapa para marcar la ubicación
        </div>
      </div>
    </>
  );
}
