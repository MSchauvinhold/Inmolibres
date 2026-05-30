import { db } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ESTADO_INMOBILIARIA_LABELS } from "@/lib/utils";
import { BarChart3, AlertTriangle, Plus, Building2, Users, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { AdminGrowthChart } from "./_growth-chart";

export const metadata = { title: "Admin Panel" };

export default async function AdminPage() {
  const inmobiliarias = await db.inmobiliaria.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { usuarios: true, propiedades: true, clientes: true } },
    },
  });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en7dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);

  const stats = {
    activas:     inmobiliarias.filter((i) => i.estado === "ACTIVA").length,
    prueba:      inmobiliarias.filter((i) => i.estado === "PRUEBA").length,
    suspendidas: inmobiliarias.filter((i) => i.estado === "SUSPENDIDA").length,
    propiedades: inmobiliarias.reduce((s, i) => s + i._count.propiedades, 0),
  };

  // Clasificación de suscripciones
  const alDia = inmobiliarias.filter((i) =>
    (i.estado === "ACTIVA" || i.estado === "PRUEBA") &&
    (!i.fechaVencimiento || i.fechaVencimiento > en7dias)
  );
  const porVencer = inmobiliarias.filter((i) =>
    (i.estado === "ACTIVA" || i.estado === "PRUEBA") &&
    i.fechaVencimiento &&
    i.fechaVencimiento <= en7dias &&
    i.fechaVencimiento >= hoy
  );
  const vencidas = inmobiliarias.filter((i) =>
    i.estado === "SUSPENDIDA" ||
    i.estado === "INACTIVA" ||
    (i.fechaVencimiento && i.fechaVencimiento < hoy &&
      (i.estado === "ACTIVA" || i.estado === "PRUEBA"))
  );

  // Serialize dates for client component
  const inmoSerialized = inmobiliarias.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    estado: i.estado,
    createdAt: i.createdAt.toISOString(),
  }));

  return (
    <div className="w-full max-w-[1060px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p
            className="mono"
            style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}
          >
            Panel global · Superadmin
          </p>
          <h1 className="display" style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}>
            Plataforma InmoLibres
          </h1>
          <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
            {stats.activas} activas · {stats.prueba} en prueba · {stats.suspendidas} suspendidas
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/admin/inmobiliarias"
            className="il-btn il-btn--ghost"
            style={{ height: 36, fontSize: 13, textDecoration: "none" }}
          >
            Ver todas
          </Link>
          <Link
            href="/admin/inmobiliarias?nueva=1"
            className="il-btn il-btn--primary"
            style={{ height: 36, fontSize: 13, gap: 6, textDecoration: "none" }}
          >
            <Plus size={14} color="#fff" />
            Nueva inmobiliaria
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {/* Card 4 (Propiedades) highlighted in terracota-500, mirrors the MRR highlight in the design */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          {
            label: "Activas",
            value: stats.activas,
            icon: BarChart3,
            toneColor: "var(--success-500)",
            bg: "var(--success-100, #DCFCE7)",
            highlight: false,
          },
          {
            label: "En prueba",
            value: stats.prueba,
            icon: Users,
            toneColor: "var(--warning-500)",
            bg: "var(--warning-100, #FEF3C7)",
            highlight: false,
          },
          {
            label: "Suspendidas",
            value: stats.suspendidas,
            icon: AlertTriangle,
            toneColor: "var(--danger-500)",
            bg: "var(--danger-100, #FEE2E2)",
            highlight: false,
          },
          {
            label: "Propiedades",
            value: stats.propiedades,
            icon: Building2,
            toneColor: "#fff",
            bg: "rgba(255,255,255,0.22)",
            highlight: true,
          },
        ].map(({ label, value, icon: Icon, toneColor, bg, highlight }) => (
          <div
            key={label}
            className="il-card"
            style={{
              padding: 18,
              background: highlight ? "var(--terracota-500)" : "#fff",
              border: highlight ? "none" : "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: bg,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <Icon size={15} style={{ color: toneColor }} />
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: highlight ? "rgba(255,255,255,0.75)" : "var(--antracita-300)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {label}
              </span>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: highlight ? "#fff" : toneColor,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Growth Chart + Activity Reciente ── */}
      <AdminGrowthChart inmobiliarias={inmoSerialized} />

      {/* ── Estado de suscripciones ── */}
      <div>
        <h3 className="display" style={{ fontSize: 18, margin: "0 0 14px", color: "var(--antracita-900)" }}>
          Estado de suscripciones
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>

          {/* Al día */}
          <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", background: "#F0FDF4" }}>
              <CheckCircle2 size={16} style={{ color: "#15803D", flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#15803D" }}>Al día</span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: "#15803D" }}>{alDia.length}</span>
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {alDia.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--antracita-300)", padding: "14px 18px" }}>Ninguna</p>
              ) : alDia.map((i) => (
                <div key={i.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nombre}</p>
                    <p style={{ fontSize: 11, color: "var(--antracita-400)", margin: 0 }}>
                      {i.fechaVencimiento ? `Vence ${formatDate(i.fechaVencimiento)}` : "Sin vencimiento"}
                    </p>
                  </div>
                  <Link href={`/admin/inmobiliarias/${i.id}`} style={{ fontSize: 11, color: "var(--terracota-600)", textDecoration: "none", flexShrink: 0 }}>
                    Gestionar →
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Por vencer */}
          <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", background: "#FFFBEB" }}>
              <Clock size={16} style={{ color: "#B45309", flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#B45309" }}>Por vencer (7 días)</span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: "#B45309" }}>{porVencer.length}</span>
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {porVencer.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--antracita-300)", padding: "14px 18px" }}>Ninguna por vencer</p>
              ) : porVencer.map((i) => {
                const diasRestantes = i.fechaVencimiento
                  ? Math.ceil((i.fechaVencimiento.getTime() - hoy.getTime()) / 86_400_000)
                  : null;
                return (
                  <div key={i.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: diasRestantes !== null && diasRestantes <= 2 ? "#FEF3C7" : "transparent" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nombre}</p>
                      <p style={{ fontSize: 11, color: "#B45309", margin: 0, fontWeight: 500 }}>
                        Vence en {diasRestantes ?? "?"} día{diasRestantes !== 1 ? "s" : ""} — {i.fechaVencimiento ? formatDate(i.fechaVencimiento) : ""}
                      </p>
                    </div>
                    <Link href={`/admin/inmobiliarias/${i.id}`} style={{ fontSize: 11, color: "var(--terracota-600)", textDecoration: "none", flexShrink: 0 }}>
                      Renovar →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vencidas / Suspendidas */}
          <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", background: "#FEF2F2" }}>
              <XCircle size={16} style={{ color: "#B91C1C", flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#B91C1C" }}>Vencidas / Suspendidas</span>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: "#B91C1C" }}>{vencidas.length}</span>
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {vencidas.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--antracita-300)", padding: "14px 18px" }}>Ninguna suspendida</p>
              ) : vencidas.map((i) => (
                <div key={i.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nombre}</p>
                    <p style={{ fontSize: 11, color: "#B91C1C", margin: 0 }}>
                      {i.estado === "SUSPENDIDA" ? "Suspendida" : i.estado === "INACTIVA" ? "Inactiva" : `Vencida el ${i.fechaVencimiento ? formatDate(i.fechaVencimiento) : "—"}`}
                    </p>
                  </div>
                  <Link href={`/admin/inmobiliarias/${i.id}`} style={{ fontSize: 11, color: "var(--terracota-600)", textDecoration: "none", flexShrink: 0 }}>
                    Reactivar →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Inmobiliarias table ── */}
      <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="display" style={{ fontSize: 18, margin: 0, color: "var(--antracita-900)" }}>
            Últimas inmobiliarias registradas
          </h3>
          <Link
            href="/admin/inmobiliarias"
            style={{ fontSize: 12, color: "var(--terracota-600)", textDecoration: "none", fontWeight: 500 }}
          >
            Ver todas →
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--crema-100, #F0E9DC)" }}>
                {["Inmobiliaria", "Estado", "Vencimiento", "Propiedades", "Clientes", "Acción"].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: i >= 3 && i <= 4 ? "center" : i === 5 ? "right" : "left",
                      padding: "10px 18px",
                      fontSize: 10.5,
                      color: "var(--antracita-300)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-jetbrains-mono, monospace)",
                      fontWeight: 600,
                      borderBottom: "1px solid var(--border)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inmobiliarias.map((i, idx) => {
                const venceProxima =
                  i.fechaVencimiento &&
                  i.fechaVencimiento <= en7dias &&
                  i.fechaVencimiento >= hoy;

                const estadoTone =
                  i.estado === "ACTIVA"       ? ("success" as const)
                  : i.estado === "SUSPENDIDA" ? ("danger" as const)
                  : i.estado === "PRUEBA"     ? ("warning" as const)
                  : ("neutral" as const);

                return (
                  <tr
                    key={i.id}
                    style={{
                      borderBottom: idx < inmobiliarias.length - 1 ? "1px solid var(--border)" : "none",
                      borderLeft: venceProxima ? "3px solid var(--danger-500)" : "3px solid transparent",
                      background: venceProxima ? "var(--warning-100, #FEF3C7)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "13px 18px" }}>
                      <div style={{ fontWeight: 600, color: "var(--antracita-900)", fontSize: 13.5 }}>
                        {i.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--antracita-400)", marginTop: 2 }}>
                        {i.email}
                      </div>
                      {venceProxima && (
                        <Pill tone="danger" style={{ fontSize: 9.5, marginTop: 4 }}>
                          Vence pronto
                        </Pill>
                      )}
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <Pill tone={estadoTone} style={{ fontSize: 10.5 }}>
                        {ESTADO_INMOBILIARIA_LABELS[i.estado]}
                      </Pill>
                    </td>
                    <td style={{ padding: "13px 18px", color: "var(--antracita-500)", fontSize: 12.5 }}>
                      {i.fechaVencimiento ? formatDate(i.fechaVencimiento) : "—"}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "center" }}>
                      <span className="mono" style={{ fontWeight: 600, color: "var(--antracita-900)", fontSize: 14 }}>
                        {i._count.propiedades}
                      </span>
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "center" }}>
                      <span className="mono" style={{ fontWeight: 600, color: "var(--antracita-900)", fontSize: 14 }}>
                        {i._count.clientes}
                      </span>
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right" }}>
                      <Link
                        href={`/admin/inmobiliarias/${i.id}`}
                        className="il-btn il-btn--ghost"
                        style={{
                          height: 28,
                          fontSize: 11.5,
                          padding: "0 12px",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
