// Helpers para obtener los índices de actualización de alquileres.
//   - ICL → API oficial del BCRA (gratis, sin token), variable 40:
//           "Índice para Contratos de Locación (base 30.6.20=1)"
//   - IPC → series de datos.gob.ar (INDEC)
//
// Fuente única: /api/indices y el cron de ajustes consumen estas funciones.

const INDEC_URL =
  "https://apis.datos.gob.ar/series/api/series/?ids=103.1_I2N_2016_M_19&limit=3&sort=desc";

// v4 de la API del BCRA. La v3 fue deprecada (devuelve 410) y el id correcto del
// Índice para Contratos de Locación es el 40 (el 47 es otra serie distinta).
const BCRA_ICL_URL =
  "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/40?limit=3";

export interface IndiceActual {
  valor: number;
  fecha: string;
  /** Valor del período anterior, cuando la fuente lo provee. */
  anterior?: number | null;
}

async function fetchICL(revalidate: number): Promise<IndiceActual | null> {
  try {
    const res = await fetch(BCRA_ICL_URL, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: { idVariable: number; detalle?: { fecha: string; valor: number }[] }[];
    };
    // Forma real: { results: [ { idVariable, detalle: [ {fecha, valor}, ... ] } ] }
    const detalle = json?.results?.[0]?.detalle;
    const row = detalle?.[0];
    if (!row || typeof row.valor !== "number") return null;
    return { valor: row.valor, fecha: row.fecha, anterior: detalle?.[1]?.valor ?? null };
  } catch {
    return null;
  }
}

async function fetchIPC(revalidate: number): Promise<IndiceActual | null> {
  try {
    const res = await fetch(INDEC_URL, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    // Forma real: { data: [ [fecha, valor], ... ] } — `data` ES el array, no un objeto.
    const json = (await res.json()) as { data?: [string, number][] };
    const rows = json?.data;
    if (!rows?.length) return null;
    const [fecha, valor] = rows[0];
    if (typeof valor !== "number") return null;
    return { valor, fecha, anterior: rows[1]?.[1] ?? null };
  } catch {
    return null;
  }
}

/** Devuelve el valor actual del índice solicitado (ICL o IPC) o null si falla la API. */
export async function obtenerIndiceActual(
  tipo: "ICL" | "IPC",
  revalidate = 3600
): Promise<IndiceActual | null> {
  return tipo === "ICL" ? fetchICL(revalidate) : fetchIPC(revalidate);
}

// ─── Índice histórico ─────────────────────────────────────────────────────────
// Necesario para que el índice BASE de un contrato sea el del día en que empezó
// (o el de su último ajuste), y no el de hoy. Si se usa el de hoy, un contrato
// que arrancó hace meses pierde toda la inflación acumulada: el primer ajuste da
// 0% y el propietario nunca recupera ese período.

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchICLEnFecha(fecha: Date): Promise<IndiceActual | null> {
  try {
    // El ICL es diario pero no publica fines de semana ni feriados: pedimos una
    // ventana hacia atrás y tomamos el último valor con fecha <= la buscada.
    const desde = new Date(fecha);
    desde.setDate(desde.getDate() - 15);
    const url = `https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/40?desde=${ymd(desde)}&hasta=${ymd(fecha)}&limit=50`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: { detalle?: { fecha: string; valor: number }[] }[];
    };
    const detalle = json?.results?.[0]?.detalle;
    if (!detalle?.length) return null;
    // La API devuelve descendente; el primero es el más cercano a `fecha`.
    const objetivo = ymd(fecha);
    const row = detalle.find((d) => d.fecha <= objetivo) ?? detalle[0];
    if (!row || typeof row.valor !== "number") return null;
    return { valor: row.valor, fecha: row.fecha };
  } catch {
    return null;
  }
}

async function fetchIPCEnFecha(fecha: Date): Promise<IndiceActual | null> {
  try {
    // El IPC es mensual: buscamos el dato del mes que contiene a `fecha`.
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    const url = `https://apis.datos.gob.ar/series/api/series/?ids=103.1_I2N_2016_M_19&start_date=${ymd(inicioMes)}&end_date=${ymd(finMes)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: [string, number][] };
    const rows = json?.data;
    if (!rows?.length) return null;
    const [f, valor] = rows[rows.length - 1];
    if (typeof valor !== "number") return null;
    return { valor, fecha: f };
  } catch {
    return null;
  }
}

/**
 * Valor del índice en una fecha pasada. Se usa para fijar el índice BASE de un
 * contrato al momento en que empezó (o de su último ajuste). Si la fecha es hoy
 * o futura, cae en el valor actual.
 */
export async function obtenerIndiceEnFecha(
  tipo: "ICL" | "IPC",
  fecha: Date
): Promise<IndiceActual | null> {
  const hoy = new Date();
  if (fecha >= hoy) return obtenerIndiceActual(tipo);
  const historico = tipo === "ICL" ? await fetchICLEnFecha(fecha) : await fetchIPCEnFecha(fecha);
  // Si la fuente no tiene ese período, mejor el valor actual que nada.
  return historico ?? obtenerIndiceActual(tipo);
}
