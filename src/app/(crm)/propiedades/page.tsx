import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PropiedadCard } from "@/components/propiedades/PropiedadCard";
import { PropiedadesFilters } from "@/components/propiedades/PropiedadesFilters";
import { TIPO_PROPIEDAD_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils";
import { LIMITES_PLAN } from "@/lib/planes";
import type { TipoPropiedad, TipoOperacion, EstadoPropiedad } from "@prisma/client";

export const metadata = { title: "Propiedades" };

interface SearchParams {
  tipo?: string;
  operacion?: string;
  estado?: string;
  search?: string;
  page?: string;
  view?: string;
}

const MAX_PROPIEDADES_PARTICULAR = LIMITES_PLAN.BASICO.maxPropiedades ?? 4;

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isParticular = session.user.rol === "PARTICULAR";
  const inmobiliariaId = session.user.inmobiliariaId;
  if (!isParticular && !inmobiliariaId) redirect("/login");

  const userId = session.user.id;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const pageSize = 12;
  const skip = (page - 1) * pageSize;
  const view = sp.view === "list" ? "list" : "grid";

  const baseWhere = isParticular
    ? { agenteId: userId }
    : { inmobiliariaId: inmobiliariaId! };

  const where = {
    ...baseWhere,
    ...(sp.tipo ? { tipo: sp.tipo as TipoPropiedad } : {}),
    ...(sp.operacion ? { operacion: sp.operacion as TipoOperacion } : {}),
    ...(sp.estado ? { estado: sp.estado as EstadoPropiedad } : {}),
    ...(sp.search
      ? {
          OR: [
            { titulo: { contains: sp.search, mode: "insensitive" as const } },
            { direccion: { contains: sp.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const totalPropias = isParticular
    ? await db.propiedad.count({ where: { agenteId: userId } })
    : 0;
  const puedeAgregar = !isParticular || totalPropias < MAX_PROPIEDADES_PARTICULAR;

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
    atributos: p.atributos
      ? {
          ...p.atributos,
          precioPorDia:
            p.atributos.precioPorDia !== null ? Number(p.atributos.precioPorDia) : null,
          precioSemana:
            p.atributos.precioSemana !== null ? Number(p.atributos.precioSemana) : null,
          precioQuincena:
            p.atributos.precioQuincena !== null ? Number(p.atributos.precioQuincena) : null,
        }
      : null,
  }));

  const totalPages = Math.ceil(total / pageSize);

  // Conteos por estado para el subtítulo
  const [totalActivas, totalBorradores, totalPausadas] = isParticular
    ? [0, 0, 0]
    : await Promise.all([
        db.propiedad.count({ where: { inmobiliariaId: inmobiliariaId!, publicada: true, estado: "DISPONIBLE" } }),
        db.propiedad.count({ where: { inmobiliariaId: inmobiliariaId!, publicada: false } }),
        db.propiedad.count({ where: { inmobiliariaId: inmobiliariaId!, estado: "RESERVADA" } }),
      ]);

  return (
    <div className="w-full max-w-[1060px] mx-auto space-y-0">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--antracita-300)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Módulo · Operaciones
          </p>
          <h1
            className="display"
            style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}
          >
            Propiedades
          </h1>
          {!isParticular && (
            <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
              {totalActivas} activas · {totalBorradores} sin publicar · {totalPausadas} reservadas
            </p>
          )}
          {isParticular && (
            <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
              {totalPropias}/{MAX_PROPIEDADES_PARTICULAR} propiedades usadas
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {puedeAgregar && (
            <Link
              href="/propiedades/nueva"
              className="il-btn il-btn--primary"
              style={{ height: 36, fontSize: 13, gap: 6, textDecoration: "none" }}
            >
              <Plus size={14} color="#fff" />
              Nueva propiedad
            </Link>
          )}
        </div>
      </div>

      {/* ── Filtros (client) ── */}
      <PropiedadesFilters total={total} />

      {/* ── Grid / lista ── */}
      {propiedades.length === 0 ? (
        <div
          className="il-card"
          style={{ padding: "48px 20px", textAlign: "center" }}
        >
          <p style={{ color: "var(--antracita-400)", marginBottom: 16 }}>
            No hay propiedades con esos filtros.
          </p>
          {puedeAgregar && (
            <Link
              href="/propiedades/nueva"
              className="il-btn il-btn--primary"
              style={{ gap: 6, textDecoration: "none" }}
            >
              <Plus size={14} color="#fff" />
              Agregar primera propiedad
            </Link>
          )}
        </div>
      ) : view === "list" ? (
        /* ── Vista lista ── */
        <div className="il-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--crema-100, #F0E9DC)" }}>
                {["Propiedad", "Dirección", "Precio", "Operación", "Estado"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      textAlign: i >= 2 ? "right" : "left",
                      padding: "10px 18px",
                      fontSize: 10.5,
                      color: "var(--antracita-300)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-jetbrains-mono, monospace)",
                      fontWeight: 600,
                      borderBottom: "1px solid var(--border)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propiedades.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom:
                      i < propiedades.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer",
                    transition: "background 150ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--crema-50, #FBF8F2)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  onClick={() => {
                    window.location.href = `/propiedades/${p.id}/editar`;
                  }}
                >
                  <td style={{ padding: "12px 18px" }}>
                    <span
                      style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)" }}
                    >
                      {TIPO_PROPIEDAD_LABELS[p.tipo as TipoPropiedad]}
                    </span>
                    <span
                      className="mono"
                      style={{
                        display: "block",
                        fontSize: 10.5,
                        color: "var(--antracita-300)",
                        marginTop: 1,
                      }}
                    >
                      PR-{p.id.slice(-4).toUpperCase()}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 18px",
                      color: "var(--antracita-500)",
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.direccion}
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "12px 18px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "var(--antracita-900)",
                    }}
                  >
                    {p.moneda === "USD" ? "US$ " : "$ "}
                    {Number(p.precio).toLocaleString("es-AR")}
                  </td>
                  <td style={{ padding: "12px 18px", textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: 22,
                        padding: "0 9px",
                        borderRadius: 999,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background:
                          p.operacion === "VENTA"
                            ? "var(--terracota-100)"
                            : p.operacion === "ALQUILER"
                            ? "var(--antracita-700)"
                            : "var(--il-accent-soft, #DEE5ED)",
                        color:
                          p.operacion === "VENTA"
                            ? "var(--terracota-700)"
                            : p.operacion === "ALQUILER"
                            ? "var(--crema-50)"
                            : "var(--il-accent-deep, #1B3149)",
                      }}
                    >
                      {TIPO_OPERACION_LABELS[p.operacion as TipoOperacion]}
                    </span>
                  </td>
                  <td style={{ padding: "12px 18px", textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          p.estado === "DISPONIBLE"
                            ? "var(--success-500)"
                            : p.estado === "RESERVADA"
                            ? "var(--warning-500)"
                            : "var(--antracita-400)",
                      }}
                    >
                      {p.estado === "DISPONIBLE"
                        ? "Disponible"
                        : p.estado === "RESERVADA"
                        ? "Reservada"
                        : p.estado === "ALQUILADA"
                        ? "Alquilada"
                        : "Vendida"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Vista grilla ── */
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {propiedades.map((p) => (
            <PropiedadCard
              key={p.id}
              propiedad={p as unknown as import("@/types").PropiedadCard}
              href={`/propiedades/${p.id}/editar`}
              showActions
            />
          ))}
        </div>
      )}

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/propiedades?page=${n}&${new URLSearchParams(
                Object.fromEntries(
                  Object.entries(sp).filter(([, v]) => v !== undefined)
                ) as Record<string, string>
              )}`}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                background:
                  n === page ? "var(--antracita-900)" : "var(--crema-100, #F0E9DC)",
                color:
                  n === page ? "var(--crema-50)" : "var(--antracita-600)",
                border: n === page ? "none" : "1px solid var(--border)",
                textDecoration: "none",
              }}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
