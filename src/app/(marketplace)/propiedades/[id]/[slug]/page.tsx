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
import { Pill } from "@/components/ui/pill";
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
  const { id } = await params;
  const prop = await db.propiedad.findUnique({
    where: { id },
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
  const { id } = await params;

  const propiedad = await db.propiedad.findUnique({
    where: {
      id,
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
  const waLink = propiedad.inmobiliaria
    ? buildWhatsAppLink(propiedad.inmobiliaria.whatsapp, waMsg)
    : null;

  const initials = propiedad.inmobiliaria
    ? propiedad.inmobiliaria.nombre
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0] ?? "")
        .join("")
        .toUpperCase()
    : "P";

  const fotos = propiedad.fotos.map((f) => ({
    id: f.id,
    urlCloudinary: f.urlCloudinary,
    esPortada: f.esPortada,
  }));

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 pb-24 lg:pb-10">
      {/* Mobile sticky CTA */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 border-t"
        style={{ background: "white", borderColor: "var(--cream-border)" }}
      >
        <a
          href={waLink ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-terra w-full justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold"
          style={{ fontFamily: "var(--font-jakarta)", textDecoration: "none" }}
        >
          <MessageCircle className="w-5 h-5" />
          Consultar por WhatsApp
        </a>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-x-10">
        {/* Main column */}
        <div className="min-w-0 space-y-8">
          {/* Gallery */}
          {fotos.length > 0 && <PropiedadGallery fotos={fotos} />}

          {/* Price + title */}
          <div>
            {/* Operation + type badges */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <Pill tone={propiedad.operacion === "VENTA" ? "terra" : propiedad.operacion === "ALQUILER" ? "dark" : "accent"}>
                {TIPO_OPERACION_LABELS[propiedad.operacion]}
              </Pill>
              <Pill tone="outline">{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</Pill>
              <Pill tone="success">{propiedad.estado === "DISPONIBLE" ? "Disponible" : propiedad.estado === "RESERVADA" ? "Reservada" : "Alquilada"}</Pill>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
              <h1
                className="display"
                style={{ fontSize: 34, margin: 0, color: "var(--antracita-900)", lineHeight: 1.1, letterSpacing: "-0.02em", flex: "1 1 300px" }}
              >
                {propiedad.titulo}
              </h1>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  className="mono"
                  style={{ fontSize: 36, fontWeight: 600, color: "var(--antracita-900)", letterSpacing: "-0.02em", lineHeight: 1 }}
                >
                  {formatPrice(Number(propiedad.precio), propiedad.moneda)}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--antracita-500)", fontSize: 14 }}>
              <MapPin size={15} style={{ color: "var(--terracota-500)", flexShrink: 0 }} />
              {propiedad.direccion}
            </div>
          </div>

          {/* Key facts 4-grid */}
          {(a?.habitaciones != null || a?.banos != null || a?.superficieCubierta != null || a?.superficieTotal != null) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {a?.superficieTotal != null && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 18px", background: "var(--crema-100, #F0E9DC)", borderRadius: 14, border: "1px solid var(--border)" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Square size={16} style={{ color: "var(--terracota-600)" }} />
                  </span>
                  <div>
                    <div className="mono" style={{ fontSize: 19, fontWeight: 600, color: "var(--antracita-900)", lineHeight: 1 }}>{a.superficieTotal}</div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 3 }}>m² totales</div>
                  </div>
                </div>
              )}
              {a?.superficieCubierta != null && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 18px", background: "var(--crema-100, #F0E9DC)", borderRadius: 14, border: "1px solid var(--border)" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Square size={16} style={{ color: "var(--terracota-600)" }} />
                  </span>
                  <div>
                    <div className="mono" style={{ fontSize: 19, fontWeight: 600, color: "var(--antracita-900)", lineHeight: 1 }}>{a.superficieCubierta}</div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 3 }}>m² cubiertos</div>
                  </div>
                </div>
              )}
              {a?.habitaciones != null && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 18px", background: "var(--crema-100, #F0E9DC)", borderRadius: 14, border: "1px solid var(--border)" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Bed size={16} style={{ color: "var(--terracota-600)" }} />
                  </span>
                  <div>
                    <div className="mono" style={{ fontSize: 19, fontWeight: 600, color: "var(--antracita-900)", lineHeight: 1 }}>{a.habitaciones}</div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 3 }}>dormitorios</div>
                  </div>
                </div>
              )}
              {a?.banos != null && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 18px", background: "var(--crema-100, #F0E9DC)", borderRadius: 14, border: "1px solid var(--border)" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Bath size={16} style={{ color: "var(--terracota-600)" }} />
                  </span>
                  <div>
                    <div className="mono" style={{ fontSize: 19, fontWeight: 600, color: "var(--antracita-900)", lineHeight: 1 }}>{a.banos}</div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 3 }}>baños</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attribute chips (extras) */}
          {atributos.filter(({ label }) => !label.includes("m²") && !label.includes("dormitorio") && !label.includes("baño")).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {atributos.filter(({ label }) => !label.includes("m²") && !label.includes("dormitorio") && !label.includes("baño")).map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 10,
                    fontSize: 12.5,
                    background: "var(--crema-100, #F0E9DC)",
                    color: "var(--antracita-700)",
                    fontWeight: 500,
                    border: "1px solid var(--border)",
                  }}
                >
                  <Icon size={14} />
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Servicios */}
          {servicios.length > 0 && (
            <div>
              <h2 className="display" style={{ fontSize: 20, marginBottom: 10, marginTop: 0, color: "var(--antracita-900)" }}>
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
              <h2 className="display" style={{ fontSize: 20, marginBottom: 10, marginTop: 0, color: "var(--antracita-900)" }}>
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
              <h2 className="display" style={{ fontSize: 22, marginBottom: 12, marginTop: 0, color: "var(--antracita-900)" }}>
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
              <h2 className="display" style={{ fontSize: 22, marginBottom: 12, marginTop: 0, color: "var(--antracita-900)" }}>
                Ubicación
              </h2>
              <div className="rounded-2xl overflow-hidden">
                <PropiedadMap
                  lat={propiedad.latitud}
                  lon={propiedad.longitud}
                  titulo={propiedad.titulo}
                  polygon={propiedad.poligonoJson as [number, number][] | null}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky sidebar */}
        <div className="min-w-0 lg:pl-6">
          <div
            className="il-card sticky"
            style={{
              top: 88,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Inmobiliaria / particular branding */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 text-sm font-bold"
                style={{
                  background: "var(--terra-pale)",
                  color: "var(--terra-dark)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {propiedad.inmobiliaria?.logoUrl ? (
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
                  {propiedad.inmobiliaria?.nombre ?? "Propietario particular"}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: "var(--antracite-light)",
                    fontFamily: "var(--font-jakarta)",
                  }}
                >
                  {propiedad.inmobiliaria ? `Asesor: ${propiedad.agente.nombre}` : "Publicado directamente"}
                </p>
              </div>
            </div>

            {/* WhatsApp button */}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="il-btn il-btn--whats"
                style={{ width: "100%", height: 44, fontSize: 14, justifyContent: "center", textDecoration: "none" }}
              >
                <MessageCircle size={18} />
                Consultar por WhatsApp
              </a>
            )}

            {propiedad.inmobiliaria?.email && (
              <a
                href={`mailto:${propiedad.inmobiliaria.email}?subject=${encodeURIComponent(`Consulta sobre: ${propiedad.titulo}`)}`}
                className="il-btn il-btn--ghost"
                style={{ width: "100%", height: 40, fontSize: 13, justifyContent: "center", textDecoration: "none", color: "var(--antracita-700)" }}
              >
                <Phone size={14} />
                Consultar por email
              </a>
            )}

            {/* Divider + form */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginBottom: 14, marginTop: 0 }}>
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
