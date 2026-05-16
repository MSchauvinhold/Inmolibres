import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getDaysUntil } from "@/lib/utils";
import { ConfiguracionClient } from "@/components/crm/ConfiguracionClient";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  const inmobiliariaId = session.user.inmobiliariaId;
  const isAdmin = session.user.rol === "ADMIN";

  const inmobiliaria = await db.inmobiliaria.findUnique({
    where: { id: inmobiliariaId },
    include: {
      usuarios: {
        select: { id: true, nombre: true, email: true, rol: true, activo: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { propiedades: true, clientes: true } },
    },
  });

  if (!inmobiliaria) redirect("/login");

  const diasRestantes = inmobiliaria.fechaVencimiento
    ? getDaysUntil(inmobiliaria.fechaVencimiento)
    : null;

  const serialized = {
    ...inmobiliaria,
    fechaVencimiento: inmobiliaria.fechaVencimiento?.toISOString() ?? null,
    createdAt: inmobiliaria.createdAt.toISOString(),
    updatedAt: inmobiliaria.updatedAt.toISOString(),
  };

  return (
    <ConfiguracionClient
      inmobiliaria={serialized}
      isAdmin={isAdmin}
      diasRestantes={diasRestantes}
    />
  );
}
