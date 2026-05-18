"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Bed, Bath, Square } from "lucide-react";
import { formatPrice, TIPO_PROPIEDAD_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils";
import type { PropiedadCard } from "@/types";
import { PropiedadCardMenu } from "./PropiedadCardMenu";

interface Props {
  propiedad: PropiedadCard;
  href?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PropiedadCard({ propiedad, href, showActions }: Props) {
  const portada = propiedad.fotos?.find((f) => f.esPortada) ?? propiedad.fotos?.[0];

  const content = (
    <div className="card card-hover overflow-hidden group">
      {/* Image */}
      <div className="relative h-48 bg-surface-raised overflow-hidden">
        {portada ? (
          <Image
            src={portada.urlCloudinary}
            alt={propiedad.titulo}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-raised">
            <Square className="w-10 h-10 text-text-muted" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-primary text-white">
            {TIPO_OPERACION_LABELS[propiedad.operacion]}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-text-primary">
            {TIPO_PROPIEDAD_LABELS[propiedad.tipo]}
          </span>
        </div>

        {showActions && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <PropiedadCardMenu propiedadId={propiedad.id} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="font-price text-lg font-semibold text-brand-primary">
          {formatPrice(Number(propiedad.precio), propiedad.moneda)}
        </p>
        <h3 className="text-sm font-medium text-text-primary mt-0.5 line-clamp-1">{propiedad.titulo}</h3>

        <div className="flex items-center gap-1 mt-1.5 text-text-muted">
          <MapPin className="w-3 h-3 shrink-0" />
          <p className="text-xs truncate">{propiedad.direccion}</p>
        </div>

        {/* Atributos */}
        {propiedad.atributos && (
          <div className="flex items-center gap-3 mt-3 text-xs text-text-secondary">
            {propiedad.atributos.habitaciones != null && (
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" /> {propiedad.atributos.habitaciones}
              </span>
            )}
            {propiedad.atributos.banos != null && (
              <span className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5" /> {propiedad.atributos.banos}
              </span>
            )}
            {propiedad.atributos.superficieCubierta != null ? (
              <span className="flex items-center gap-1">
                <Square className="w-3.5 h-3.5" /> {propiedad.atributos.superficieCubierta}m² cub.
              </span>
            ) : propiedad.atributos.superficieTotal != null ? (
              <span className="flex items-center gap-1">
                <Square className="w-3.5 h-3.5" /> {propiedad.atributos.superficieTotal}m²
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
