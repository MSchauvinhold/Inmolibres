"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrendingUp, Check, X, MessageCircle, Loader2, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Ajuste {
  id: string;
  contratoId: string;
  fechaAjuste: string;
  precioAnterior: number;
  precioNuevo: number;
  moneda: "ARS" | "USD";
  indiceInicio: number;
  indiceFin: number;
  porcentajeAumento: number;
  indiceUsado: string;
  inquilinoNombre: string;
  inquilinoTel: string;
  propiedadTitulo: string;
  propiedadDireccion: string;
}

export function AjustesPendientes({ inmobiliariaNombre }: { inmobiliariaNombre: string }) {
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alquileres/ajustes?estado=pendiente");
      if (res.ok) setAjustes((await res.json()).data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function confirmar(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/alquileres/ajustes/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error();
      toast.success("Ajuste aplicado — nuevo precio actualizado en el contrato");
      setAjustes((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } catch {
      toast.error("Error al aplicar el ajuste");
    } finally {
      setBusyId(null);
    }
  }

  async function rechazar(id: string) {
    if (!confirm("¿Descartar este ajuste sin aplicarlo? El precio del contrato no cambia.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/alquileres/ajustes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Ajuste descartado");
      setAjustes((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Error al descartar");
    } finally {
      setBusyId(null);
    }
  }

  function whatsapp(a: Ajuste) {
    const fecha = new Date(a.fechaAjuste).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
    const msg = encodeURIComponent(
      `Hola ${a.inquilinoNombre}, te informamos que a partir del ${fecha} ` +
      `el valor de tu alquiler se actualizará según el índice ${a.indiceUsado} del ` +
      `${a.indiceUsado === "ICL" ? "BCRA" : "INDEC"}.\n\n` +
      `Propiedad: ${a.propiedadTitulo}\n` +
      `Valor anterior: ${formatPrice(a.precioAnterior, a.moneda)}\n` +
      `Nuevo valor: ${formatPrice(a.precioNuevo, a.moneda)}\n` +
      `Variación: +${a.porcentajeAumento.toFixed(1)}%\n\n` +
      `Ante cualquier consulta, no dudes en contactarnos.\nSaludos, ${inmobiliariaNombre}`
    );
    const tel = a.inquilinoTel.replace(/\D/g, "");
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
  }

  if (loading || ajustes.length === 0) return null;

  return (
    <div className="il-card" style={{ padding: 0, overflow: "hidden", marginBottom: 18, borderLeft: "4px solid var(--terracota-500, #C1694F)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <TrendingUp size={17} style={{ color: "var(--terracota-500)" }} />
        <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>
          Ajustes pendientes
        </h3>
        <span style={{ background: "#DC2626", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 8px", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          {ajustes.length}
        </span>
      </div>

      <div>
        {ajustes.map((a) => (
          <div key={a.id} style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              {/* Info */}
              <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--antracita-900)", margin: 0 }}>{a.propiedadTitulo}</p>
                <p style={{ fontSize: 12, color: "var(--antracita-500)", margin: "2px 0 10px" }}>
                  Inquilino: {a.inquilinoNombre} · Índice {a.indiceUsado}
                </p>

                {/* Precio anterior → nuevo */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 14, color: "var(--antracita-500)", textDecoration: "line-through" }}>
                    {formatPrice(a.precioAnterior, a.moneda)}
                  </span>
                  <ArrowRight size={14} style={{ color: "var(--antracita-300)" }} />
                  <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--antracita-900)" }}>
                    {formatPrice(a.precioNuevo, a.moneda)}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    background: "var(--terracota-100, #FCEAE4)", color: "var(--terracota-700, #8C3D27)",
                  }}>
                    +{a.porcentajeAumento.toFixed(1)}%
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "var(--antracita-300)", marginTop: 6 }}>
                  Índice: {a.indiceInicio.toFixed(2)} → {a.indiceFin.toFixed(2)}
                </p>
              </div>

              {/* Acciones */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => confirmar(a.id)}
                  disabled={busyId === a.id}
                  className="il-btn il-btn--primary"
                  style={{ height: 36, fontSize: 13, gap: 6, padding: "0 14px" }}
                >
                  {busyId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Confirmar
                </button>
                <button
                  onClick={() => whatsapp(a)}
                  className="il-btn"
                  style={{ height: 36, fontSize: 13, gap: 6, padding: "0 14px", background: "#25D366", color: "#fff" }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
                <button
                  onClick={() => rechazar(a.id)}
                  disabled={busyId === a.id}
                  className="il-btn il-btn--ghost"
                  style={{ height: 36, fontSize: 13, gap: 6, padding: "0 12px", color: "var(--danger-500, #B23A2D)" }}
                >
                  <X size={14} /> Rechazar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
