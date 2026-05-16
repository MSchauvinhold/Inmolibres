"use client";

import dynamic from "next/dynamic";
import type { MapProperty } from "./MarketplaceMap";

const MarketplaceMap = dynamic(
  () => import("./MarketplaceMap").then((m) => m.MarketplaceMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface-raised animate-pulse flex items-center justify-center">
        <span className="text-text-muted text-sm">Cargando mapa…</span>
      </div>
    ),
  }
);

export function MarketplaceMapClient({ properties }: { properties: MapProperty[] }) {
  return <MarketplaceMap properties={properties} className="w-full h-full" />;
}
