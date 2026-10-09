"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { playNotificationSound } from "@/lib/notification-sound";

interface Notificacion {
  id: string;
  tipo?: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  url?: string | null;
}

const TIPOS_URGENTES = ["SUSCRIPCION_24_HORAS", "SUSCRIPCION_VENCIDA", "CONSULTA_NUEVA", "VISITA_PROXIMA"];

export function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);

  // Guardamos el conteo previo para detectar NUEVAS notifs
  // null = todavía no hicimos el primer fetch (no tocar sonido)
  const prevCountRef  = useRef<number | null>(null);
  const ref           = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async (isFirst = false) => {
    try {
      const res = await fetch("/api/notificaciones");
      if (!res.ok) return;
      const json = await res.json() as { data?: Notificacion[]; noLeidas?: number };
      const count = json.noLeidas ?? 0;

      // En el primer fetch: guardamos el baseline sin tocar el sonido
      if (isFirst) {
        prevCountRef.current = count;
      }

      setNotifs(json.data ?? []);
      setNoLeidas(count);
    } catch {/* ignorar errores de red */}
  }, []);

  // Efecto de sonido: SOLO se activa si el conteo aumenta respecto al fetch anterior
  // prevCountRef.current === null → todavía cargando, no tocar nada
  useEffect(() => {
    if (prevCountRef.current !== null && noLeidas > prevCountRef.current) {
      const sonidoActivo = localStorage.getItem("inmolibres_sonido_notif") !== "false";
      if (sonidoActivo) {
        const hayUrgente = notifs.some((n) => n.tipo && TIPOS_URGENTES.includes(n.tipo));
        playNotificationSound(hayUrgente ? "urgente" : "suave");
      }
    }
    // Actualizamos el prev solo si ya tenemos el baseline
    if (prevCountRef.current !== null) {
      prevCountRef.current = noLeidas;
    }
  }, [noLeidas, notifs]);

  // Chequeo de visitas próximas (cubre el hueco del cron en plan Hobby).
  // Crea notificaciones server-side; si genera alguna, refrescamos al instante
  // para que el badge + sonido se disparen sin esperar al polling de 30s.
  const checkVisitasProximas = useCallback(async () => {
    try {
      const res = await fetch("/api/visitas/check-proximas", { method: "POST" });
      if (!res.ok) return;
      const json = await res.json() as { creadas?: number };
      if (json.creadas && json.creadas > 0) {
        void fetchNotifs(false);
      }
    } catch {/* ignorar errores de red */}
  }, [fetchNotifs]);

  // Polling: primer fetch es silencioso (isFirst=true), luego cada 30s
  useEffect(() => {
    void fetchNotifs(true);
    const interval = setInterval(() => void fetchNotifs(false), 30_000);
    const onRefresh = () => void fetchNotifs(false);
    window.addEventListener("notif:refresh", onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notif:refresh", onRefresh);
    };
  }, [fetchNotifs]);

  // Chequeo de visitas próximas: al montar y luego cada 2 minutos
  useEffect(() => {
    void checkVisitasProximas();
    const interval = setInterval(() => void checkVisitasProximas(), 2 * 60_000);
    return () => clearInterval(interval);
  }, [checkVisitasProximas]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markOne = async (id: string) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
    setNoLeidas((prev) => Math.max(0, prev - 1));
    prevCountRef.current = Math.max(0, (prevCountRef.current ?? 1) - 1);
    await fetch("/api/notificaciones", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  };

  const markAll = async () => {
    await fetch("/api/notificaciones", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNoLeidas(0);
    prevCountRef.current = 0;
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  // Borrado optimista: se saca de la lista al instante y, si el servidor falla,
  // el próximo polling (30s) la vuelve a traer.
  const borrarUna = async (n: Notificacion) => {
    setNotifs((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.leida) {
      setNoLeidas((prev) => Math.max(0, prev - 1));
      prevCountRef.current = Math.max(0, (prevCountRef.current ?? 1) - 1);
    }
    try {
      await fetch("/api/notificaciones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
    } catch {/* se resincroniza con el polling */}
  };

  const borrarLeidas = async () => {
    setNotifs((prev) => prev.filter((x) => !x.leida));
    try {
      await fetch("/api/notificaciones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leidas: true }),
      });
    } catch {/* se resincroniza con el polling */}
  };

  const hayLeidas = notifs.some((n) => n.leida);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex items-center justify-center rounded-xl border transition-colors"
        aria-label="Notificaciones"
        style={{
          width: 38,
          height: 38,
          background: "var(--crema-100, #F5EFE5)",
          borderColor: "var(--border, #E8DFD0)",
          color: "var(--antracita-700, #221E19)",
        }}
      >
        <Bell className="w-4 h-4" />

        {/* Badge rojo con conteo */}
        {noLeidas > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: "#DC2626",
              border: "2px solid var(--crema-50, #FBF8F2)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              lineHeight: 1,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              zIndex: 1,
            }}
          >
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-24px)] rounded-2xl z-50 overflow-hidden"
          style={{
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #E8DFD0)",
            boxShadow: "var(--shadow-lg-il, 0 4px 14px rgba(58,35,18,0.08))",
          }}
        >
          <div
            className="flex items-center justify-between gap-2 px-4 py-3 border-b"
            style={{ borderColor: "var(--border, #E8DFD0)" }}
          >
            <div className="flex items-center gap-2">
              <p
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-fraunces-display), Georgia, serif",
                  color: "var(--antracita-900, #14110E)",
                }}
              >
                Notificaciones
              </p>
              {noLeidas > 0 && (
                <span
                  style={{
                    background: "#DC2626",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "1px 6px",
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                  }}
                >
                  {noLeidas}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {noLeidas > 0 && (
                <button
                  onClick={markAll}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--terracota-600, #A85737)" }}
                >
                  Marcar leídas
                </button>
              )}
              {hayLeidas && (
                <button
                  onClick={borrarLeidas}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--antracita-400, #5A524A)" }}
                >
                  Borrar leídas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifs.length === 0 ? (
              <p
                className="text-center text-sm py-8"
                style={{ color: "var(--antracita-300, #6F665C)" }}
              >
                Sin notificaciones
              </p>
            ) : (
              notifs.slice(0, 20).map((n) => (
                // El botón de borrar va al lado del link, no adentro: un <button>
                // dentro de un <a> es HTML inválido y el clic dispararía los dos.
                <div
                  key={n.id}
                  className="group flex items-start border-b last:border-0 transition-colors"
                  style={{
                    borderColor: "var(--border, #E8DFD0)",
                    background: !n.leida ? "var(--terracota-50, #FBF1EC)" : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--crema-100, #F5EFE5)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = !n.leida
                      ? "var(--terracota-50, #FBF1EC)"
                      : "transparent")
                  }
                >
                  <a
                    href={n.url ?? "#"}
                    onClick={() => { setOpen(false); if (!n.leida) void markOne(n.id); }}
                    className="flex-1 min-w-0 block pl-4 pr-1 py-3"
                  >
                    <div className="flex items-start gap-2">
                      {!n.leida && (
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: "#DC2626" }}
                        />
                      )}
                      <div className={!n.leida ? "min-w-0" : "min-w-0 pl-3.5"}>
                        <p
                          className="text-sm font-medium leading-snug"
                          style={{ color: "var(--antracita-900, #14110E)" }}
                        >
                          {n.titulo}
                        </p>
                        <p
                          className="text-xs mt-0.5 line-clamp-2"
                          style={{ color: "var(--antracita-500, #3A332C)" }}
                        >
                          {n.mensaje}
                        </p>
                        <p
                          className="text-[10px] mt-1"
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), monospace",
                            color: "var(--antracita-300, #6F665C)",
                          }}
                        >
                          {formatRelativeTime(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </a>
                  {/* En dispositivos táctiles (sin hover) se ve siempre; con mouse
                      aparece al pasar por la fila. Se decide por capacidad de hover,
                      no por ancho: una tablet también es táctil. */}
                  <button
                    onClick={() => void borrarUna(n)}
                    aria-label="Eliminar notificación"
                    title="Eliminar"
                    className="shrink-0 mt-2 mr-2 p-1.5 rounded-lg transition-opacity opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
                    style={{ color: "var(--antracita-500, #3A332C)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <p
            className="px-4 py-2 border-t text-[10.5px]"
            style={{
              borderColor: "var(--border, #E8DFD0)",
              color: "var(--antracita-300, #6F665C)",
              background: "var(--crema-50, #FBF8F2)",
            }}
          >
            Las leídas se borran solas a los 30 días; los avisos de visita, al día siguiente.
          </p>
        </div>
      )}
    </div>
  );
}
