import { db } from "@/lib/db";

/**
 * Registro de eventos del sistema para el panel de Monitoreo (SuperAdmin).
 *
 * Pensado sobre todo para los cron jobs y otros procesos que corren sin que
 * nadie los esté mirando: si fallan en silencio, hoy solo queda en los logs
 * de Vercel y nadie se entera hasta que un cliente se queja. Esto lo deja
 * visible dentro del sistema.
 *
 * Nunca debe romper el flujo que la llama — si escribir el log falla (ej. la
 * DB no responde), se traga el error y solo lo deja en consola.
 */
export async function logSystemEvent(
  nivel: "INFO" | "WARN" | "ERROR",
  origen: string,
  mensaje: string,
  detalle?: unknown
): Promise<void> {
  try {
    await db.systemLog.create({
      data: {
        nivel,
        origen,
        mensaje,
        detalle: detalle != null ? stringify(detalle) : null,
      },
    });
  } catch (e) {
    console.error("[system-log] No se pudo registrar el evento:", e);
  }
}

function stringify(detalle: unknown): string {
  if (detalle instanceof Error) {
    return detalle.stack ?? detalle.message;
  }
  if (typeof detalle === "string") return detalle;
  try {
    return JSON.stringify(detalle);
  } catch {
    return String(detalle);
  }
}
