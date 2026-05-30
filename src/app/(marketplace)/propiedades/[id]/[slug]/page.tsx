import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  MapPin, Bed, Bath, Square, MessageCircle,
  Phone, CheckCircle, ChevronRight,
} from "lucide-react";
import {
  formatPrice,
  TIPO_PROPIEDAD_LABELS,
  TIPO_OPERACION_LABELS,
  buildWhatsAppLink,
} from "@/lib/utils";
import { ConsultaForm } from "@/components/marketplace/ConsultaForm";
import { PropiedadMap } from "@/components/maps/PropiedadMap";
import { PropiedadGallery } from "@/components/marketplace/PropiedadGallery";
import { MarketplacePropiedadCard } from "@/components/marketplace/MarketplacePropiedadCard";
import { Pill } from "@/components/ui/pill";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

interface Params { id: string; slug: string; }

/* ── Metadata ──────────────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
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
    openGraph: prop.fotos[0] ? { images: [prop.fotos[0].urlCloudinary] } : undefined,
  };
}

/* ── ARS Blue rate (server, cache 1h) ──────────────────────────── */
async function fetchTasaBlue(): Promise<number | null> {
  try {
    const r = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { venta?: number };
    return data.venta ?? null;
  } catch {
    return null;
  }
}

function fmtARS(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  return Math.round(n).toLocaleString("es-AR");
}

