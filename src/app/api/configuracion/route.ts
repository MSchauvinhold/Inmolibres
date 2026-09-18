import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";
import { configuracionSchema } from "@/lib/validations/configuracion";

export async function GET() {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;

  const { inmobiliariaId } = session;

  let config = await db.configuracionInmobiliaria.findUnique({ where: { inmobiliariaId } });

  if (!config) {
    config = await db.configuracionInmobiliaria.create({ data: { inmobiliariaId } });
  }

  return NextResponse.json({ data: config });
}

export async function PUT(req: Request) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;
  if (session.rol !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { inmobiliariaId } = session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // El schema hace de allowlist: los campos desconocidos se descartan y el texto
  // libre que termina en el PDF del contrato se valida acá (ver contrato-pdf.ts).
  const parsed = configuracionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Solo se tocan las claves que el cliente mandó (los patches son parciales).
  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );

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
