import { db } from "@/lib/db";
import { MonitoreoClient } from "@/components/admin/MonitoreoClient";

export const metadata = { title: "Monitoreo — Admin" };

// Crons configurados en vercel.json — si el último log INFO de uno de estos
// orígenes es más viejo que esto, algo dejó de correr (deberían correr 1 vez
// por día cada uno).
const CRONS = [
  { origen: "cron/alertas", label: "Alertas (suscripciones, visitas, pagos, leads fríos)" },
  { origen: "cron/ajustes-alquiler", label: "Ajustes de alquiler (ICL/IPC)" },
];
const HORAS_STALE = 36;

export default async function MonitoreoPage() {
  // Server Component: corre una sola vez por request, no lo vuelve a
  // renderizar el React Compiler — el chequeo de "función impura" de esta
  // regla apunta a componentes de cliente memoizados, no aplica acá.
  // eslint-disable-next-line react-hooks/purity
  const ahora = Date.now();

  const [ultimasCorridas, logsRecientes, errores24h, errores7d] = await Promise.all([
    Promise.all(
      CRONS.map((c) =>
        db.systemLog.findFirst({
          where: { origen: c.origen, nivel: "INFO" },
          orderBy: { createdAt: "desc" },
        })
      )
    ),
    db.systemLog.findMany({
      where: { nivel: { in: ["ERROR", "WARN"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.systemLog.count({
      where: { nivel: "ERROR", createdAt: { gte: new Date(ahora - 24 * 60 * 60 * 1000) } },
    }),
    db.systemLog.count({
      where: { nivel: "ERROR", createdAt: { gte: new Date(ahora - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const corridas = CRONS.map((c, i) => {
    const ultima = ultimasCorridas[i];
    const stale =
      !ultima || ultima.createdAt.getTime() < ahora - HORAS_STALE * 60 * 60 * 1000;
    return {
      origen: c.origen,
      label: c.label,
      ultimaCorrida: ultima?.createdAt.toISOString() ?? null,
      mensaje: ultima?.mensaje ?? null,
      stale,
    };
  });

  const logs = logsRecientes.map((l) => ({
    id: l.id,
    nivel: l.nivel,
    origen: l.origen,
    mensaje: l.mensaje,
    detalle: l.detalle,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <MonitoreoClient
      corridas={corridas}
      logs={logs}
      errores24h={errores24h}
      errores7d={errores7d}
    />
  );
}
