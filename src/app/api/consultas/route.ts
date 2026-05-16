import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { consultaPublicaSchema } from "@/lib/validations/rental";
import { notifyInmobiliaria, NotifMessages } from "@/lib/notifications";
import { buildPaginationMeta } from "@/lib/utils";

export async function GET(request: NextRequest) {
  // /api/consultas is marked public in proxy.ts, so headers won't be injected.
  // Use auth() directly to verify session.
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const inmobiliariaId = session.user.inmobiliariaId;
  const userRol = session.user.rol;

  if (!inmobiliariaId || (userRol !== "ADMIN" && userRol !== "AGENTE")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const soloNoLeidas = searchParams.get("soloNoLeidas") === "true";

  const where = {
    inmobiliariaId,
    ...(soloNoLeidas ? { leida: false } : {}),
  };

  const skip = (page - 1) * pageSize;

  try {
    const [total, consultas] = await Promise.all([
      db.consulta.count({ where }),
      db.consulta.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          propiedad: {
            select: { id: true, titulo: true, slug: true, tipo: true, operacion: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: consultas,
      meta: buildPaginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener consultas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Public endpoint — no auth required
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = consultaPublicaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const propiedad = await db.propiedad.findUnique({
      where: { id: parsed.data.propiedadId, publicada: true },
      select: { id: true, titulo: true, inmobiliariaId: true },
    });

    if (!propiedad) {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    const emailValue = parsed.data.email?.trim() || null;

    const consulta = await db.consulta.create({
      data: {
        propiedadId: propiedad.id,
        inmobiliariaId: propiedad.inmobiliariaId,
        nombreVisitante: parsed.data.nombreVisitante,
        telefono: parsed.data.telefono,
        email: emailValue,
        mensaje: parsed.data.mensaje,
      },
    });

    // Non-blocking: don't let notification failure break the response
    const notif = NotifMessages.consultaNueva(propiedad.titulo, consulta.nombreVisitante);
    notifyInmobiliaria(
      propiedad.inmobiliariaId,
      "CONSULTA_NUEVA",
      notif.titulo,
      notif.mensaje,
      notif.url,
      ["ADMIN", "AGENTE"],
      consulta.id
    ).catch(() => {/* ignore */});

    return NextResponse.json({ data: { id: consulta.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al enviar consulta" }, { status: 500 });
  }
}
