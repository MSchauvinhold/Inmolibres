import { db } from "@/lib/db";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { MapaFullscreenClient } from "@/components/marketplace/MapaFullscreenClient";
import type { MapProperty } from "@/components/marketplace/MarketplaceMap";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mapa de propiedades",
};

export default async function MapaPage() {
  const propiedades = await db.propiedad.findMany({
    where: {
      publicada: true,
      latitud: { not: null },
      longitud: { not: null },
      inmobiliaria: { estado: { in: ["ACTIVA", "PRUEBA"] } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      titulo: true,
      slug: true,
      tipo: true,
      operacion: true,
      precio: true,
      moneda: true,
      latitud: true,
      longitud: true,
      inmobiliariaId: true,
      fotos: { where: { esPortada: true }, take: 1, select: { urlCloudinary: true } },
      inmobiliaria: { select: { whatsapp: true } },
    },
  });

  const properties: MapProperty[] = propiedades.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    slug: p.slug,
    tipo: p.tipo,
    operacion: p.operacion as MapProperty["operacion"],
    inmobiliariaId: p.inmobiliariaId,
    precio: Number(p.precio),
    moneda: p.moneda,
    latitud: p.latitud!,
    longitud: p.longitud!,
    fotoUrl: p.fotos[0]?.urlCloudinary ?? null,
    whatsapp: p.inmobiliaria?.whatsapp ?? null,
  }));

  return (
    <div className="flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #DDD5C8" }}>
        <MarketplaceHeader />
      </div>
      <div className="flex-1 relative overflow-hidden">
        <MapaFullscreenClient properties={properties} />
      </div>
    </div>
  );
}
