import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { toPlanKey } from "@/lib/planes";
import { requirePermisoAgente } from "@/lib/permisos";
import { ContactosClient } from "@/components/contactos/ContactosClient";
import type { RolContacto } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contactos" };

export default async function ContactosPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");
  // Módulo exclusivo del plan Pro — ver nota en /finanzas.
  if (toPlanKey(session.user.plan) !== "PRO") redirect("/upgrade");
  // Un Agente sin el permiso "verClientes" no debe poder entrar aunque escriba
  // la URL a mano — antes solo se ocultaba el link del Sidebar, sin chequeo acá.
  await requirePermisoAgente(session.user.id, session.user.rol, "verClientes", "Contactos");
  const inmobiliariaId = session.user.inmobiliariaId;

  const contactos = await db.contacto.findMany({
    where: { inmobiliariaId },
    include: {
      garante: { select: { id: true } },
      _count: { select: { documentos: true } },
      // Para la vista Kanban: la columna se calcula con el contrato que termina más tarde
      contratos: {
        where: { contrato: { inmobiliariaId } },
        select: { contrato: { select: { fechaFin: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = contactos.map((c) => {
    const finContrato = c.contratos.reduce<Date | null>(
      (max, { contrato }) => (!max || contrato.fechaFin > max ? contrato.fechaFin : max),
      null,
    );
    return {
      id: c.id,
      nombre: c.nombre,
      roles: c.roles as RolContacto[],
      telefono: c.telefono,
      email: c.email,
      dni: c.dni,
      garante: c.garante,
      _count: c._count,
      createdAt: c.createdAt.toISOString(),
      finContrato: finContrato ? finContrato.toISOString().slice(0, 10) : null,
    };
  });

  return <ContactosClient contactos={serialized} />;
}
