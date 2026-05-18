import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { MapPin, Bed, Bath, Square, MessageCircle, Phone } from "lucide-react";
import {
  formatPrice,
  TIPO_PROPIEDAD_LABELS,
  TIPO_OPERACION_LABELS,
  buildWhatsAppLink,
} from "@/lib/utils";
import { ConsultaForm } from "@/components/marketplace/ConsultaForm";
import { PropiedadMap } from "@/components/maps/PropiedadMap";
import { PropiedadGallery } from "@/components/marketplace/PropiedadGallery";
import Image from "next/image";
import type { Metadata } from "next";

interface Params {
  id: string;
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id, slug } = await params;
  const prop = await db.propiedad.findUnique({
    where: { inmobiliariaId_slug: { inmobiliariaId: id, slug } },
    select: {
      titulo: true,
      descripcion: true,
      fotos: { where: { esPortada: true }, take: 1 },
    },
  });
  if (!prop) return { title: "Propiedad no encontrada" };
  return {
    title: prop.titulo,
    description: prop.descripcion ?? undefined,
    openGraph: prop.fotos[0]
      ? { images: [prop.fotos[0].urlCloudinary] }
      : undefined,
  };
}

export default async function PropiedadDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id: inmobiliariaId, slug } = await params;

  const propiedad = await db.propiedad.findUnique({
    where: {
      inmobiliariaId_slug: { inmobiliariaId, slug },
      publicada: true,
    },
    include: {
      atributos: true,
      fotos: { orderBy: { orden: "asc" } },
      inmobiliaria: {
        select: {
          id: true,
          nombre: true,
          logoUrl: true,
          whatsapp: true,
          email: true,
        },
      },
      agente: { select: { nombre: true } },
    },
  });

  if (!propiedad) notFound();

  const a = propiedad.atributos;
  const atributos = [
    a?.habitaciones != null && { icon: Bed, label: `${a.habitaciones} dormitorio${a.habitaciones !== 1 ? "s" : ""}` },
    a?.banos != null && { icon: Bath, label: `${a.banos} baño${a.banos !== 1 ? "s" : ""}` },
    a?.superficieCubierta != null && { icon: Square, label: `${a.superficieCubierta} m² cubiertos` },
    a?.superficieTotal != null && { icon: Square, label: `${a.superficieTotal} m² totales` },
    (a?.anchoMetros != null && a?.largoMetros != null) && { icon: Square, label: `${a.anchoMetros} × ${a.largoMetros} m` },
    a?.alturaInterna != null && { icon: Square, label: `${a.alturaInterna} m altura interna` },
    a?.garage && { icon: Square, label: "Garage" },
    a?.pileta && { icon: Square, label: "Pileta" },
    a?.quincho && { icon: Square, label: "Quincho" },
    a?.balcon && { icon: Square, label: "Balcón" },
    a?.amueblado && { icon: Square, label: "Amueblado" },
  ].filter(Boolean) as Array<{ icon: React.ElementType; label: string }>;

  const servicios = [
    a?.serviciosAgua && "Agua corriente",
    a?.serviciosLuz && "Luz eléctrica",
    a?.serviciosGas && "Gas natural",
    a?.serviciosCloaca && "Cloaca",
  ].filter(Boolean) as string[];

  const waMsg = `Hola, vi "${propiedad.titulo}" en InmoLibres y me interesa más información.`;
  const waLink = buildWhatsAppLink(propiedad.inmobiliaria.whatsapp, waMsg);

  const initials = propiedad.inmobiliaria.nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const fotos = propiedad.fotos.map((f) => ({
    id: f.id,
    urlCloudinary: f.urlCloudinary,
    esPortada: f.esPortada,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-24 lg:pb-10">
      {/* Mobile sticky CTA */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 border-t"
        style={{ background: "white", borderColor: "var(--cream-border)" }}
      >
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-terra w-full justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold"
          style={{ fontFamily: "var(--font-jakarta)", textDecoration: "none" }}
        >
          <MessageCircle className="w-5 h-5" />
          Consultar por WhatsApp
        </a>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery */}
          {fotos.length > 0 && <PropiedadGallery fotos={fotos} />}

          {/* Price + title */}
          <div>
            {/* Operation + type badges */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "var(--terra-mid)",
                  color: "white",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {TIPO_OPERACION_LABELS[propiedad.operacion]}
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "var(--terra-pale)",
                  color: "var(--terra-dark)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {TIPO_PROPIEDAD_LABELS[propiedad.tipo]}
              </span>
            </div>

            <p
              className="text-3xl sm:text-4xl font-semibold leading-none"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--antracite)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatPrice(Number(propiedad.precio), propiedad.moneda)}
            </p>

            <h1
              className="mt-3 text-2xl sm:text-3xl font-bold leading-snug"
              style={{
                fontFamily: "var(--font-fraunces)",
                color: "var(--antracite)",
                letterSpacing: "-0.02em",
              }}
            >
              {propiedad.titulo}
            </h1>

            <div
              className="flex items-center gap-2 mt-3"
              style={{ color: "var(--antracite-light)" }}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span
                className="text-sm"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                {propiedad.direccion}
              </span>
            </div>
          </div>

          {/* Attribute chips */}
          {atributos.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {atributos.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                  style={{
                    background: "var(--terra-pale)",
                    color: "var(--terra-dark)",
                    fontFamily: "var(--font-jakarta)",
                    fontWeight: 500,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Servicios */}
          {servicios.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: "var(--antracite)" }}>
                Servicios
              </h2>
              <div className="flex flex-wrap gap-2">
                {servicios.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: "#E8F5E9", color: "#1B4332", fontFamily: "var(--font-jakarta)" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Características custom */}
          {a?.caracteristicasCustom && a.caracteristicasCustom.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: "var(--antracite)" }}>
                Características
              </h2>
              <div className="flex flex-wrap gap-2">
                {a.caracteristicasCustom.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: "var(--cream-dark)", color: "var(--antracite-mid)", fontFamily: "var(--font-jakarta)", border: "1px solid var(--cream-border)" }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {propiedad.descripcion && (
            <div>
              <h2
                className="text-lg font-semibold mb-3"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  color: "var(--antracite)",
                }}
              >
                Descripción
              </h2>
              <p
                className="leading-relaxed whitespace-pre-wrap text-sm"
                style={{
                  color: "var(--antracite-mid)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {propiedad.descripcion}
              </p>
            </div>
          )}

          {/* Map */}
          {propiedad.latitud && propiedad.longitud && (
            <div>
              <h2
                className="text-lg font-semibold mb-3"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  color: "var(--antracite)",
                }}
              >
                Ubicación
              </h2>
              <div className="rounded-2xl overflow-hidden">
                <PropiedadMap
                  lat={propiedad.latitud}
                  lon={propiedad.longitud}
                  titulo={propiedad.titulo}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky sidebar */}
        <div>
          <div
            className="sticky rounded-2xl p-6 space-y-5"
            style={{
              top: 80,
              background: "white",
              boxShadow: "var(--shadow-mp-card)",
            }}
          >
            {/* Inmobiliaria branding */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 text-sm font-bold"
                style={{
                  background: "var(--terra-pale)",
                  color: "var(--terra-dark)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {propiedad.inmobiliaria.logoUrl ? (
                  <Image
                    src={propiedad.inmobiliaria.logoUrl}
                    alt={propiedad.inmobiliaria.nombre}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div>
                <p
                  className="font-semibold text-sm"
                  style={{
                    fontFamily: "var(--font-fraunces)",
                    color: "var(--antracite)",
                  }}
                >
                  {propiedad.inmobiliaria.nombre}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: "var(--antracite-light)",
                    fontFamily: "var(--font-jakarta)",
                  }}
                >
                  Asesor: {propiedad.agente.nombre}
                </p>
              </div>
            </div>

            {/* WhatsApp button */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
              style={{
                background: "#25D366",
                color: "white",
                fontFamily: "var(--font-jakarta)",
                textDecoration: "none",
              }}
            >
              <MessageCircle className="w-5 h-5" />
              Consultar por WhatsApp
            </a>

            {propiedad.inmobiliaria.email && (
              <a
                href={`mailto:${propiedad.inmobiliaria.email}?subject=${encodeURIComponent(`Consulta sobre: ${propiedad.titulo}`)}`}
                className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-medium text-sm border transition-colors"
                style={{
                  color: "var(--antracite-mid)",
                  borderColor: "var(--cream-border)",
                  fontFamily: "var(--font-jakarta)",
                  textDecoration: "none",
                }}
              >
                <Phone className="w-4 h-4" />
                Consultar por email
              </a>
            )}

            {/* Divider */}
            <div
              className="border-t pt-5"
              style={{ borderColor: "var(--cream-border)" }}
            >
              <p
                className="text-sm font-medium mb-4"
                style={{
                  color: "var(--antracite)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                Enviá una consulta
              </p>
              <ConsultaForm
                propiedadId={propiedad.id}
                propiedadTitulo={propiedad.titulo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
