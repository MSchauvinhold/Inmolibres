"use client";

import Image from "next/image";
import Link from "next/link";
import { Bed, Bath, Square, Eye } from "lucide-react";
import { formatPrice, TIPO_PROPIEDAD_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils";
import type { PropiedadCard } from "@/types";
import { PropiedadCardMenu } from "./PropiedadCardMenu";
import { Pill } from "@/components/ui/pill";
import { PropertyIllustration } from "@/components/ui/property-illustration";

// Seed por tipo de propiedad → variante de ilustración
const SEED_MAP: Record<string, number> = {
  CASA: 0, CHALET: 0, DUPLEX: 0,
  DEPARTAMENTO: 1,
  TERRENO: 2, CAMPO: 2,
  LOCAL: 3, OFICINA: 3, GALPON: 3,
};

interface Props {
  propiedad: PropiedadCard;
  href?: string;
  showActions?: boolean;
}

export function PropiedadCard({ propiedad, href, showActions }: Props) {
  const portada = propiedad.fotos?.find((f) => f.esPortada) ?? propiedad.fotos?.[0];
  const seed = SEED_MAP[propiedad.tipo] ?? 0;
  const code = `PR-${propiedad.id.slice(-4).toUpperCase()}`;

  const operacionTone =
    propiedad.operacion === "VENTA"
      ? ("terra" as const)
      : propiedad.operacion === "ALQUILER"
      ? ("dark" as const)
      : ("accent" as const);

  const superficie =
    propiedad.atributos?.superficieCubierta ?? propiedad.atributos?.superficieTotal;

  const content = (
    <div className="il-card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
      {/* ── Imagen / ilustración ── */}
      <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
        {portada ? (
          <Image
            src={portada.urlCloudinary}
            alt={propiedad.titulo}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        ) : (
          <PropertyIllustration seed={seed} />
        )}

        {/* Badges operación */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
          <Pill tone={operacionTone} style={{ fontSize: 10 }}>
            {TIPO_OPERACION_LABELS[propiedad.operacion]}
          </Pill>
        </div>

        {/* Menú ⋯ */}
        {showActions && (
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <PropiedadCardMenu propiedadId={propiedad.id} />
          </div>
        )}

        {/* Overlay "No publicada" */}
        {!propiedad.publicada && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(20,17,14,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pill
              tone="dark"
              style={{
                background: "var(--antracita-900)",
                color: "var(--crema-50)",
                fontSize: 11,
                gap: 5,
              }}
            >
              <Eye size={11} style={{ opacity: 0.7 }} />
              No publicada
            </Pill>
          </div>
        )}
      </div>

      {/* ── Cuerpo ── */}
      <div style={{ padding: "12px 14px" }}>
        {/* Código + precio */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.05em" }}
          >
            {code}
          </span>
          <span
            className="mono"
            style={{ fontSize: 17, fontWeight: 600, color: "var(--antracita-900)" }}
          >
            {formatPrice(Number(propiedad.precio), propiedad.moneda)}
          </span>
        </div>

        {/* Tipo */}
        <div
          style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", marginTop: 4 }}
        >
          {TIPO_PROPIEDAD_LABELS[propiedad.tipo]}
        </div>

        {/* Dirección */}
        <div
          style={{
            fontSize: 11.5,
            color: "var(--antracita-500)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {propiedad.direccion}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--antracita-500)" }}>
            {propiedad.atributos?.habitaciones != null && (
              <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                <Bed size={11} /> {propiedad.atributos.habitaciones}
              </span>
            )}
            {propiedad.atributos?.banos != null && (
              <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                <Bath size={11} /> {propiedad.atributos.banos}
              </span>
            )}
            {superficie != null && (
              <span
                className="mono"
                style={{ display: "inline-flex", gap: 3, alignItems: "center" }}
              >
                <Square size={11} /> {superficie}m²
              </span>
            )}
          </div>

          {/* Estado */}
          <span
            style={{
              fontSize: 10.5,
              color:
                propiedad.estado === "DISPONIBLE"
                  ? "var(--success-500)"
                  : propiedad.estado === "RESERVADA"
                  ? "var(--warning-500)"
                  : "var(--antracita-300)",
              fontWeight: 600,
            }}
          >
            {propiedad.estado === "DISPONIBLE"
              ? "Disponible"
              : propiedad.estado === "RESERVADA"
              ? "Reservada"
              : propiedad.estado === "ALQUILADA"
              ? "Alquilada"
              : "Vendida"}
          </span>
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href} style={{ display: "block" }}>{content}</Link>;
  return content;
}
