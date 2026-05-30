"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
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

const TIPOS_URGENTES = ["SUSCRIPCION_24_HORAS", "SUSCRIPCION_VENCIDA"];

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

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 overflow-hidden"
          style={{
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #E8DFD0)",
            boxShadow: "var(--shadow-lg-il, 0 4px 14px rgba(58,35,18,0.08))",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
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
            {noLeidas > 0 && (
              <button
                onClick={markAll}
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--terracota-600, #A85737)" }}
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifs.length === 0 ? (
              <p
                className="text-center text-sm py-8"
                style={{ color: "var(--antracita-300, #6F665C)" }}
              >
                Sin notificaciones pendientes
              </p>
            ) : (
              notifs.slice(0, 20).map((n) => (
                <a
                  key={n.id}
                  href={n.url ?? "#"}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 border-b last:border-0 transition-colors"
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
                  <div className="flex items-start gap-2">
                    {!n.leida && (
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: "#DC2626" }}
                      />
                    )}
                    <div className={!n.leida ? "" : "pl-3.5"}>
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
