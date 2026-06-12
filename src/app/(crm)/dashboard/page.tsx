import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2, Users, CalendarCheck, FileText,
  Bell, TrendingUp, BarChart2, Clock, MessageSquare,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Pill } from "@/components/ui/pill";
import { DashboardActivityChart } from "@/components/crm/DashboardActivityChart";

export const metadata = { title: "Dashboard" };

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, icon: Icon, iconColor, iconBg, href, mono = false, highlight = false,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  href: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <div
        className="il-card p-4 flex flex-col gap-3 h-full"
        style={highlight ? {
          background: "var(--antracita-900, #14110E)",
          border: "none",
          color: "var(--crema-50, #FBF8F2)",
        } : {}}
      >
        <div className="flex items-start justify-between">
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: highlight ? "rgba(255,255,255,0.12)" : iconBg,
            display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon style={{ width: 15, height: 15, color: highlight ? "#fff" : iconColor }} />
          </span>
          <TrendingUp style={{ width: 11, height: 11, color: highlight ? "rgba(255,255,255,0.4)" : "var(--success-500)" }} />
        </div>
        <div>
          <p style={{
            fontFamily: mono ? "var(--font-jetbrains-mono), monospace" : "inherit",
            fontSize: 26, fontWeight: 600, color: highlight ? "#fff" : "var(--antracita-900, #14110E)",
            letterSpacing: "-0.02em", lineHeight: 1, margin: 0,
            fontVariantNumeric: "tabular-nums",
          }}>
            {value}
          </p>
          <p style={{
            fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            color: highlight ? "rgba(255,255,255,0.5)" : "var(--antracita-300, #6F665C)",
            marginTop: 6,
          }}>
            {label}
          </p>
          <p style={{ fontSize: 11.5, color: highlight ? "rgba(255,255,255,0.6)" : "var(--antracita-500, #3A332C)", marginTop: 3 }}>
            {sub}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────
