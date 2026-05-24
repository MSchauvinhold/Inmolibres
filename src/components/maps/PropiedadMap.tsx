"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(
  () => import("@/components/maps/LeafletMap").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <div className="h-64 w-full rounded-2xl bg-surface-raised animate-pulse" /> }
);

interface Props {
  lat: number;
  lon: number;
  titulo: string;
  polygon?: [number, number][] | null;
}

export function PropiedadMap({ lat, lon, titulo, polygon }: Props) {
  return (
    <LeafletMap
      markers={[{ lat, lon, label: titulo }]}
      center={[lat, lon]}
      className="h-64 w-full rounded-2xl"
      polygon={polygon}
    />
  );
}
