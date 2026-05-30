"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Save, CalendarDays,
  Building2, Users, Home, BarChart2,
  CheckCircle, XCircle, Clock, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

/* ─── Tipos ──────────────────────────────────────────────────── */
interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  createdAt: string;
}

interface InmobiliariaDetalle {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string;
  plan: string;
  estado: "ACTIVA" | "INACTIVA" | "PRUEBA" | "SUSPENDIDA";
  fechaVencimiento: string | null;
  createdAt: string;
  usuarios: Usuario[];
  _count: { propiedades: number; clientes: number; visitas: number };
}

/* ─── Helpers ────────────────────────────────────────────────── */
const PLANES = [
  { value: "BASICO",   label: "Básico" },
  { value: "AVANZADO", label: "Avanzado" },
  { value: "PRO",      label: "Pro" },
];
const ESTADOS = [
  { value: "ACTIVA",     label: "Activa" },
  { value: "PRUEBA",     label: "Prueba" },
  { value: "SUSPENDIDA", label: "Suspendida" },
  { value: "INACTIVA",   label: "Inactiva" },
];
const ESTADO_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVA:     { bg: "#DCFCE7", color: "#15803D" },
  PRUEBA:     { bg: "#FEF3C7", color: "#B45309" },
  SUSPENDIDA: { bg: "#FEE2E2", color: "#B91C1C" },
  INACTIVA:   { bg: "#F3F4F6", color: "#6B7280" },
};
const ROL_LABELS: Record<string, string> = {
  ADMIN:      "Admin",
  AGENTE:     "Agente",
  PARTICULAR: "Particular",
};

