"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, Bed, Bath, Square, Car, MessageCircle } from "lucide-react";
import { formatPrice, buildWhatsAppLink } from "@/lib/utils";
import type { Moneda, TipoOperacion, TipoPropiedad } from "@prisma/client";

interface AtributosInfo {
  habitaciones: number | null;
  banos: number | null;
  superficieCubierta: number | null;
  superficieTotal: number | null;
  anchoMetros: number | null;
  largoMetros: number | null;
  garage: boolean | null;
  caracteristicasCustom?: string[] | null;
}

interface InmobiliariaInfo {
  id: string;
  nombre: string;
  logoUrl: string | null;
  whatsapp: string;
}

interface MarketplacePropiedadCardProps {
  id: string;
  titulo: string;
  slug: string;
  tipo: TipoPropiedad;
  operacion: TipoOperacion;
  precio: number;
  moneda: Moneda;
  direccion: string;
  fotos: { urlCloudinary: string; esPortada: boolean }[];
  atributos: AtributosInfo | null;
  inmobiliaria: InmobiliariaInfo;
  createdAt?: string;
  index?: number;
}

const OPERACION_STYLE: Record<TipoOperacion, { bg: string; color: string }> = {
  VENTA: { bg: "rgba(193,105,79,0.92)", color: "white" },
  ALQUILER: { bg: "rgba(45,106,79,0.9)", color: "white" },
  ALQUILER_TEMPORARIO: { bg: "rgba(201,168,76,0.94)", color: "#2C2C2C" },
};

const OPERACION_SHORT: Record<TipoOperacion, string> = {
  VENTA: "Venta",
  ALQUILER: "Alquiler",
  ALQUILER_TEMPORARIO: "Temporario",
};

