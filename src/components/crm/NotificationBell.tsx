"use client";

import { useState, useEffect, useRef } from "react";
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
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const prevCountRef = useRef<number | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const res = await fetch("/api/notificaciones");
      if (!res.ok) return;
      const json = await res.json();
      setNotifs(json.data ?? []);
      setNoLeidas(json.noLeidas ?? 0);
    } catch {/* ignore */}
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchNotifs();
    const interval = setInterval(() => void fetchNotifs(), 60_000);
    const onRefresh = () => void fetchNotifs();
    window.addEventListener("notif:refresh", onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notif:refresh", onRefresh);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reproducir sonido al recibir nuevas notificaciones
  useEffect(() => {
    if (prevCountRef.current !== undefined && noLeidas > prevCountRef.current) {
      const sonidoActivo = localStorage.getItem("inmolibres_sonido_notif") !== "false";
      if (sonidoActivo) {
        const hayUrgente = notifs.some((n) => n.tipo && TIPOS_URGENTES.includes(n.tipo));
        playNotificationSound(hayUrgente ? "urgente" : "suave");
      }
    }
    prevCountRef.current = noLeidas;
  }, [noLeidas, notifs]);

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
        {noLeidas > 0 && (
          <span
            className="absolute rounded-full border-2 flex items-center justify-center"
            style={{
              top: 6,
              right: 6,
              width: noLeidas > 9 ? 16 : 8,
              height: noLeidas > 9 ? 16 : 8,
              background: "var(--terracota-500, #C1694F)",
              borderColor: "var(--crema-100, #F5EFE5)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            {noLeidas > 9 ? "9+" : noLeidas > 1 ? noLeidas : ""}
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
              notifs.slice(0, 15).map((n) => (
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
                        style={{ background: "var(--terracota-500, #C1694F)" }}
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
