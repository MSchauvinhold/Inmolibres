import Image from "next/image";
import { db } from "@/lib/db";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { HeroSection } from "@/components/marketplace/HeroSection";
import { FeaturesSection } from "@/components/marketplace/FeaturesSection";
import { MarketplacePropiedadCard } from "@/components/marketplace/MarketplacePropiedadCard";
import { MascotaKai } from "@/components/marketplace/MascotaKai";
import { TIPO_PROPIEDAD_LABELS } from "@/lib/utils";
import type { TipoOperacion, TipoPropiedad } from "@prisma/client";

interface SearchParams {
  operacion?: string;
  tipo?: string;
  search?: string;
  kai?: string;
}

export default async function MarketplaceHome({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const propiedades = await db.propiedad.findMany({
    where: {
      publicada: true,
      inmobiliaria: { estado: { in: ["ACTIVA", "PRUEBA"] } },
      ...(sp.operacion ? { operacion: sp.operacion as TipoOperacion } : {}),
      ...(sp.tipo ? { tipo: sp.tipo as TipoPropiedad } : {}),
      ...(sp.search
        ? {
            OR: [
              { titulo: { contains: sp.search, mode: "insensitive" } },
              { direccion: { contains: sp.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 24,
    include: {
      atributos: {
        select: {
          habitaciones: true,
          banos: true,
          superficieCubierta: true,
          superficieTotal: true,
          anchoMetros: true,
          largoMetros: true,
          garage: true,
          caracteristicasCustom: true,
        },
      },
      fotos: { where: { esPortada: true }, take: 1 },
      inmobiliaria: {
        select: { id: true, nombre: true, logoUrl: true, whatsapp: true },
      },
    },
  });

  const hasFilters = !!(sp.operacion || sp.tipo || sp.search);
  const fromKai = sp.kai === "1";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background-mp)" }}>
      <MarketplaceHeader />

      {!hasFilters && <HeroSection />}

      {/* Active filter bar */}
      {hasFilters && (
        <div
          className="sticky z-40 py-3 px-4"
          style={{
            top: 60,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--cream-border)",
            boxShadow: "0 2px 12px rgba(139,69,19,0.06)",
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
            <form className="flex gap-2 flex-1 flex-wrap">
              <input
                name="search"
                defaultValue={sp.search}
                placeholder="Buscar..."
                className="flex-1 min-w-[140px] text-sm px-3 py-2 rounded-xl border outline-none"
                style={{
                  borderColor: "var(--cream-border)",
                  color: "var(--antracite)",
                  fontFamily: "var(--font-jakarta)",
                  background: "white",
                }}
              />
              <select
                name="operacion"
                defaultValue={sp.operacion ?? ""}
                className="text-sm px-3 py-2 rounded-xl border outline-none cursor-pointer"
                style={{
                  borderColor: "var(--cream-border)",
                  color: "var(--antracite-mid)",
                  fontFamily: "var(--font-jakarta)",
                  background: "white",
                }}
              >
                <option value="">Todas las operaciones</option>
                <option value="VENTA">Comprar</option>
                <option value="ALQUILER">Alquilar</option>
                <option value="ALQUILER_TEMPORARIO">Temporario</option>
              </select>
              <select
                name="tipo"
                defaultValue={sp.tipo ?? ""}
                className="text-sm px-3 py-2 rounded-xl border outline-none cursor-pointer"
                style={{
                  borderColor: "var(--cream-border)",
                  color: "var(--antracite-mid)",
                  fontFamily: "var(--font-jakarta)",
                  background: "white",
                }}
              >
                <option value="">Todos los tipos</option>
                {(
                  [
                    "CASA",
                    "DEPARTAMENTO",
                    "LOCAL",
                    "GALPON",
                    "TERRENO",
                    "OFICINA",
                  ] as TipoPropiedad[]
                ).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_PROPIEDAD_LABELS[t]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn-terra text-sm px-4 py-2 rounded-xl"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                Filtrar
              </button>
            </form>
            <Link
              href="/"
              className="text-sm transition-opacity hover:opacity-60"
              style={{
                color: "var(--antracite-light)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Limpiar
            </Link>
          </div>
        </div>
      )}

      {!hasFilters && <FeaturesSection />}

      {/* Full-width listings */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {/* Kai banner */}
          {fromKai && (
            <div
              className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(193,105,79,0.09)",
                border: "1px solid rgba(193,105,79,0.25)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              <Image src="/mascota-kai.svg" alt="Kai" width={28} height={28} style={{ objectFit: "contain" }} />
              <p style={{ fontSize: 13, color: "var(--antracite)", flex: 1 }}>
                Mostrando resultados para tu búsqueda con Kai 🐾
              </p>
              <Link
                href="/"
                style={{ fontSize: 12, color: "var(--terra-mid)", fontWeight: 600, whiteSpace: "nowrap" }}
              >
                Limpiar
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between mb-8">
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{
                fontFamily: "var(--font-fraunces)",
                color: "var(--antracite)",
                letterSpacing: "-0.02em",
              }}
            >
              {hasFilters
                ? `${propiedades.length} resultado${propiedades.length !== 1 ? "s" : ""}`
                : "Propiedades disponibles"}
            </h2>
            {hasFilters && (
              <p
                className="text-sm"
                style={{
                  color: "var(--antracite-light)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {propiedades.length === 0
                  ? "Sin coincidencias"
                  : `en ${
                      sp.operacion === "VENTA"
                        ? "venta"
                        : sp.operacion === "ALQUILER"
                        ? "alquiler"
                        : sp.operacion === "ALQUILER_TEMPORARIO"
                        ? "alquiler temporario"
                        : "todas las operaciones"
                    }`}
              </p>
            )}
          </div>

          {propiedades.length === 0 ? (
            <div className="text-center py-24">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "var(--terra-pale)" }}
              >
                <Building2
                  className="w-10 h-10"
                  style={{ color: "var(--terra-mid)" }}
                />
              </div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  color: "var(--antracite)",
                }}
              >
                Sin resultados
              </h3>
              <p
                className="text-sm mb-6 max-w-xs mx-auto"
                style={{
                  color: "var(--antracite-light)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                No encontramos propiedades que coincidan con tu búsqueda.
              </p>
              <Link
                href="/"
                className="btn-terra inline-flex items-center gap-2 px-6 py-3 rounded-xl"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                Ver todas las propiedades
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {propiedades.map((p, i) => (
                <MarketplacePropiedadCard
                  key={p.id}
                  id={p.id}
                  titulo={p.titulo}
                  slug={p.slug}
                  tipo={p.tipo}
                  operacion={p.operacion}
                  precio={Number(p.precio)}
                  moneda={p.moneda}
                  direccion={p.direccion}
                  fotos={p.fotos}
                  atributos={
                    p.atributos
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
                      : null
                  }
                  inmobiliaria={p.inmobiliaria}
                  createdAt={p.createdAt.toISOString()}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <MarketplaceFooter />
      <MascotaKai />
    </div>
  );
}