export function MarketplacePropiedadCard({
  titulo,
  slug,
  operacion,
  precio,
  moneda,
  direccion,
  fotos,
  atributos,
  inmobiliaria,
  createdAt,
  index = 0,
}: MarketplacePropiedadCardProps) {
  const [hovered, setHovered] = useState(false);

  const portada = fotos.find((f) => f.esPortada) ?? fotos[0];
  const href = `/propiedades/${inmobiliaria.id}/${slug}`;

  const [isNuevo] = useState(() =>
    createdAt
      ? Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
      : false
  );

  const waMsg = `Hola, vi "${titulo}" en InmoLibres y me interesa más información.`;
  const waLink = buildWhatsAppLink(inmobiliaria.whatsapp, waMsg);

  const opStyle = OPERACION_STYLE[operacion];

  const initials = inmobiliaria.nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const supLabel = (() => {
    if (!atributos) return null;
    if (atributos.anchoMetros && atributos.largoMetros) {
      return `${atributos.anchoMetros}×${atributos.largoMetros}m`;
    }
    if (atributos.superficieCubierta != null) return `${atributos.superficieCubierta}m²`;
    if (atributos.superficieTotal != null) return `${atributos.superficieTotal}m²`;
    return null;
  })();

  const chips = [
    atributos?.habitaciones != null && {
      key: "hab",
      icon: Bed,
      label: `${atributos.habitaciones}`,
    },
    atributos?.banos != null && {
      key: "ban",
      icon: Bath,
      label: `${atributos.banos}`,
    },
    supLabel !== null && {
      key: "sup",
      icon: Square,
      label: supLabel,
    },
    atributos?.garage && { key: "gar", icon: Car, label: "Garage" },
  ].filter(Boolean) as { key: string; icon: React.ElementType; label: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.5,
        delay: (index % 3) * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <div
        className="rounded-2xl overflow-hidden cursor-pointer"
        style={{
          background: "white",
          boxShadow: hovered
            ? "var(--shadow-mp-card-hover)"
            : "var(--shadow-mp-card)",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          transition: "box-shadow 200ms ease-out, transform 200ms ease-out",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <Link href={href} className="block relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <div
            className="w-full h-full"
            style={{ background: "var(--background-mp-alt)" }}
          >
            {portada ? (
              <Image
                src={portada.urlCloudinary}
                alt={titulo}
                fill
                className="object-cover"
                style={{
                  transition: "transform 500ms ease-out",
                  transform: hovered ? "scale(1.06)" : "scale(1)",
                }}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M3 12L12 3L21 12V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V12Z"
                    fill="var(--cream-border)"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Badges row */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                background: opStyle.bg,
                color: opStyle.color,
                fontFamily: "var(--font-jakarta)",
                backdropFilter: "blur(6px)",
              }}
            >
              {OPERACION_SHORT[operacion]}
            </span>
            {isNuevo && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1"
                style={{
                  background: "rgba(255,255,255,0.93)",
                  color: "var(--terra-mid)",
                  fontFamily: "var(--font-jakarta)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "var(--terra-mid)",
                    animation: "pulse-dot 2s cubic-bezier(0.4,0,0.6,1) infinite",
                    display: "inline-block",
                  }}
                />
                Nuevo
              </span>
            )}
          </div>

          {/* Inmobiliaria logo circle */}
          <div
            className="absolute top-3 right-3 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              border: "2px solid white",
              background: "var(--terra-pale)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
            title={inmobiliaria.nombre}
          >
            {inmobiliaria.logoUrl ? (
              <Image
                src={inmobiliaria.logoUrl}
                alt={inmobiliaria.nombre}
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            ) : (
              <span
                style={{
                  color: "var(--terra-dark)",
                  fontFamily: "var(--font-jakarta)",
                  fontSize: 11,
                }}
              >
                {initials}
              </span>
            )}
          </div>
        </Link>

        {/* Body */}
        <div className="p-4">
          {/* Price */}
          <p
            className="text-xl font-semibold leading-none"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--antracite)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatPrice(precio, moneda)}
          </p>

          {/* Title */}
          <Link href={href}>
            <h3
              className="mt-2 text-sm font-medium line-clamp-2 leading-snug"
              style={{
                color: "var(--antracite)",
                fontFamily: "var(--font-jakarta)",
                transition: "opacity 150ms",
              }}
            >
              {titulo}
            </h3>
          </Link>

          {/* Address */}
          <div className="flex items-center gap-1.5 mt-2">
            <MapPin
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: "var(--antracite-light)" }}
            />
            <p
              className="text-xs truncate"
              style={{
                color: "var(--antracite-light)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              {direccion}
            </p>
          </div>

          {/* Attribute chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {chips.map(({ key, icon: Icon, label }) => (
                <span
                  key={key}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                  style={{
                    background: "var(--terra-pale)",
                    color: "var(--terra-dark)",
                    fontFamily: "var(--font-jakarta)",
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Características pills — show up to 4, then "+N más" */}
          {atributos?.caracteristicasCustom && atributos.caracteristicasCustom.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {atributos.caracteristicasCustom.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 rounded-full text-[11px]"
                  style={{
                    background: "var(--cream-dark)",
                    color: "var(--antracite-mid)",
                    fontFamily: "var(--font-jakarta)",
                    border: "1px solid var(--cream-border)",
                  }}
                >
                  {c}
                </span>
              ))}
              {atributos.caracteristicasCustom.length > 4 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[11px]"
                  style={{
                    background: "var(--cream-dark)",
                    color: "var(--antracite-light)",
                    fontFamily: "var(--font-jakarta)",
                  }}
                >
                  +{atributos.caracteristicasCustom.length - 4} más
                </span>
              )}
            </div>
          )}

          {/* Footer: inmobiliaria name + WhatsApp CTA */}
          <div className="mt-3.5 flex items-center justify-between min-h-[28px]">
            <p
              className="text-[11px] truncate"
              style={{
                color: "var(--antracite-light)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              {inmobiliaria.nombre}
            </p>

            <motion.a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0"
              style={{
                background: "#25D366",
                color: "white",
                fontFamily: "var(--font-jakarta)",
                textDecoration: "none",
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Consultar
            </motion.a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
