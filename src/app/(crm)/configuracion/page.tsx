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

  const [inmobiliaria, configRaw] = await Promise.all([
    db.inmobiliaria.findUnique({
      where: { id: inmobiliariaId },
      include: {
        usuarios: {
          select: {
            id: true, nombre: true, email: true, rol: true, activo: true,
            comisionPersonalPct: true,
            permisos: true,
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { propiedades: true, clientes: true } },
      },
    }),
    db.configuracionInmobiliaria.findUnique({ where: { inmobiliariaId } }),
  ]);

  if (!inmobiliaria) redirect("/login");

  const diasRestantes = inmobiliaria.fechaVencimiento
    ? getDaysUntil(inmobiliaria.fechaVencimiento)
    : null;

  const serialized = {
    ...inmobiliaria,
    firmaUrl: inmobiliaria.firmaUrl ?? null,
    fechaVencimiento: inmobiliaria.fechaVencimiento?.toISOString() ?? null,
    createdAt: inmobiliaria.createdAt.toISOString(),
    updatedAt: inmobiliaria.updatedAt.toISOString(),
  };

  const config = configRaw ?? {
    id: "",
    inmobiliariaId,
    comisionVendedorPct: 3,
    comisionCompradorPct: 3,
    comisionAlquilerMeses: 1,
    comisionAdministracionPct: 0,
    comisionAgentePct: 30,
    comisionInmobPct: 70,
    ivaIncluido: true,
    monedaPreferida: "USD" as const,
    colorPrimario: "#1B4332",
    colorSecundario: "#2C2C2C",
    logoEnContrato: false,
    clausulasAdicionales: null,
    piePaginaContrato: null,
    cuit: null,
    razonSocial: null,
    domicilioLegal: null,
    matriculaCorredora: null,
    ciudad: "Paso de los Libres",
    provincia: "Corrientes",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { createdAt: _c, updatedAt: _u, ...configRest } = config;

  return (
    <ConfiguracionClient
      inmobiliaria={serialized}
      isAdmin={isAdmin}
      diasRestantes={diasRestantes}
      config={configRest}
    />
  );
}
