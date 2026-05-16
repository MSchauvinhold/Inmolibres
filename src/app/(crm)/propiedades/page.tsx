import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PropiedadCard } from "@/components/propiedades/PropiedadCard";
import { ESTADO_PROPIEDAD_LABELS } from "@/lib/utils";
import type { TipoPropiedad, TipoOperacion, EstadoPropiedad } from "@prisma/client";

export const metadata = { title: "Propiedades" };

interface SearchParams { tipo?: string; operacion?: string; estado?: string; search?: string; page?: string }

export default async function PropiedadesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");
  const inmobiliariaId = session.user.inmobiliariaId;

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const where = {
    inmobiliariaId,
    ...(sp.tipo ? { tipo: sp.tipo as TipoPropiedad } : {}),
    ...(sp.operacion ? { operacion: sp.operacion as TipoOperacion } : {}),
    ...(sp.estado ? { estado: sp.estado as EstadoPropiedad } : {}),
    ...(sp.search ? { OR: [
      { titulo: { contains: sp.search, mode: "insensitive" as const } },
      { direccion: { contains: sp.search, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [total, propiedadesRaw] = await Promise.all([
    db.propiedad.count({ where }),
    db.propiedad.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        atributos: true,
        fotos: { orderBy: { orden: "asc" } },
        inmobiliaria: { select: { id: true, nombre: true, logoUrl: true, whatsapp: true } },
      },
    }),
  ]);

  const propiedades = propiedadesRaw.map((p) => ({
    ...p,
    precio: Number(p.precio),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    atributos: p.atributos ? {
      ...p.atributos,
      precioPorDia: p.atributos.precioPorDia !== null ? Number(p.atributos.precioPorDia) : null,
      precioSemana: p.atributos.precioSemana !== null ? Number(p.atributos.precioSemana) : null,
      precioQuincena: p.atributos.precioQuincena !== null ? Number(p.atributos.precioQuincena) : null,
    } : null,
  }));

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Propiedades</h1>
          <p className="text-sm text-text-muted mt-0.5">{total} propiedades en total</p>
        </div>
        <Link href="/propiedades/nueva" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <input name="search" defaultValue={sp.search} placeholder="Buscar..." className="input-base text-sm" />
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input-base text-sm">
          <option value="">Todos los tipos</option>
          {["CASA","DEPARTAMENTO","LOCAL","GALPON","TERRENO","OFICINA"].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="operacion" defaultValue={sp.operacion ?? ""} className="input-base text-sm">
          <option value="">Todas las operaciones</option>
          <option value="VENTA">Venta</option>
          <option value="ALQUILER">Alquiler</option>
          <option value="ALQUILER_TEMPORARIO">Temporario</option>
        </select>
        <select name="estado" defaultValue={sp.estado ?? ""} className="input-base text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_PROPIEDAD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="submit" className="btn-primary text-sm">Filtrar</button>
        <Link href="/propiedades" className="btn-outline text-sm">Limpiar</Link>
      </form>

      {propiedades.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted">No hay propiedades con esos filtros.</p>
          <Link href="/propiedades/nueva" className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar primera propiedad
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {propiedades.map((p) => (
              <PropiedadCard
                key={p.id}
                propiedad={p as unknown as import("@/types").PropiedadCard}
                href={`/propiedades/${p.id}/editar`}
                showActions
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`/propiedades?page=${n}&${new URLSearchParams(sp as Record<string,string>)}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${n === page ? "bg-brand-primary text-white" : "bg-surface-raised text-text-secondary hover:bg-border"}`}
                >
                  {n}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
