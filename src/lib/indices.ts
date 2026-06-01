// Helpers para obtener los índices de actualización de alquileres.
// Usa las MISMAS fuentes que /api/indices/route.ts:
//   - ICL → API oficial del BCRA (gratis, sin token)
//   - IPC → series de datos.gob.ar (INDEC)

const INDEC_URL =
  "https://apis.datos.gob.ar/series/api/series/?ids=103.1_I2N_2016_M_19&limit=3&sort=desc";
const BCRA_ICL_URL =
  "https://api.bcra.gob.ar/estadisticas/v3.0/dasboard?idDato=47";

export interface IndiceActual {
  valor: number;
  fecha: string;
}

async function fetchICL(): Promise<IndiceActual | null> {
  try {
    const res = await fetch(BCRA_ICL_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: { valor: number; fecha: string }[] };
    const row = json?.results?.[0];
    if (!row || typeof row.valor !== "number") return null;
    return { valor: row.valor, fecha: row.fecha };
  } catch {
    return null;
  }
}

async function fetchIPC(): Promise<IndiceActual | null> {
  try {
    const res = await fetch(INDEC_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { data?: [string, number][] } };
    const rows = json?.data?.data;
    if (!rows?.length) return null;
    return { valor: rows[0][1], fecha: rows[0][0] };
  } catch {
    return null;
  }
}

/** Devuelve el valor actual del índice solicitado (ICL o IPC) o null si falla la API. */
export async function obtenerIndiceActual(tipo: "ICL" | "IPC"): Promise<IndiceActual | null> {
  return tipo === "ICL" ? fetchICL() : fetchIPC();
}
