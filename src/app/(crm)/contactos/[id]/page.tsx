import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ContactoDetalle } from "@/components/contactos/ContactoDetalle";
import type { RolContacto, TipoDocumento } from "@prisma/client";

export const metadata = { title: "Detalle de contacto" };

type Params = { params: Promise<{ id: string }> };

export default async function ContactoDetallePage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");
  const inmobiliariaId = session.user.inmobiliariaId;
  const { id } = await params;

  const contacto = await db.contacto.findFirst({
    where: { id, inmobiliariaId },
    include: {
      garante: {
        include: {
          documentos: { orderBy: { createdAt: "asc" } },
        },
      },
      documentos: { orderBy: { createdAt: "asc" } },
      contratos: {
        include: {
          contrato: {
            include: {
              propiedad: { select: { titulo: true, direccion: true } },
            },
          },
        },
      },
    },
  });

  if (!contacto) notFound();

  // Boletos de compraventa donde el contacto es vendedor o comprador. El boleto guarda
  // las partes como texto (nombre + DNI), sin FK al contacto: se vinculan por DNI
  // comparando solo dígitos ("28.774.115" = "28774115"), dentro de la misma inmobiliaria.
  // Un contacto sin DNI cargado no puede vincularse.
  const soloDigitos = (s: string | null) => (s ?? "").replace(/\D/g, "");
  const dniContacto = soloDigitos(contacto.dni);
  const boletosInmobiliaria = dniContacto
    ? await db.contratoVenta.findMany({
        where: { inmobiliariaId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, vendedorDni: true, compradorDni: true, propiedadDireccion: true, propiedadDescripcion: true,
          propiedad: { select: { titulo: true } },
        },
      })
    : [];
  const boletos = boletosInmobiliaria.flatMap((b) =>
    (["vendedor", "comprador"] as const)
      .filter((rol) => soloDigitos(rol === "vendedor" ? b.vendedorDni : b.compradorDni) === dniContacto)
      .map((rol) => ({
        id: b.id,
        rol,
        titulo: b.propiedad?.titulo ?? b.propiedadDescripcion ?? "Boleto de compraventa",
        direccion: b.propiedadDireccion,
      }))
  );

  const serialized = {
    id: contacto.id,
    nombre: contacto.nombre,
    roles: contacto.roles as RolContacto[],
    dni: contacto.dni,
    fechaNacimiento: contacto.fechaNacimiento?.toISOString() ?? null,
    domicilio: contacto.domicilio,
    telefono: contacto.telefono,
    email: contacto.email,
    estadoCivil: contacto.estadoCivil,
    ocupacion: contacto.ocupacion,
    notas: contacto.notas,
    createdAt: contacto.createdAt.toISOString(),
    documentos: contacto.documentos.map((d) => ({
      id: d.id,
      tipo: d.tipo as TipoDocumento,
      label: d.label,
      url: d.url,
      esImagen: d.esImagen,
      createdAt: d.createdAt.toISOString(),
    })),
    garante: contacto.garante ? {
      id: contacto.garante.id,
      nombre: contacto.garante.nombre,
      dni: contacto.garante.dni,
      fechaNacimiento: contacto.garante.fechaNacimiento?.toISOString() ?? null,
      domicilio: contacto.garante.domicilio,
      telefono: contacto.garante.telefono,
      relacionConContacto: contacto.garante.relacionConContacto,
      documentos: contacto.garante.documentos.map((d) => ({
        id: d.id,
        tipo: d.tipo as TipoDocumento,
        label: d.label,
        url: d.url,
        esImagen: d.esImagen,
        createdAt: d.createdAt.toISOString(),
      })),
    } : null,
    contratos: contacto.contratos.map((cp) => ({
      id: cp.id,
      rol: cp.rol,
      contrato: {
        id: cp.contrato.id,
        fechaInicio: cp.contrato.fechaInicio.toISOString().slice(0, 10),
        fechaFin: cp.contrato.fechaFin.toISOString().slice(0, 10),
        estadoPago: cp.contrato.estadoPago,
        propiedad: cp.contrato.propiedad,
      },
    })),
    boletos,
  };

  return <ContactoDetalle contacto={serialized} />;
}
