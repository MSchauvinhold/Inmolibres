import { NextResponse } from "next/server";

const INDEC_URL =
  "https://apis.datos.gob.ar/series/api/series/?ids=103.1_I2N_2016_M_19&limit=3&sort=desc";
const BCRA_ICL_URL =
  "https://api.bcra.gob.ar/estadisticas/v3.0/dasboard?idDato=47";

async function fetchIPC() {
  try {
    const res = await fetch(INDEC_URL, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: { data: [string, number][] } };
    const rows = json?.data?.data;
    if (!rows?.length) return null;
    return {
      valor: rows[0][1],
      fecha: rows[0][0],
      anterior: rows[1]?.[1] ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchICL() {
  try {
    const res = await fetch(BCRA_ICL_URL, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results: { valor: number; fecha: string }[] };
    const rows = json?.results;
    if (!rows?.length) return null;
    return {
      valor: rows[0]?.valor,
      fecha: rows[0]?.fecha,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const [ipc, icl] = await Promise.all([fetchIPC(), fetchICL()]);

  return NextResponse.json({
    data: {
      ipc,
      icl,
      actualizadoEn: new Date().toISOString(),
    },
  });
}
