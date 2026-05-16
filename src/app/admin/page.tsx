import { db } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ESTADO_INMOBILIARIA_LABELS, ESTADO_INMOBILIARIA_COLORS } from "@/lib/utils";
import { Building2, Users, BarChart3, AlertTriangle } from "lucide-react";

export const metadata = { title: "Admin Panel" };

export default async function AdminPage() {
  const inmobiliarias = await db.inmobiliaria.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { usuarios: true, propiedades: true, clientes: true } },
    },
  });

  const hoy = new Date();
  const en7dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);

  const stats = {
    total: inmobiliarias.length,
    activas: inmobiliarias.filter((i) => i.estado === "ACTIVA").length,
    suspendidas: inmobiliarias.filter((i) => i.estado === "SUSPENDIDA").length,
    prueba: inmobiliarias.filter((i) => i.estado === "PRUEBA").length,
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          Panel de Administración
        </h1>
        <Link href="/admin/inmobiliarias" className="btn-primary">
          Gestionar inmobiliarias
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: Building2, color: "var(--text-primary)", bg: "var(--surface-raised)" },
          { label: "Activas", value: stats.activas, icon: BarChart3, color: "var(--success)", bg: "var(--brand-accent-light)" },
          { label: "En prueba", value: stats.prueba, icon: Users, color: "var(--info)", bg: "#EBF5FB" },
          { label: "Suspendidas", value: stats.suspendidas, icon: AlertTriangle, color: "var(--danger)", bg: "#FDEDEC" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: bg }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p
              className="font-price text-2xl font-bold"
              style={{ color, fontFamily: "var(--font-mono)" }}
            >
              {value}
            </p>
            <p className="text-sm text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border" style={{ background: "#FAF8F5" }}>
              <th
                className="text-left px-4 py-3 font-medium"
                style={{ color: "var(--antracite-mid)" }}
              >
                Inmobiliaria
              </th>
              <th
                className="text-left px-4 py-3 font-medium"
                style={{ color: "var(--antracite-mid)" }}
              >
                Estado
              </th>
              <th
                className="text-left px-4 py-3 font-medium"
                style={{ color: "var(--antracite-mid)" }}
              >
                Vencimiento
              </th>
              <th
                className="text-center px-4 py-3 font-medium"
                style={{ color: "var(--antracite-mid)" }}
              >
                Propiedades
              </th>
              <th
                className="text-center px-4 py-3 font-medium"
                style={{ color: "var(--antracite-mid)" }}
              >
                Clientes
              </th>
            </tr>
          </thead>
          <tbody>
            {inmobiliarias.map((i) => {
              const venceProxima =
                i.fechaVencimiento &&
                i.fechaVencimiento <= en7dias &&
                i.fechaVencimiento >= hoy;
              return (
                <tr
                  key={i.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-[var(--terra-pale)]/30"
                  style={
                    venceProxima
                      ? { borderLeft: "3px solid #C0392B" }
                      : undefined
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-text-primary">{i.nombre}</p>
                        <p className="text-xs text-text-muted">{i.email}</p>
                      </div>
                      {venceProxima && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{
                            background: "rgba(192,57,43,0.12)",
                            color: "#C0392B",
                            animation: "pulse-dot 2s cubic-bezier(0.4,0,0.6,1) infinite",
                          }}
                        >
                          Vence pronto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_INMOBILIARIA_COLORS[i.estado]}`}
                    >
                      {ESTADO_INMOBILIARIA_LABELS[i.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {i.fechaVencimiento ? formatDate(i.fechaVencimiento) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-price font-semibold text-text-primary">
                    {i._count.propiedades}
                  </td>
                  <td className="px-4 py-3 text-center font-price font-semibold text-text-primary">
                    {i._count.clientes}
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
