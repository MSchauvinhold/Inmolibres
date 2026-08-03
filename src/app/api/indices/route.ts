import { NextResponse } from "next/server";
import { obtenerIndiceActual } from "@/lib/indices";

export async function GET() {
  // Misma fuente que usa el cron de ajustes (src/lib/indices.ts) — así no se pueden
  // desincronizar el valor que ve el usuario y el que usa el cálculo del ajuste.
  const [ipc, icl] = await Promise.all([
    obtenerIndiceActual("IPC", 86400),
    obtenerIndiceActual("ICL", 86400),
  ]);

  return NextResponse.json({
    data: {
      ipc,
      icl,
      actualizadoEn: new Date().toISOString(),
    },
  });
}