function AlertBanner({ items }: {
  items: { count: number; label: string; tone: "terra" | "warning" | "danger"; href: string }[]
}) {
  const active = items.filter((i) => i.count > 0);
  if (active.length === 0) return null;
  return (
    <div style={{
      background: "linear-gradient(90deg, var(--terracota-100, #F4D8C9), var(--crema-100, #F5EFE5))",
      border: "1px solid var(--terracota-300, #E0A088)",
      borderRadius: 14, padding: "14px 18px",
      display: "flex", gap: 14, alignItems: "center",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "var(--terracota-500, #C1694F)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Bell style={{ width: 16, height: 16, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "8px 28px", alignItems: "center" }}>
        {active.map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 18, fontWeight: 600,
              color: item.tone === "danger" ? "var(--danger-500)" : item.tone === "warning" ? "var(--warning-500)" : "var(--terracota-700)",
            }}>
              {item.count}
            </span>
            <span style={{ fontSize: 13, color: "var(--antracita-700)" }}>{item.label}</span>
          </div>
        ))}
      </div>
      <Link href={active[0].href}
        style={{
          background: "var(--antracita-900)", color: "var(--crema-50)",
          fontSize: 12, fontWeight: 600, padding: "6px 14px",
          borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap",
        }}>
        Ver todas
      </Link>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const inmobiliariaId = session.user.inmobiliariaId;
  if (session.user.rol === "PARTICULAR") redirect("/particular");
  if (!inmobiliariaId) redirect("/login");

  const hoy = new Date();

  // ── Timezone: Argentina = UTC-3 (sin DST) ────────────────────────────────────
  // Usamos Intl para obtener la fecha local correcta en Argentina,
  // independientemente del timezone del servidor Vercel (UTC).
  const AR_TZ = "America/Argentina/Buenos_Aires";
  const AR_MS = 3 * 60 * 60 * 1000; // UTC-3 en ms

  const arDateParts = new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(hoy);
  const arY = parseInt(arDateParts.find(p => p.type === "year")!.value);
  const arM = parseInt(arDateParts.find(p => p.type === "month")!.value) - 1; // 0-indexed
  const arD = parseInt(arDateParts.find(p => p.type === "day")!.value);

  // Medianoche Argentina = 03:00 UTC
  const hoyARStart = new Date(Date.UTC(arY, arM, arD) + AR_MS);
  const hoyAREnd   = new Date(hoyARStart.getTime() + 86_400_000);

  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - 7);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const en30dias = new Date(hoy);
  en30dias.setDate(hoy.getDate() + 30);

  const nombre = session.user.nombre?.split(" ")[0] ?? "Usuario";
  const greeting = greetingByHour();
  const inmobiliariaNombre = (session.user as { inmobiliariaNombre?: string | null }).inmobiliariaNombre;

  const [
    totalPropiedades,
    propiedadesDisponibles,
    totalClientes,
    visitasSemana,
    contratosActivos,
    contratosAtrasados,
    consultasNoLeidas,
    operacionesMes,
    visitasHoy,
    visitasProximas,
    contratosPorVencer,
    consultasRecientes,
    actividadSemanal,
  ] = await Promise.all([
    db.propiedad.count({ where: { inmobiliariaId } }),
    db.propiedad.count({ where: { inmobiliariaId, estado: "DISPONIBLE", publicada: true } }),
    db.cliente.count({ where: { inmobiliariaId } }),
    db.visita.count({ where: { inmobiliariaId, createdAt: { gte: inicioSemana } } }),
    db.contratoAlquiler.count({ where: { inmobiliariaId, fechaFin: { gte: hoy } } }),
    db.contratoAlquiler.count({ where: { inmobiliariaId, fechaFin: { gte: hoy }, estadoPago: "ATRASADO" } }),
    db.consulta.count({ where: { inmobiliariaId, leida: false } }),
    db.operacionCerrada.count({ where: { inmobiliariaId, fechaCierre: { gte: inicioMes } } }),
    // Visitas de HOY (prioridad) — ordenadas por hora
    db.visita.findMany({
      where: {
        inmobiliariaId,
        estado: "PENDIENTE",
        fechaHora: { gte: hoyARStart, lt: hoyAREnd },
      },
      orderBy: { fechaHora: "asc" },
      include: {
        propiedad: { select: { titulo: true } },
        cliente: { select: { nombre: true } },
        agente: { select: { nombre: true } },
      },
    }),
    // Visitas próximas (desde mañana)
    db.visita.findMany({
      where: { inmobiliariaId, estado: "PENDIENTE", fechaHora: { gte: hoyAREnd } },
      orderBy: { fechaHora: "asc" },
      take: 3,
      include: {
        propiedad: { select: { titulo: true } },
        cliente: { select: { nombre: true } },
        agente: { select: { nombre: true } },
      },
    }),
    db.contratoAlquiler.findMany({
      where: { inmobiliariaId, fechaFin: { gte: hoy, lte: en30dias } },
      orderBy: { fechaFin: "asc" },
      take: 3,
      include: { propiedad: { select: { titulo: true } } },
    }),
    db.consulta.findMany({
      where: { inmobiliariaId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        propiedad: { select: { titulo: true } },
      },
    }),
    // Actividad de los últimos 7 días usando boundaries de medianoche Argentina
    // diaStart = medianoche AR (03:00 UTC). Usada tanto para el query como para el label.
    // El label se formatea con timeZone explícito para evitar hidratación mismatch.
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const offset   = 6 - i;                                         // 0 = hoy, 6 = hace 6 días
        const diaStart = new Date(Date.UTC(arY, arM, arD - offset) + AR_MS); // medianoche AR en UTC
        const diaSig   = new Date(diaStart.getTime() + 86_400_000);
        return Promise.all([
          db.visita.count({ where: { inmobiliariaId, createdAt: { gte: diaStart, lt: diaSig } } }),
          db.consulta.count({ where: { inmobiliariaId, createdAt: { gte: diaStart, lt: diaSig } } }),
          db.operacionCerrada.count({ where: { inmobiliariaId, fechaCierre: { gte: diaStart, lt: diaSig } } }),
        ]).then(([visitas, consultas, cierres]) => ({ diaStart, visitas, consultas, cierres }));
      })
    ),
  ]);

  const pendientes = consultasNoLeidas + contratosAtrasados;

  return (
    <div className="space-y-5">
      {/* ── Greeting ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-fraunces-display), Georgia, serif",
            fontSize: 38, fontWeight: 500, margin: 0,
            color: "var(--antracita-900, #14110E)", lineHeight: 1.1, letterSpacing: "-0.02em",
          }}>
            {greeting},{" "}
            <em style={{ fontStyle: "italic", color: "var(--terracota-500, #C1694F)" }}>{nombre}</em>
          </h1>
          <p style={{ fontSize: 13, color: "var(--antracita-500, #3A332C)", margin: "6px 0 0" }}>
            {formatDate(hoy, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {inmobiliariaNombre && (
              <>
                <span style={{ color: "var(--antracita-300)", margin: "0 8px" }}>·</span>
                {inmobiliariaNombre}
              </>
            )}
          </p>
        </div>
        {pendientes > 0 && (
          <Pill tone="terra">
            {pendientes} acción{pendientes !== 1 ? "es" : ""} pendiente{pendientes !== 1 ? "s" : ""}
          </Pill>
        )}
      </div>

      {/* ── Alert Banner ── */}
      <AlertBanner items={[
        { count: consultasNoLeidas, label: `consulta${consultasNoLeidas !== 1 ? "s" : ""} sin leer`, tone: "terra", href: "/consultas" },
        { count: contratosPorVencer.length, label: `contrato${contratosPorVencer.length !== 1 ? "s" : ""} vencen en 30 días`, tone: "warning", href: "/alquileres" },
        { count: contratosAtrasados, label: `pago${contratosAtrasados !== 1 ? "s" : ""} atrasado${contratosAtrasados !== 1 ? "s" : ""}`, tone: "danger", href: "/alquileres" },
      ]} />

      {/* ── 6 KPI Cards ── */}
      {/* El gridTemplateColumns NO va inline: pisaría las clases responsive */}
      <div style={{ gap: 12 }} className="grid grid-cols-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(6,1fr)]">
        <KPICard label="Propiedades activas" value={totalPropiedades} sub={`${propiedadesDisponibles} disponibles`} icon={Building2} iconColor="var(--antracita-700)" iconBg="var(--crema-100)" href="/propiedades" />
        <KPICard label="Pipeline · clientes" value={totalClientes} sub="en el sistema" icon={Users} iconColor="var(--il-accent)" iconBg="var(--il-accent-soft)" href="/clientes" />
        <KPICard label="Visitas esta semana" value={visitasSemana} sub="agendadas" icon={Clock} iconColor="var(--antracita-700)" iconBg="var(--crema-100)" href="/visitas" />
        <KPICard label="Alquileres activos" value={contratosActivos} sub={contratosAtrasados > 0 ? `${contratosAtrasados} atrasados` : "todos al día"} icon={FileText} iconColor="var(--success-500)" iconBg="var(--success-100)" href="/alquileres" />
        <KPICard label="Operaciones · mes" value={operacionesMes} sub={`desde el 1° de ${formatDate(hoy, { month: "long" })}`} icon={BarChart2} iconColor="var(--antracita-700)" iconBg="var(--crema-100)" href="/finanzas" />
        <KPICard label="Consultas sin leer" value={consultasNoLeidas} sub="del marketplace" icon={MessageSquare} iconColor="var(--terracota-500)" iconBg="var(--terracota-100)" href="/consultas" highlight mono />
      </div>

      {/* ── Dos columnas: Visitas + Consultas recientes ── */}
      <div style={{ gap: 16 }} className="grid grid-cols-1 lg:[grid-template-columns:1.5fr_1fr]">
        {/* Visitas — hoy como prioridad, luego próximas */}
        <div className="il-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <CalendarCheck style={{ width: 16, height: 16, color: "var(--terracota-500)" }} />
              <h3 style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", fontSize: 18, margin: 0, color: "var(--antracita-900)" }}>
                Visitas
              </h3>
              {visitasHoy.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: "var(--terracota-500)", color: "#fff", borderRadius: 999, padding: "2px 8px" }}>
                  {visitasHoy.length} hoy
                </span>
              )}
            </div>
            <Link href="/visitas" style={{ fontSize: 12, color: "var(--terracota-600)", textDecoration: "none", fontWeight: 500 }}>
              Ver todas →
            </Link>
          </div>

          {visitasHoy.length === 0 && visitasProximas.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, padding: "32px 0", color: "var(--antracita-300)" }}>
              Sin visitas pendientes
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              {/* ── Visitas de HOY ── */}
              {visitasHoy.length > 0 && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--terracota-600)", fontFamily: "var(--font-jetbrains-mono), monospace", margin: "0 0 4px 2px" }}>
                    Hoy — {formatDate(hoy, { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  {visitasHoy.map((v) => {
                    const hora = v.fechaHora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
                    const yaPaso = v.fechaHora < hoy;
                    return (
                      <div key={v.id} style={{
                        display: "grid", gridTemplateColumns: "56px 1fr auto",
                        gap: 12, alignItems: "center", padding: "11px 14px",
                        background: yaPaso ? "var(--crema-50)" : "var(--terracota-50, #FBF1EC)",
                        border: `1px solid ${yaPaso ? "var(--border)" : "var(--terracota-200, #F0C9BA)"}`,
                        borderRadius: 10,
                      }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 16, fontWeight: 700, color: yaPaso ? "var(--antracita-400)" : "var(--terracota-600)" }}>
                            {hora}
                          </div>
                          {yaPaso && <div style={{ fontSize: 9, color: "var(--antracita-300)", marginTop: 2 }}>pasada</div>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {v.propiedad.titulo}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--antracita-500)", marginTop: 2 }}>
                            {v.cliente.nombre}
                            <span style={{ color: "var(--antracita-300)", margin: "0 5px" }}>·</span>
                            {v.agente.nombre}
                          </div>
                        </div>
                        <Pill tone="warning" style={{ fontSize: 10 }}>
                          Pendiente
                        </Pill>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── Próximas (días siguientes) ── */}
              {visitasProximas.length > 0 && (
                <>
                  {visitasHoy.length > 0 && (
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-400)", fontFamily: "var(--font-jetbrains-mono), monospace", margin: "8px 0 4px 2px" }}>
                      Próximas
                    </p>
                  )}
                  {visitasProximas.map((v) => {
                    const hora = v.fechaHora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
                    const fechaLabel = formatDate(v.fechaHora, { day: "numeric", month: "short" });
                    return (
                      <div key={v.id} style={{
                        display: "grid", gridTemplateColumns: "56px 1fr auto",
                        gap: 12, alignItems: "center", padding: "10px 14px",
                        background: "transparent", border: "1px solid transparent", borderRadius: 10,
                      }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 9.5, color: "var(--antracita-400)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>{fechaLabel}</div>
                          <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 14, fontWeight: 600, color: "var(--antracita-700)" }}>{hora}</div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {v.propiedad.titulo}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--antracita-500)", marginTop: 2 }}>
                            {v.cliente.nombre}
                            <span style={{ color: "var(--antracita-300)", margin: "0 5px" }}>·</span>
                            {v.agente.nombre}
                          </div>
                        </div>
                        <Pill tone="warning" style={{ fontSize: 10 }}>Pendiente</Pill>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Consultas recientes */}
        <div className="il-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <MessageSquare style={{ width: 16, height: 16, color: "var(--terracota-500)" }} />
              <h3 style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", fontSize: 18, margin: 0, color: "var(--antracita-900)" }}>
                Consultas recientes
              </h3>
            </div>
            {consultasNoLeidas > 0 && (
              <Pill tone="terra" style={{ fontSize: 10 }}>{consultasNoLeidas} nuevas</Pill>
            )}
          </div>

          {consultasRecientes.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, padding: "32px 0", color: "var(--antracita-300)" }}>
              Sin consultas aún
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {consultasRecientes.map((c, i) => {
                const tiempo = (() => {
                  const diff = Math.floor((hoy.getTime() - c.createdAt.getTime()) / 60000);
                  if (diff < 60) return `hace ${diff} min`;
                  if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`;
                  return "ayer";
                })();
                return (
                  <div key={c.id} style={{
                    display: "flex", gap: 12, padding: "10px 4px",
                    borderBottom: i < consultasRecientes.length - 1 ? "1px solid var(--border)" : "none",
                    alignItems: "center",
                  }}>
                    <AvatarInitials
                      name={c.nombreVisitante}
                      size={32}
                      bg={!c.leida ? "var(--terracota-500)" : "var(--antracita-300)"}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", display: "flex", alignItems: "center", gap: 6 }}>
                        {c.nombreVisitante}
                        {!c.leida && (
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--terracota-500)", flexShrink: 0 }} />
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--antracita-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.propiedad?.titulo ?? "Consulta general"}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10.5, color: "var(--antracita-300)",
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      whiteSpace: "nowrap",
                    }}>
                      {tiempo}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/consultas" style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 500, color: "var(--terracota-600)", marginTop: 12, textDecoration: "none" }}>
            Ver todas las consultas →
          </Link>
        </div>
      </div>

      {/* ── Dos columnas: Actividad semanal + Contratos por vencer ── */}
      <div style={{ gap: 16 }} className="grid grid-cols-1 lg:[grid-template-columns:1.6fr_1fr]">
        {/* Chart */}
        <div className="il-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", fontSize: 18, margin: 0, color: "var(--antracita-900)" }}>
              Actividad semanal
            </h3>
            <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--antracita-500)", alignItems: "center" }}>
              <LegendDot color="var(--terracota-500)" label="Visitas" />
              <LegendDot color="var(--il-accent, #2D4A6B)" label="Consultas" />
              <LegendDot color="var(--dorado-500, #C9A55C)" label="Cierres" />
            </div>
          </div>
          <DashboardActivityChart data={actividadSemanal.map(d => ({
            // Formatear con timezone Argentina explícito → idéntico en server y client
            dia: d.diaStart.toLocaleDateString("es-AR", {
              weekday: "short",
              timeZone: "America/Argentina/Buenos_Aires",
            }),
            visitas: d.visitas,
            consultas: d.consultas,
            cierres: d.cierres,
          }))} />
        </div>

        {/* Contratos por vencer */}
        <div className="il-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", fontSize: 18, margin: 0, color: "var(--antracita-900)" }}>
              Contratos que vencen
            </h3>
            <span style={{ fontSize: 11, color: "var(--antracita-500)" }}>próximos 30 días</span>
          </div>

          {contratosPorVencer.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, padding: "32px 0", color: "var(--antracita-300)" }}>
              Sin contratos próximos a vencer
            </p>
          ) : (
            <div>
              {contratosPorVencer.map((c, i) => {
                const dias = Math.ceil((c.fechaFin.getTime() - hoy.getTime()) / 86400_000);
                const urgente = dias <= 7;
                const pct = Math.max(0, 100 - (dias / 30) * 100);
                return (
                  <div key={c.id} style={{
                    padding: "12px 0",
                    borderBottom: i < contratosPorVencer.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", flex: 1, marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.propiedad.titulo}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: urgente ? "var(--danger-500)" : "var(--warning-500)", flexShrink: 0, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                        {dias}d
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: "var(--antracita-500)", margin: "0 0 6px" }}>{c.inquilinoNombre}</p>
                    <div style={{ height: 3, background: "var(--crema-200)", borderRadius: 999 }}>
                      <div style={{ height: 3, borderRadius: 999, background: urgente ? "var(--danger-500)" : "var(--warning-500)", width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/alquileres" style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 500, color: "var(--terracota-600)", marginTop: 12, textDecoration: "none" }}>
            Ver todos los contratos →
          </Link>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}
