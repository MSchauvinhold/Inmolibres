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
  plan: z.enum(["BASICO", "AVANZADO", "PRO"]).optional(),
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

    // ── Suspender / Inactivar → despublicar propiedades ──────────────
    if (parsed.data.estado === "SUSPENDIDA" || parsed.data.estado === "INACTIVA") {
      await db.propiedad.updateMany({
        where: { inmobiliariaId: id },
        data: { publicada: false },
      });

      const notif = NotifMessages.suscripcionSuspendida(inmobiliaria.nombre);
      notifyInmobiliaria(id, "SUSCRIPCION_SUSPENDIDA", notif.titulo, notif.mensaje, notif.url).catch(() => {});
    }

    // ── Reactivar (ACTIVA / PRUEBA) → republicar propiedades ─────────
    if (parsed.data.estado === "ACTIVA" || parsed.data.estado === "PRUEBA") {
      await db.propiedad.updateMany({
        where: { inmobiliariaId: id },
        data: { publicada: true },
      });

      notifyInmobiliaria(
        id,
        "SUSCRIPCION_RENOVADA",
        "Cuenta reactivada",
        `${inmobiliaria.nombre}, tu cuenta fue reactivada. Tus publicaciones ya están visibles en el marketplace.`,
        "/dashboard",
      ).catch(() => {});
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

    // Eliminación manual en orden topológico — todos los modelos que referencian
    // entidades de esta inmobiliaria sin onDelete: Cascade deben borrarse antes
    // que su tabla padre. Orden crítico:
    //   - Visita, ContratoAlquiler, Consulta → antes de Propiedad y Cliente
    //   - OperacionCerrada → antes de Usuario (agenteId sin cascade)
    //   - Propiedad → antes de Usuario (agenteId sin cascade)
    //     ↳ auto-cascadea FotoPropiedad, PropiedadAtributos, PropiedadCliente
    //   - Cliente → antes de Usuario (agenteId nullable sin cascade)
    //     ↳ auto-cascadea DocumentoCliente
    //   - Usuario → antes de Inmobiliaria (inmobiliariaId sin cascade)
    //     ↳ auto-cascadea Notificacion, PermisosAgente
    //   - Inmobiliaria → queda sin dependientes, se borra limpio
    await db.$transaction(async (tx) => {
      await tx.visita.deleteMany({ where: { inmobiliariaId: id } });
      await tx.contratoAlquiler.deleteMany({ where: { inmobiliariaId: id } });
      await tx.consulta.deleteMany({ where: { inmobiliariaId: id } });
      await tx.operacionCerrada.deleteMany({ where: { inmobiliariaId: id } });
      await tx.egresoInmobiliaria.deleteMany({ where: { inmobiliariaId: id } });
      await tx.pagoSuscripcion.deleteMany({ where: { inmobiliariaId: id } });
      // Propiedad y Cliente ANTES de Usuario para limpiar sus agenteId FKs
      await tx.propiedad.deleteMany({ where: { inmobiliariaId: id } });
      await tx.cliente.deleteMany({ where: { inmobiliariaId: id } });
      await tx.configuracionInmobiliaria.deleteMany({ where: { inmobiliariaId: id } });
      await tx.usuario.deleteMany({ where: { inmobiliariaId: id } });
      await tx.inmobiliaria.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/inmobiliarias]", e);
    return NextResponse.json({ error: "Error al eliminar inmobiliaria" }, { status: 500 });
  }
}
