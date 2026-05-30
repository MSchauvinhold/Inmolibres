"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone, Check, ExternalLink } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { playNotificationSound } from "@/lib/notification-sound";

interface ConsultaKai {
  id: string;
  nombreVisitante: string;
  telefono: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

export function AdminKaiBell() {
  const [open,     setOpen]     = useState(false);
  const [consultas, setConsultas] = useState<ConsultaKai[]>([]);
  const prevCountRef = useRef<number | null>(null);
  const dropRef      = useRef<HTMLDivElement>(null);

  const fetchConsultas = useCallback(async (isFirst = false) => {
    try {
      const res = await fetch("/api/consultas-kai");
      if (!res.ok) return;
      const json = await res.json() as { data?: ConsultaKai[] };
      const data  = json.data ?? [];
      const count = data.filter((c) => !c.leida).length;

      // Primer fetch: solo baseline, sin sonido
      if (isFirst) {
        prevCountRef.current = count;
      } else if (prevCountRef.current !== null && count > prevCountRef.current) {
        playNotificationSound("suave");
      }
      if (prevCountRef.current !== null) prevCountRef.current = count;

      setConsultas(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void fetchConsultas(true);
    const interval = setInterval(() => void fetchConsultas(false), 30_000);
    return () => clearInterval(interval);
  }, [fetchConsultas]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function marcarLeida(id: string) {
    await fetch("/api/consultas-kai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConsultas((prev) => prev.map((c) => c.id === id ? { ...c, leida: true } : c));
    if (prevCountRef.current !== null && prevCountRef.current > 0) {
      prevCountRef.current = prevCountRef.current - 1;
    }
  }

  const noLeidas  = consultas.filter((c) => !c.leida).length;
  const recientes = consultas.slice(0, 12);

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex items-center justify-center rounded-xl border transition-colors"
        aria-label="Consultas Kai"
        title="Consultas de Kai"
        style={{
          width: 38, height: 38,
          background: "var(--crema-100, #F5EFE5)",
          borderColor: "var(--border, #E8DFD0)",
        }}
      >
        <Image src="/mascota-kai.svg" alt="Kai" width={20} height={20} style={{ objectFit: "contain" }} />

        {/* Badge rojo */}
        {noLeidas > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5,
            minWidth: 18, height: 18, borderRadius: 999,
            background: "#DC2626",
            border: "2px solid var(--crema-50, #FBF8F2)",
            color: "#fff", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", lineHeight: 1,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            zIndex: 1,
          }}>
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)",
            width: 340, borderRadius: 16, zIndex: 50, overflow: "hidden",
            background: "#fff",
            border: "1px solid var(--border, #E8DFD0)",
            boxShadow: "0 8px 32px rgba(58,35,18,0.12)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Image src="/mascota-kai.svg" alt="Kai" width={20} height={20} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--antracita-900)", fontFamily: "var(--font-fraunces-display), Georgia, serif" }}>
                Consultas Kai
              </span>
              {noLeidas > 0 && (
                <span style={{ background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 7px", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                  {noLeidas}
                </span>
              )}
            </div>
            <Link
              href="/admin/consultas-kai"
              onClick={() => setOpen(false)}
              style={{ fontSize: 11.5, color: "var(--terracota-600)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
            >
              Ver todas <ExternalLink size={10} />
            </Link>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {recientes.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--antracita-300)", padding: "24px 0" }}>
                Sin consultas todavía
              </p>
            ) : (
              recientes.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: !c.leida ? "var(--terracota-50, #FBF1EC)" : "transparent",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}
                >
                  {/* Avatar */}
                  <div style={{ width: 32, height: 32, borderRadius: 999, background: "#1B4332", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {c.nombreVisitante[0]?.toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)" }}>
                        {c.nombreVisitante}
                        {!c.leida && <span style={{ width: 6, height: 6, borderRadius: 999, background: "#DC2626", display: "inline-block", marginLeft: 6 }} />}
                      </span>
                      <span style={{ fontSize: 10.5, color: "var(--antracita-300)", fontFamily: "var(--font-jetbrains-mono), monospace", flexShrink: 0 }}>
                        {formatRelativeTime(c.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--antracita-500)", margin: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.mensaje}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                      <a
                        href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#25D366", textDecoration: "none", fontWeight: 500 }}
                      >
                        <Phone size={11} /> {c.telefono}
                      </a>
                      {!c.leida && (
                        <button
                          onClick={() => marcarLeida(c.id)}
                          style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--antracita-500)", background: "none", border: "none", cursor: "pointer" }}
                        >
                          <Check size={11} /> Leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