export default function InmobiliariaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [data,    setData]    = useState<InmobiliariaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const [plan,   setPlan]   = useState("");
  const [estado, setEstado] = useState("");
  const [fecha,  setFecha]  = useState("");

  async function load() {
    const res = await fetch(`/api/inmobiliarias/${id}`);
    if (!res.ok) { toast.error("No encontrada"); router.push("/admin/inmobiliarias"); return; }
    const json = await res.json() as { data: InmobiliariaDetalle };
    const d = json.data;
    setData(d);
    setPlan(d.plan);
    setEstado(d.estado);
    setFecha(d.fechaVencimiento ? d.fechaVencimiento.split("T")[0] : "");
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [id]);

  async function guardar() {
    setSaving(true);
    try {
      const res = await fetch(`/api/inmobiliarias/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          estado,
          fechaVencimiento: fecha ? new Date(fecha + "T00:00:00").toISOString() : null,
        }),
      });
      if (res.ok) { toast.success("Cambios guardados"); load(); }
      else toast.error("Error al guardar");
    } catch { toast.error("Error inesperado"); }
    finally { setSaving(false); }
  }

  function extender(dias: number) {
    const base = fecha ? new Date(fecha + "T00:00:00") : new Date();
    const desde = base > new Date() ? base : new Date();
    desde.setDate(desde.getDate() + dias);
    setFecha(desde.toISOString().split("T")[0]);
  }

  const hasChanges = data && (
    plan !== data.plan ||
    estado !== data.estado ||
    fecha !== (data.fechaVencimiento ? data.fechaVencimiento.split("T")[0] : "")
  );

  /* ─── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--terracota-500)" }} />
      </div>
    );
  }
  if (!data) return null;

  const estadoStyle = ESTADO_COLORS[data.estado] ?? { bg: "#F3F4F6", color: "#6B7280" };

  return (
    <div className="w-full max-w-[1060px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Link
            href="/admin/inmobiliarias"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--antracita-400)", textDecoration: "none", marginBottom: 8 }}
          >
            <ArrowLeft size={13} /> Volver a inmobiliarias
          </Link>
          <h1 className="display" style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}>
            {data.nombre}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span
              style={{
                fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                background: estadoStyle.bg, color: estadoStyle.color,
              }}
            >
              {ESTADOS.find((e) => e.value === data.estado)?.label ?? data.estado}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--antracita-400)" }}>{data.email}</span>
            <span style={{ fontSize: 11.5, color: "var(--antracita-400)" }}>·</span>
            <span style={{ fontSize: 11.5, color: "var(--antracita-400)" }}>{data.whatsapp}</span>
          </div>
        </div>

        {hasChanges && (
          <button
            onClick={guardar}
            disabled={saving}
            className="il-btn il-btn--primary"
            style={{ height: 36, fontSize: 13, gap: 6 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} color="#fff" />}
            Guardar cambios
          </button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Propiedades", value: data._count.propiedades, icon: Home,      color: "var(--terracota-500)", bg: "var(--terracota-100)" },
          { label: "Clientes",    value: data._count.clientes,    icon: Users,     color: "var(--accent)",        bg: "var(--accent-soft)"  },
          { label: "Visitas",     value: data._count.visitas,     icon: BarChart2, color: "var(--success-500)",   bg: "var(--success-100)"  },
          { label: "Usuarios",    value: data.usuarios.length,    icon: Building2, color: "var(--antracita-700)", bg: "var(--crema-100)"    },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="il-card" style={{ padding: 16 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <Icon size={15} style={{ color }} />
            </span>
            <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: "var(--antracita-900)", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Gestión suscripción */}
      <div className="il-card" style={{ padding: 22 }}>
        <h3 className="display" style={{ fontSize: 17, margin: "0 0 18px", color: "var(--antracita-900)" }}>
          Suscripción
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 18 }}>
          {/* Plan */}
          <div>
            <label style={{ fontSize: 11, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8, fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
              Plan
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--antracita-700)", background: "var(--crema-50)", outline: "none" }}
            >
              {PLANES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label style={{ fontSize: 11, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8, fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--antracita-700)", background: "var(--crema-50)", outline: "none" }}
            >
              {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          {/* Fecha vencimiento */}
          <div>
            <label style={{ fontSize: 11, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8, fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
              Vencimiento
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarDays size={15} style={{ color: "var(--antracita-400)", flexShrink: 0 }} />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={{ flex: 1, padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--antracita-700)", background: "var(--crema-50)", outline: "none" }}
              />
            </div>
            {/* Extensión rápida */}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "var(--antracita-400)", alignSelf: "center" }}>Extender:</span>
              {[30, 60, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => extender(d)}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 999,
                    border: "1px solid var(--border)", background: "var(--crema-100)",
                    color: "var(--antracita-600)", cursor: "pointer",
                  }}
                >
                  +{d === 365 ? "1 año" : `${d}d`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Registrado */}
        <p style={{ fontSize: 11.5, color: "var(--antracita-400)", marginTop: 16 }}>
          Registrada el {formatDate(data.createdAt)}
        </p>
      </div>

      {/* Usuarios */}
      <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>
            Usuarios ({data.usuarios.length})
          </h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--crema-100)" }}>
              {["Nombre", "Email", "Rol", "Estado", "Desde"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left", padding: "9px 18px",
                    fontSize: 10.5, color: "var(--antracita-300)",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    fontFamily: "var(--font-jetbrains-mono, monospace)",
                    fontWeight: 600, borderBottom: "1px solid var(--border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.usuarios.map((u, idx) => (
              <tr
                key={u.id}
                style={{ borderBottom: idx < data.usuarios.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <td style={{ padding: "12px 18px", fontWeight: 500, color: "var(--antracita-900)" }}>{u.nombre}</td>
                <td style={{ padding: "12px 18px", color: "var(--antracita-500)", fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: "12px 18px" }}>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: u.rol === "ADMIN" ? "var(--terracota-100)" : "var(--crema-200)",
                      color: u.rol === "ADMIN" ? "var(--terracota-700)" : "var(--antracita-600)",
                    }}
                  >
                    {ROL_LABELS[u.rol] ?? u.rol}
                  </span>
                </td>
                <td style={{ padding: "12px 18px" }}>
                  {u.activo
                    ? <CheckCircle size={15} style={{ color: "var(--success-500)" }} />
                    : <XCircle    size={15} style={{ color: "var(--danger-500)" }}   />}
                </td>
                <td style={{ padding: "12px 18px", color: "var(--antracita-400)", fontSize: 12 }}>
                  {formatDate(u.createdAt)}
                </td>
              </tr>
            ))}
            {data.usuarios.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "20px 18px", textAlign: "center", color: "var(--antracita-300)", fontSize: 13 }}>
                  Sin usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
