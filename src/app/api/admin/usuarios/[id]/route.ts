import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * GET — impacto de eliminar este usuario, para poder avisarle al SUPERADMIN ANTES
 * de que confirme. No borra nada.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await params;

  const usuario = await db.usuario.findUnique({
    where: { id },
    select: {
      id: true, nombre: true, email: true, rol: true, inmobiliariaId: true,
      inmobiliaria: { select: { nombre: true } },
    },
  });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const [propiedades, clientes, visitas, operaciones, otroAdmin] = await Promise.all([
    db.propiedad.count({ where: { agenteId: id } }),
    db.cliente.count({ where: { agenteId: id } }),
    db.visita.count({ where: { agenteId: id } }),
    db.operacionCerrada.count({ where: { agenteId: id } }),
    usuario.inmobiliariaId
      ? db.usuario.findFirst({
          where: { inmobiliariaId: usuario.inmobiliariaId, rol: "ADMIN", activo: true, id: { not: id } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  // Mismo criterio que el DELETE: sin receptor, borrar destruiría historial contable.
  const tieneHistorial = visitas > 0 || operaciones > 0;
  const bloqueado = tieneHistorial && !otroAdmin;

  return NextResponse.json({
    data: {
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      inmobiliaria: usuario.inmobiliaria?.nombre ?? null,
      impacto: { propiedades, clientes, visitas, operaciones },
      bloqueado,
      motivoBloqueo: bloqueado
        ? `Tiene ${operaciones} operación(es) de Finanzas y ${visitas} visita(s) a su nombre, y no hay otro administrador activo en la inmobiliaria a quien reasignarlas. Creá o activá otro administrador, o desactivá este usuario en vez de borrarlo.`
        : null,
    },
  });
}

/**
 * DELETE — elimina un usuario preservando el historial del negocio.
 *
 * Las operaciones de Finanzas y las visitas apuntan al agente con una FK obligatoria:
 * borrarlas junto al usuario destruiría el historial contable de la inmobiliaria. En
 * vez de eso se REASIGNAN al ADMIN de esa inmobiliaria. Propiedades y clientes quedan
 * sin asesor asignado (siguen siendo de la inmobiliaria).
 */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  const { id } = await params;

  const usuario = await db.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, rol: true, inmobiliariaId: true },
  });
  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (usuario.rol === "SUPERADMIN") {
    return NextResponse.json(
      { error: "No se puede eliminar un SuperAdmin desde el panel" },
      { status: 400 }
    );
  }
  if (usuario.id === session.userId) {
    return NextResponse.json(
      { error: "No podés eliminar tu propia cuenta" },
      { status: 400 }
    );
  }

  // ¿A quién le quedan las visitas y operaciones? Al ADMIN de su inmobiliaria.
  let receptorId: string | null = null;
  if (usuario.inmobiliariaId) {
    const admin = await db.usuario.findFirst({
      where: {
        inmobiliariaId: usuario.inmobiliariaId,
        rol: "ADMIN",
        activo: true,
        id: { not: id },
      },
      select: { id: true },
    });
    receptorId = admin?.id ?? null;
  }

  const [visitas, operaciones] = await Promise.all([
    db.visita.count({ where: { agenteId: id } }),
    db.operacionCerrada.count({ where: { agenteId: id } }),
  ]);

  // Sin nadie a quien reasignar, borrar destruiría historial contable: se bloquea.
  if ((visitas > 0 || operaciones > 0) && !receptorId) {
    return NextResponse.json(
      {
        error:
          `Este usuario tiene ${operaciones} operación(es) de Finanzas y ${visitas} visita(s) a su nombre, ` +
          `y no hay otro administrador activo en la inmobiliaria para reasignarlas. ` +
          `Creá o activá un administrador antes de eliminarlo, o desactivá este usuario en vez de borrarlo.`,
      },
      { status: 409 }
    );
  }

  try {
    await db.$transaction([
      // Propiedades y clientes quedan a nombre de la inmobiliaria, sin asesor.
      db.propiedad.updateMany({ where: { agenteId: id }, data: { agenteId: null } }),
      db.cliente.updateMany({ where: { agenteId: id }, data: { agenteId: null } }),
      // Historial que NO se puede perder: se reasigna.
      ...(receptorId
        ? [
            db.visita.updateMany({ where: { agenteId: id }, data: { agenteId: receptorId } }),
            db.operacionCerrada.updateMany({ where: { agenteId: id }, data: { agenteId: receptorId } }),
          ]
        : []),
      // Notificaciones y tokens de reseteo caen por cascade.
      db.usuario.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      ok: true,
      nombre: usuario.nombre,
      reasignado: receptorId ? { visitas, operaciones } : null,
    });
  } catch (e) {
    console.error("[DELETE /api/admin/usuarios]", e);
    return NextResponse.json({ error: "Error al eliminar el usuario" }, { status: 500 });
  }
}