/* ── Page ──────────────────────────────────────────────────────── */
export default async function PropiedadDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  const propiedad = await db.propiedad.findUnique({
    where: { id, publicada: true },
    include: {
      atributos: true,
      fotos: { orderBy: { orden: "asc" } },
      inmobiliaria: {
        select: { id: true, nombre: true, logoUrl: true, whatsapp: true, email: true },
      },
      agente: { select: { nombre: true } },
    },
  });

  if (!propiedad) notFound();

  const a = propiedad.atributos;

  /* ── Características unificadas con checkmarks ── */
  const todasCaracteristicas: string[] = [
    a?.balcon           && "Balcón",
    a?.garage           && "Garage",
    a?.pileta           && "Pileta",
    a?.quincho          && "Quincho",
    a?.amueblado        && "Amueblado",
    a?.serviciosAgua    && "Agua corriente",
    a?.serviciosLuz     && "Luz eléctrica",
    a?.serviciosGas     && "Gas natural",
    a?.serviciosCloaca  && "Cloaca",
    ...(a?.caracteristicasCustom ?? []),
  ].filter(Boolean) as string[];

  /* ── WhatsApp ── */
  const waMsg  = `Hola, vi "${propiedad.titulo}" en InmoLibres y me interesa más información.`;
  const waLink = propiedad.inmobiliaria
    ? buildWhatsAppLink(propiedad.inmobiliaria.whatsapp, waMsg)
    : null;

  /* ── Iniciales inmobiliaria ── */
  const initials = propiedad.inmobiliaria
    ? propiedad.inmobiliaria.nombre.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase()
    : "P";

  /* ── Fotos ── */
  const fotos = propiedad.fotos.map((f) => ({
    id: f.id,
    urlCloudinary: f.urlCloudinary,
    esPortada: f.esPortada,
  }));

  /* ── Precio ARS equivalente ── */
  const tasaBlue = propiedad.moneda === "USD" ? await fetchTasaBlue() : null;
  const arsEquivalente = tasaBlue ? Math.round(Number(propiedad.precio) * tasaBlue) : null;

  /* ── Propiedades similares ── */
  const similaresRaw = await db.propiedad.findMany({
    where: {
      publicada: true,
      operacion: propiedad.operacion,
      NOT: { id: propiedad.id },
    },
    include: {
      fotos: { where: { esPortada: true }, take: 1 },
      atributos: true,
      inmobiliaria: { select: { id: true, nombre: true, logoUrl: true, whatsapp: true } },
    },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  // Serializar para Client Components (Decimal → number)
  const similares = similaresRaw.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    slug: p.slug,
    tipo: p.tipo,
    operacion: p.operacion,
    precio: Number(p.precio),
    moneda: p.moneda,
    direccion: p.direccion,
    fotos: p.fotos.map((f) => ({ urlCloudinary: f.urlCloudinary, esPortada: f.esPortada })),
    atributos: p.atributos
      ? {
          habitaciones: p.atributos.habitaciones,
          banos: p.atributos.banos,
          superficieCubierta: p.atributos.superficieCubierta != null ? Number(p.atributos.superficieCubierta) : null,
          superficieTotal: p.atributos.superficieTotal != null ? Number(p.atributos.superficieTotal) : null,
          anchoMetros: p.atributos.anchoMetros != null ? Number(p.atributos.anchoMetros) : null,
          largoMetros: p.atributos.largoMetros != null ? Number(p.atributos.largoMetros) : null,
          garage: p.atributos.garage,
          caracteristicasCustom: p.atributos.caracteristicasCustom,
        }
      : null,
    inmobiliaria: p.inmobiliaria
      ? { id: p.inmobiliaria.id, nombre: p.inmobiliaria.nombre, logoUrl: p.inmobiliaria.logoUrl, whatsapp: p.inmobiliaria.whatsapp }
      : null,
  }));

  return (
    <div
      className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-16"
      style={{ color: "var(--antracita-700)" }}
    >
      {/* ── Breadcrumb ── */}
      <nav
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontSize: 12.5,
          color: "var(--antracita-300)",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ color: "var(--antracita-300)", textDecoration: "none" }}>
          Marketplace
        </Link>
        <ChevronRight style={{ width: 13, height: 13 }} />
        <span>{TIPO_OPERACION_LABELS[propiedad.operacion]}</span>
        <ChevronRight style={{ width: 13, height: 13 }} />
        <span>{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</span>
        <ChevronRight style={{ width: 13, height: 13 }} />
        <span
          style={{ color: "var(--antracita-700)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "40vw" }}
        >
          {propiedad.titulo}
        </span>
      </nav>

      {/* ── Mobile sticky CTA ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 border-t"
        style={{ background: "white", borderColor: "var(--border)" }}
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

      {/* ── 2-column grid ── */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-x-10">

        {/* ═══════════ COLUMNA IZQUIERDA ═══════════ */}
        <div className="min-w-0 space-y-8">

          {/* Galería */}
          {fotos.length > 0 && <PropiedadGallery fotos={fotos} />}

          {/* Título + precio */}
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <Pill tone={propiedad.operacion === "VENTA" ? "terra" : propiedad.operacion === "ALQUILER" ? "dark" : "accent"}>
                {TIPO_OPERACION_LABELS[propiedad.operacion]}
              </Pill>
              <Pill tone="outline">{TIPO_PROPIEDAD_LABELS[propiedad.tipo]}</Pill>
              <Pill tone="success">
                {propiedad.estado === "DISPONIBLE" ? "Disponible" : propiedad.estado === "RESERVADA" ? "Reservada" : "Alquilada"}
              </Pill>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
              <h1
                className="display"
                style={{ fontSize: 34, margin: 0, color: "var(--antracita-900)", lineHeight: 1.1, letterSpacing: "-0.02em", flex: "1 1 280px" }}
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
                {arsEquivalente && (
                  <div style={{ fontSize: 13, color: "var(--antracita-500)", marginTop: 4 }}>
                    ≈ ARS {fmtARS(arsEquivalente)} · Blue
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--antracita-500)", fontSize: 14 }}>
              <MapPin size={15} style={{ color: "var(--terracota-500)", flexShrink: 0 }} />
              {propiedad.direccion}
            </div>
          </div>

          {/* Key facts */}
          {(a?.habitaciones != null || a?.banos != null || a?.superficieCubierta != null || a?.superficieTotal != null) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

          {/* Características con checkmarks (unifica boolean attrs + servicios + custom) */}
          {todasCaracteristicas.length > 0 && (
            <div>
              <h2
                className="display"
                style={{ fontSize: 22, margin: "0 0 16px", color: "var(--antracita-900)" }}
              >
                Características
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px 16px",
                }}
                className="sm:grid-cols-3 grid-cols-2"
              >
                {todasCaracteristicas.map((c) => (
                  <div
                    key={c}
                    style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: "var(--antracita-700)" }}
                  >
                    <CheckCircle
                      size={15}
                      style={{ color: "var(--success-500, #4A7C59)", flexShrink: 0 }}
                    />
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {propiedad.descripcion && (
            <div>
              <h2 className="display" style={{ fontSize: 22, margin: "0 0 12px", color: "var(--antracita-900)" }}>
                Descripción
              </h2>
              <p
                className="leading-relaxed whitespace-pre-wrap text-sm"
                style={{ color: "var(--antracita-700)", fontFamily: "var(--font-jakarta)", fontSize: 15, lineHeight: 1.65 }}
              >
                {propiedad.descripcion}
              </p>
            </div>
          )}

          {/* Mapa */}
          {propiedad.latitud && propiedad.longitud && (
            <div>
              <h2 className="display" style={{ fontSize: 22, margin: "0 0 12px", color: "var(--antracita-900)" }}>
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
              <div style={{ fontSize: 13, color: "var(--antracita-500)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={13} style={{ color: "var(--terracota-500)" }} />
                {propiedad.direccion}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ SIDEBAR ═══════════ */}
        <div className="min-w-0 lg:pl-6">
          <div
            className="il-card sticky"
            style={{ top: 88, padding: 24, display: "flex", flexDirection: "column", gap: 0 }}
          >
            {/* Inmobiliaria / agente */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--terracota-100, #FCEAE4)",
                  flexShrink: 0,
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
                  <span
                    style={{
                      fontFamily: "var(--font-fraunces-display), Georgia, serif",
                      fontSize: 20, fontWeight: 600,
                      color: "var(--terracota-600)",
                    }}
                  >
                    {initials}
                  </span>
                )}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--antracita-900)", margin: 0 }}>
                  {propiedad.inmobiliaria?.nombre ?? "Propietario particular"}
                </p>
                <p style={{ fontSize: 12, color: "var(--antracita-500)", margin: "3px 0 0" }}>
                  {!propiedad.inmobiliaria
                    ? "Publicado directamente"
                    : propiedad.agente
                    ? `Asesor: ${propiedad.agente.nombre}`
                    : "Publicado por la inmobiliaria"}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 0" }}>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="il-btn il-btn--whats"
                  style={{ width: "100%", height: 50, fontSize: 15, justifyContent: "center", textDecoration: "none" }}
                >
                  <MessageCircle size={18} />
                  Consultar por WhatsApp
                </a>
              )}
              {propiedad.inmobiliaria?.email && (
                <a
                  href={`mailto:${propiedad.inmobiliaria.email}?subject=${encodeURIComponent(`Consulta: ${propiedad.titulo}`)}`}
                  className="il-btn il-btn--ghost"
                  style={{ width: "100%", height: 44, fontSize: 14, justifyContent: "center", textDecoration: "none", color: "var(--antracita-700)" }}
                >
                  <Phone size={15} />
                  Consultar por email
                </a>
              )}
            </div>

            {/* Formulario de consulta */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
              <p
                style={{
                  fontFamily: "var(--font-jetbrains-mono, monospace)",
                  fontSize: 10.5,
                  color: "var(--antracita-300)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 14px",
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

          {/* Kai card — fuera del il-card */}
          <div
            style={{
              marginTop: 14,
              background: "var(--crema-100, #F0E9DC)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              gap: 12,
              alignItems: "center",
              cursor: "default",
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 999,
                background: "var(--terracota-500, #C1694F)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white",
                fontFamily: "var(--font-fraunces-display), Georgia, serif",
                fontWeight: 600,
                fontStyle: "italic",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              K
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: "var(--antracita-900)", fontWeight: 600 }}>
                ¿Querés comparar con otras?
              </div>
              <div style={{ fontSize: 11.5, color: "var(--antracita-500)" }}>
                Kai te muestra similares en la zona
              </div>
            </div>
            <ChevronRight size={14} style={{ color: "var(--antracita-500)", flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* ── Propiedades similares ── */}
      {similares.length > 0 && (
        <section style={{ marginTop: 64 }}>
          <h2
            className="display"
            style={{ fontSize: 28, margin: "0 0 24px", color: "var(--antracita-900)" }}
          >
            Propiedades similares
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {similares.map((p, i) => (
              <MarketplacePropiedadCard
                key={p.id}
                id={p.id}
                titulo={p.titulo}
                slug={p.slug}
                tipo={p.tipo}
                operacion={p.operacion}
                precio={p.precio}
                moneda={p.moneda}
                direccion={p.direccion}
                fotos={p.fotos}
                atributos={p.atributos}
                inmobiliaria={p.inmobiliaria}
                index={i}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
