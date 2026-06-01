import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AlquileresClient } from "@/components/alquileres/AlquileresClient";
import { AjustesPendientes } from "@/components/alquileres/AjustesPendientes";

export const metadata = { title: "Contratos" };

export default async function AlquileresPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  const inmobiliariaId = session.user.inmobiliariaId;
  const isAdmin = session.user.rol === "ADMIN";

  const [contratos, ventas, propiedades, config, inmobiliaria] = await Promise.all([
    db.contratoAlquiler.findMany({
      where: { inmobiliariaId },
      orderBy: { fechaFin: "asc" },
      include: {
        propiedad: { select: { id: true, titulo: true, direccion: true } },
      },
    }),
    db.contratoVenta.findMany({
      where: { inmobiliariaId },
      orderBy: { createdAt: "desc" },
    }),
    db.propiedad.findMany({
      where: { inmobiliariaId, estado: { in: ["DISPONIBLE", "RESERVADA"] } },
      select: { id: true, titulo: true, direccion: true },
      orderBy: { titulo: "asc" },
    }),
    db.configuracionInmobiliaria.findUnique({ where: { inmobiliariaId } }),
    db.inmobiliaria.findUnique({
      where: { id: inmobiliariaId },
      select: { nombre: true, logoUrl: true, whatsapp: true, email: true },
    }),
  ]);

  const serialized = contratos.map((c) => ({
    id: c.id,
    propiedadId: c.propiedadId,
    inmobiliariaId: c.inmobiliariaId,
    inquilinoNombre: c.inquilinoNombre,
    inquilinoTel: c.inquilinoTel,
    precioMensual: Number(c.precioMensual),
    moneda: c.moneda as "ARS" | "USD",
    diaVencimientoPago: c.diaVencimientoPago,
    estadoPago: c.estadoPago as "AL_DIA" | "ATRASADO",
    fechaInicio: c.fechaInicio.toISOString().slice(0, 10),
    fechaFin: c.fechaFin.toISOString().slice(0, 10),
    notas: c.notas ?? null,
    createdAt: c.createdAt.toISOString(),
    propiedad: c.propiedad,
  }));

  const serializedVentas = ventas.map((v) => ({
    ...v,
    precioVenta: Number(v.precioVenta),
    sena: v.sena !== null ? Number(v.sena) : null,
    fechaEscritura: v.fechaEscritura ? v.fechaEscritura.toISOString().slice(0, 10) : null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }));

  const configData = config
    ? {
        colorPrimario: config.colorPrimario,
        colorSecundario: config.colorSecundario,
        clausulasAdicionales: config.clausulasAdicionales,
        piePaginaContrato: config.piePaginaContrato,
        cuit: config.cuit,
        razonSocial: config.razonSocial,
        domicilioLegal: config.domicilioLegal,
        matriculaCorredora: config.matriculaCorredora,
        comisionVendedorPct: config.comisionVendedorPct,
        comisionCompradorPct: config.comisionCompradorPct,
      }
    : null;

  return (
    <>
    <AjustesPendientes inmobiliariaNombre={inmobiliaria?.nombre ?? "InmoLibres"} />
    <AlquileresClient
      contratos={serialized}
      ventas={serializedVentas}
      propiedades={propiedades}
      isAdmin={isAdmin}
      config={configData}
      inmobiliaria={inmobiliaria}
    />
    </>
  );
}
