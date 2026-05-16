"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  url?: string | null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
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
        className="relative p-2 rounded-lg hover:bg-surface-raised transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text-primary">Notificaciones</p>
            {noLeidas > 0 && (
              <button onClick={markAll} className="text-xs text-brand-primary hover:underline">
                Marcar todo como leído
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8">Sin notificaciones</p>
            ) : (
              notifs.slice(0, 15).map((n) => (
                <a
                  key={n.id}
                  href={n.url ?? "#"}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 border-b border-border last:border-0 hover:bg-surface-raised transition-colors ${
                    !n.leida ? "bg-brand-accent-light/30" : ""
                  }`}
                >
                  {!n.leida && (
                    <span className="inline-block w-2 h-2 rounded-full bg-brand-primary mr-2 align-middle" />
                  )}
                  <p className="text-sm font-medium text-text-primary leading-snug">{n.titulo}</p>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.mensaje}</p>
                  <p className="text-[10px] text-text-muted mt-1">{formatRelativeTime(n.createdAt)}</p>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
