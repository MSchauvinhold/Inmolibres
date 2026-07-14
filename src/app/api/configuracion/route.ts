import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const inmobiliariaId = session.user.inmobiliariaId;

  let config = await db.configuracionInmobiliaria.findUnique({ where: { inmobiliariaId } });

  if (!config) {
    config = await db.configuracionInmobiliaria.create({ data: { inmobiliariaId } });
  }

  return NextResponse.json({ data: config });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const inmobiliariaId = session.user.inmobiliariaId;

  const body = await req.json() as Record<string, unknown>;

  const allowed = [
    "comisionVendedorPct", "comisionCompradorPct", "comisionAlquilerMeses",
    "comisionAdministracionPct",
    "comisionAgentePct", "comisionInmobPct", "ivaIncluido", "monedaPreferida",
    "colorPrimario", "colorSecundario", "clausulasAdicionales", "piePaginaContrato",
    "cuit", "razonSocial", "domicilioLegal", "matriculaCorredora",
    "ciudad", "provincia",
    "logoEnContrato",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  try {
    const config = await db.configuracionInmobiliaria.upsert({
      where: { inmobiliariaId },
      create: { inmobiliariaId, ...data },
      update: data,
    });
    return NextResponse.json({ data: config });
  } catch (e) {
    console.error("[PUT /api/configuracion]", e);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
