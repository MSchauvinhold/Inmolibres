import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, CalendarCheck, FileText, Clock, AlertCircle, TriangleAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  const inmobiliariaId = session.user.inmobiliariaId;
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - 7);
  const en30dias = new Date(hoy);
  en30dias.setDate(hoy.getDate() + 30);

  const [
    totalPropiedades,
    propiedadesDisponibles,
    totalClientes,
    visitasSemana,
    contratosActivos,
    contratosAtrasados,
    consultasNoLeidas,
    visitasProximas,
    contratosPorVencer,
  ] = await Promise.all([
    db.propiedad.count({ where: { inmobiliariaId } }),
    db.propiedad.count({ where: { inmobiliariaId, estado: "DISPONIBLE", publicada: true } }),
    db.cliente.count({ where: { inmobiliariaId } }),
    db.visita.count({ where: { inmobiliariaId, createdAt: { gte: inicioSemana } } }),
    db.contratoAlquiler.count({ where: { inmobiliariaId, fechaFin: { gte: hoy } } }),
    db.contratoAlquiler.count({ where: { inmobiliariaId, fechaFin: { gte: hoy }, estadoPago: "ATRASADO" } }),
    db.consulta.count({ where: { inmobiliariaId, leida: false } }),
    db.visita.findMany({
      where: { inmobiliariaId, estado: "PENDIENTE", fechaHora: { gte: hoy } },
      orderBy: { fechaHora: "asc" },
      take: 5,
      include: {
        propiedad: { select: { titulo: true } },
        cliente: { select: { nombre: true } },
        agente: { select: { nombre: true } },
      },
    }),
    db.contratoAlquiler.findMany({
      where: { inmobiliariaId, fechaFin: { gte: hoy, lte: en30dias } },
      orderBy: { fechaFin: "asc" },
      take: 5,
      include: { propiedad: { select: { titulo: true } } },
    }),
  ]);

  const stats = [
    { label: "Propiedades", value: totalPropiedades, sub: `${propiedadesDisponibles} disponibles`, icon: Building2, color: "text-brand-primary", bg: "bg-brand-primary/10", href: "/propiedades" },
    { label: "Clientes", value: totalClientes, sub: "en el sistema", icon: Users, color: "text-info", bg: "bg-info/10", href: "/clientes" },
    { label: "Visitas esta semana", value: visitasSemana, sub: "agendadas", icon: CalendarCheck, color: "text-success", bg: "bg-success/10", href: "/visitas" },
    { label: "Alquileres activos", value: contratosActivos, sub: contratosAtrasados > 0 ? `${contratosAtrasados} atrasados` : "al día", icon: FileText, color: contratosAtrasados > 0 ? "text-danger" : "text-brand-primary", bg: contratosAtrasados > 0 ? "bg-danger/10" : "bg-brand-primary/10", href: "/alquileres" },
  ];

  const inmobiliariaNombre = (session.user as { inmobiliariaNombre?: string | null }).inmobiliariaNombre;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">
          Buen día, {session.user.nombre?.split(" ")[0]} 👋
        </h1>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-sm text-text-muted">{formatDate(hoy, { weekday: "long", day: "numeric", month: "long" })}</p>
          {inmobiliariaNombre && (
            <>
              <span className="text-text-muted text-sm">·</span>
              <span className="text-sm font-medium text-brand-primary">{inmobiliariaNombre}</span>
            </>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(consultasNoLeidas > 0 || contratosAtrasados > 0) && (
        <div className="space-y-2">
          {consultasNoLeidas > 0 && (
            <Link href="/consultas" className="flex items-center gap-3 p-3 rounded-xl bg-[#FAE5D3] border border-[#C1694F]/30 hover:bg-[#F5D5BE] transition-colors">
              <AlertCircle className="w-4 h-4 text-[#8B4513] shrink-0" />
              <p className="text-sm text-text-primary font-medium">{consultasNoLeidas} consulta{consultasNoLeidas > 1 ? "s" : ""} sin leer del marketplace</p>
            </Link>
          )}
          {contratosAtrasados > 0 && (
            <Link href="/alquileres" className="flex items-center gap-3 p-3 rounded-xl bg-danger/10 border border-danger/30 hover:bg-danger/15 transition-colors">
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              <p className="text-sm text-text-primary font-medium">{contratosAtrasados} pago{contratosAtrasados > 1 ? "s" : ""} de alquiler atrasado{contratosAtrasados > 1 ? "s" : ""}</p>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="card p-4 card-hover space-y-3">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className={`font-price text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-sm font-medium text-text-primary leading-tight">{label}</p>
              <p className="text-xs text-text-muted">{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Contratos por vencer */}
      {contratosPorVencer.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <TriangleAlert className="w-4 h-4 text-warning" /> Contratos por vencer (30 días)
            </h2>
            <Link href="/alquileres" className="text-xs text-brand-primary hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {contratosPorVencer.map((c) => {
              const diasRestantes = Math.ceil((c.fechaFin.getTime() - hoy.getTime()) / 86400_000);
              const urgente = diasRestantes <= 7;
              return (
                <div key={c.id} className={`flex items-center justify-between gap-4 p-3 rounded-xl ${urgente ? "bg-danger/5 border border-danger/20" : "bg-surface-raised"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{c.propiedad.titulo}</p>
                    <p className="text-xs text-text-muted">{c.inquilinoNombre}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${urgente ? "text-danger" : "text-warning"}`}>
                      {diasRestantes === 0 ? "Vence hoy" : `${diasRestantes}d`}
                    </p>
                    <p className="text-[10px] text-text-muted">{formatDate(c.fechaFin, { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming visits */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" /> Próximas visitas
          </h2>
          <Link href="/visitas" className="text-xs text-brand-primary hover:underline">Ver todas</Link>
        </div>
        {visitasProximas.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">Sin visitas pendientes</p>
        ) : (
          <div className="space-y-3">
            {visitasProximas.map((v) => (
              <div key={v.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-raised">
                <div className="text-center min-w-[48px]">
                  <p className="font-price text-lg font-bold text-brand-primary leading-none">{v.fechaHora.getDate()}</p>
                  <p className="text-[10px] text-text-muted uppercase">{v.fechaHora.toLocaleString("es-AR", { month: "short" })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{v.propiedad.titulo}</p>
                  <p className="text-xs text-text-muted">{v.cliente.nombre} · {v.agente.nombre}</p>
                </div>
                <p className="text-xs text-text-secondary font-medium shrink-0">
                  {v.fechaHora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
