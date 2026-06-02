import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ContactosClient } from "@/components/contactos/ContactosClient";
import type { RolContacto } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contactos" };

export default async function ContactosPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");
  const inmobiliariaId = session.user.inmobiliariaId;

  const contactos = await db.contacto.findMany({
    where: { inmobiliariaId },
    include: {
      garante: { select: { id: true } },
      _count: { select: { documentos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = contactos.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    roles: c.roles as RolContacto[],
    telefono: c.telefono,
    email: c.email,
    dni: c.dni,
    garante: c.garante,
    _count: c._count,
    createdAt: c.createdAt.toISOString(),
  }));

  return <ContactosClient contactos={serialized} />;
}
