import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCrmAuth, isNextResponse } from "@/lib/api-auth";
import { generateUniqueSlug } from "@/lib/utils";
import type { TipoPropiedad, TipoOperacion, Moneda } from "@prisma/client";

const TIPOS_VALIDOS: TipoPropiedad[] = ["CASA", "DEPARTAMENTO", "LOCAL", "GALPON", "TERRENO", "OFICINA"];
const OPERACIONES_VALIDAS: TipoOperacion[] = ["VENTA", "ALQUILER", "ALQUILER_TEMPORARIO"];
const MONEDAS_VALIDAS: Moneda[] = ["ARS", "USD"];

// ─── GET: descarga plantilla CSV ─────────────────────────────────────────────

export async function GET() {
  const headers = [
    "titulo",
    "tipo",
    "operacion",
    "precio",
    "moneda",
    "direccion",
    "descripcion",
    "superficieCubierta",
    "superficieTotal",
    "habitaciones",
    "banos",
    "garage",
    "pileta",
  ].join(",");

  const example = [
    "Casa en barrio residencial",
    "CASA",
    "VENTA",
    "85000",
    "USD",
    "San Martín 456",
    "Hermosa casa con jardín",
    "120",
    "200",
    "3",
    "2",
    "true",
    "false",
  ].join(",");

  const csv = `${headers}\n${example}\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla_propiedades.csv"',
    },
  });
}

// ─── POST: importar CSV ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await requireCrmAuth();
  if (isNextResponse(session)) return session;
  const { userId, inmobiliariaId, rol } = session;

  // Solo ADMIN y AGENTE pueden importar (no PARTICULAR)
  if (rol === "PARTICULAR") {
    return NextResponse.json({ error: "No permitido" }, { status: 403 });
  }

  let text: string;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    text = await file.text();
  } catch {
    return NextResponse.json({ error: "Error al leer el archivo" }, { status: 400 });
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "El CSV debe tener al menos una fila de datos" }, { status: 400 });
  }

  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  const get = (row: string[], key: string) => {
    const idx = headers.indexOf(key.toLowerCase());
    return idx >= 0 ? (row[idx] ?? "").trim() : "";
  };

  const resultados = { importadas: 0, errores: [] as string[] };

  for (let i = 0; i < dataLines.length; i++) {
    const linea = dataLines[i];
    if (!linea.trim()) continue;

    const row = linea.split(",");
    const lineaNum = i + 2;

    const titulo = get(row, "titulo");
    const tipo = get(row, "tipo").toUpperCase() as TipoPropiedad;
    const operacion = get(row, "operacion").toUpperCase() as TipoOperacion;
    const precioStr = get(row, "precio");
    const monedaRaw = get(row, "moneda").toUpperCase() || "USD";
    const direccion = get(row, "direccion");
    const descripcion = get(row, "descripcion");

    // Validaciones
    if (!titulo) { resultados.errores.push(`Fila ${lineaNum}: falta título`); continue; }
    if (!TIPOS_VALIDOS.includes(tipo)) { resultados.errores.push(`Fila ${lineaNum}: tipo inválido "${tipo}"`); continue; }
    if (!OPERACIONES_VALIDAS.includes(operacion)) { resultados.errores.push(`Fila ${lineaNum}: operación inválida "${operacion}"`); continue; }
    if (!direccion) { resultados.errores.push(`Fila ${lineaNum}: falta dirección`); continue; }

    const precio = parseFloat(precioStr);
    if (isNaN(precio) || precio < 0) { resultados.errores.push(`Fila ${lineaNum}: precio inválido`); continue; }

    const moneda: Moneda = MONEDAS_VALIDAS.includes(monedaRaw as Moneda) ? (monedaRaw as Moneda) : "USD";

    // Atributos opcionales
    const superficieCubierta = parseFloat(get(row, "superficieCubierta")) || undefined;
    const superficieTotal    = parseFloat(get(row, "superficieTotal"))    || undefined;
    const habitaciones       = parseInt(get(row, "habitaciones"))          || undefined;
    const banos              = parseInt(get(row, "banos"))                 || undefined;
    const garage  = get(row, "garage")  === "true" ? true : get(row, "garage")  === "false" ? false : undefined;
    const pileta  = get(row, "pileta")  === "true" ? true : get(row, "pileta")  === "false" ? false : undefined;

    try {
      const slug = await generateUniqueSlug(titulo);
      await db.propiedad.create({
        data: {
          titulo,
          slug,
          tipo,
          operacion,
          precio,
          moneda,
          direccion,
          descripcion: descripcion || undefined,
          publicada: false, // Las importadas comienzan sin publicar para revisión
          agenteId: userId,
          inmobiliariaId: inmobiliariaId ?? null,
          atributos: {
            create: {
              superficieCubierta: superficieCubierta ?? null,
              superficieTotal: superficieTotal ?? null,
              habitaciones: habitaciones ?? null,
              banos: banos ?? null,
              garage: garage ?? null,
              pileta: pileta ?? null,
            },
          },
        },
      });
      resultados.importadas++;
    } catch {
      resultados.errores.push(`Fila ${lineaNum}: error al guardar`);
    }
  }

  return NextResponse.json(resultados, { status: resultados.importadas > 0 ? 201 : 400 });
}
