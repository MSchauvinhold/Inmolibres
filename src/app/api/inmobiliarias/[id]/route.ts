import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";
import { notifyInmobiliaria, NotifMessages } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

const actualizarInmobiliariaSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  whatsapp: z.string().min(8).max(20).optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().url().optional().nullable(),
  plan: z.enum(["BASE", "PRO"]).optional(),
  estado: z.enum(["ACTIVA", "INACTIVA", "PRUEBA", "SUSPENDIDA"]).optional(),
  fechaVencimiento: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await params;

  try {
    const inmobiliaria = await db.inmobiliaria.findUnique({
      where: { id },
      include: {
        usuarios: {
          select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
        },
        pagos: { orderBy: { fechaPago: "desc" }, take: 10 },
        _count: { select: { propiedades: true, clientes: true, visitas: true } },
      },
    });

    if (!inmobiliaria) {
      return NextResponse.json({ error: "Inmobiliaria no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data: inmobiliaria });
  } catch {
    return NextResponse.json({ error: "Error al obtener inmobiliaria" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = actualizarInmobiliariaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { fechaVencimiento, ...rest } = parsed.data;

    const inmobiliaria = await db.inmobiliaria.update({
      where: { id },
      data: {
        ...rest,
        ...(fechaVencimiento !== undefined
          ? { fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null }
          : {}),
      },
    });

    if (parsed.data.estado === "SUSPENDIDA" || parsed.data.estado === "INACTIVA") {
      await db.propiedad.updateMany({
        where: { inmobiliariaId: id },
        data: { publicada: false },
      });

      const notif = NotifMessages.suscripcionSuspendida(inmobiliaria.nombre);
      notifyInmobiliaria(id, "SUSCRIPCION_SUSPENDIDA", notif.titulo, notif.mensaje, notif.url).catch(() => {});
    }

    return NextResponse.json({ data: inmobiliaria });
  } catch {
    return NextResponse.json({ error: "Error al actualizar inmobiliaria" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await params;

  try {
    const existing = await db.inmobiliaria.findUnique({
      where: { id },
      select: { id: true, nombre: true, estado: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Inmobiliaria no encontrada" }, { status: 404 });
    }

    if (existing.estado !== "INACTIVA") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar inmobiliarias inactivas" },
        { status: 400 }
      );
    }

    await db.inmobiliaria.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar inmobiliaria" }, { status: 500 });
  }
}
