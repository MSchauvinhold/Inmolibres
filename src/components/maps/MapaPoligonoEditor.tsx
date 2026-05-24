"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, CheckCircle } from "lucide-react";

type LatLng = [number, number];

interface Props {
  lat?: number | null;
  lon?: number | null;
  initialPolygon?: LatLng[] | null;
  onChange: (polygon: LatLng[] | null) => void;
}

const DEFAULT_CENTER: [number, number] = [-29.7139, -57.0847];

export function MapaPoligonoEditor({ lat, lon, initialPolygon, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const closeActionRef = useRef<() => void>(() => {});
  const clearActionRef = useRef<() => void>(() => {});

  const [pointCount, setPointCount] = useState(initialPolygon?.length ?? 0);
  const [isClosed, setIsClosed] = useState(!!(initialPolygon && initialPolygon.length >= 3));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current) return;

      if (!document.getElementById("leaflet-css")) {
        const el = Object.assign(document.createElement("link"), {
          id: "leaflet-css",
          rel: "stylesheet",
          href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        });
        document.head.appendChild(el);
      }

      const center: [number, number] = lat && lon ? [lat, lon] : DEFAULT_CENTER;
      const map = L.map(containerRef.current!).setView(center, 17);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const vertexIcon = L.divIcon({
        className: "",
        html: '<div style="width:10px;height:10px;border-radius:50%;background:#1B4332;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const points: LatLng[] = [];
      const markers: ReturnType<typeof L.marker>[] = [];
      let polyline: ReturnType<typeof L.polyline> | null = null;
      let polygon: ReturnType<typeof L.polygon> | null = null;
      let closed = false;

      const redrawPreview = () => {
        if (polyline) { polyline.remove(); polyline = null; }
        if (points.length >= 2) {
          polyline = L.polyline(points as L.LatLngExpression[], {
            color: "#1B4332",
            weight: 2,
            dashArray: "6,4",
          }).addTo(map);
        }
      };

      // Load initial polygon
      if (initialPolygon && initialPolygon.length >= 3) {
        points.push(...initialPolygon);
        closed = true;
        initialPolygon.forEach((ll) => {
          markers.push(L.marker(ll as L.LatLngExpression, { icon: vertexIcon }).addTo(map));
        });
        polygon = L.polygon(initialPolygon as L.LatLngExpression[], {
          color: "#1B4332",
          fillColor: "#1B4332",
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
        map.fitBounds(polygon.getBounds());
      }

      map.on("click", (e: L.LeafletMouseEvent) => {
        if (closed) return;
        const pt: LatLng = [e.latlng.lat, e.latlng.lng];
        points.push(pt);
        markers.push(L.marker(pt as L.LatLngExpression, { icon: vertexIcon }).addTo(map));
        redrawPreview();
        setPointCount(points.length);
      });

      closeActionRef.current = () => {
        if (points.length < 3 || closed) return;
        closed = true;
        if (polyline) { polyline.remove(); polyline = null; }
        polygon = L.polygon([...points] as L.LatLngExpression[], {
          color: "#1B4332",
          fillColor: "#1B4332",
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
        onChangeRef.current([...points]);
        setIsClosed(true);
        setPointCount(points.length);
      };

      clearActionRef.current = () => {
        markers.forEach((m) => m.remove());
        markers.length = 0;
        points.length = 0;
        if (polyline) { polyline.remove(); polyline = null; }
        if (polygon) { polygon.remove(); polygon = null; }
        closed = false;
        onChangeRef.current(null);
        setPointCount(0);
        setIsClosed(false);
      };
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

  const hint = isClosed
    ? "Polígono guardado. Podés limpiar y redibujar si querés."
    : pointCount === 0
    ? "Hacé clic en el mapa para ir marcando los vértices del terreno."
    : pointCount < 3
    ? `${pointCount} punto${pointCount > 1 ? "s" : ""} marcado${pointCount > 1 ? "s" : ""}. Necesitás al menos 3 para cerrar.`
    : `${pointCount} puntos marcados. Cerrá el polígono cuando estés listo.`;

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted">{hint}</p>
      <div className="relative">
        <div ref={containerRef} className="h-72 w-full rounded-xl" />
        <div className="absolute bottom-2 right-2 z-[1000] flex gap-2">
          {!isClosed && pointCount >= 3 && (
            <button
              type="button"
              onClick={() => closeActionRef.current()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "#1B4332" }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Cerrar polígono
            </button>
          )}
          {pointCount > 0 && (
            <button
              type="button"
              onClick={() => clearActionRef.current()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "white", border: "1px solid #DDD5C8", color: "#5C5650" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
