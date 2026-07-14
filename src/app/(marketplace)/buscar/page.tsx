import { db } from "@/lib/db";
import Link from "next/link";
import { Search, X, Building2, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { MarketplacePropiedadCard } from "@/components/marketplace/MarketplacePropiedadCard";
import { TIPO_PROPIEDAD_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils";
import type { Metadata } from "next";
import type { TipoOperacion, TipoPropiedad } from "@prisma/client";
import { Prisma } from "@prisma/client";

/* ── Metadata ─────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: "Buscar propiedades — InmoLibres",
  description: "Casas, departamentos, terrenos y locales en venta y alquiler.",
};

/* ── Constantes ───────────────────────────────────────────────── */
const TIPOS: TipoPropiedad[] = [
  "CASA", "DEPARTAMENTO", "LOCAL", "GALPON", "TERRENO", "OFICINA",
];
const OPERACIONES: { value: TipoOperacion | ""; label: string }[] = [
  { value: "",                    label: "Todas" },
  { value: "VENTA",               label: "Comprar" },
  { value: "ALQUILER",            label: "Alquilar" },
  { value: "ALQUILER_TEMPORARIO", label: "Temporario" },
];
const PER_PAGE = 24;

interface SP {
  operacion?: string;
  tipo?: string;
  search?: string;
  precioMin?: string;
  precioMax?: string;
  m2Min?: string;
  m2Max?: string;
  inmobiliaria?: string;
  ordenar?: string;
  pagina?: string;
}

/* ── Helper URL ───────────────────────────────────────────────── */
function buildUrl(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v != null && v !== "") params.set(k, v);
  }
  const qs = params.toString();
  return `/buscar${qs ? `?${qs}` : ""}`;
}

/* ── Page ─────────────────────────────────────────────────────── */
export default async function BuscarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  const operacion = (["VENTA", "ALQUILER", "ALQUILER_TEMPORARIO"].includes(sp.operacion ?? "")
    ? sp.operacion : undefined) as TipoOperacion | undefined;
  const tipo      = (TIPOS.includes(sp.tipo as TipoPropiedad)
    ? sp.tipo : undefined) as TipoPropiedad | undefined;
  const search    = sp.search?.trim() || undefined;
  const precioMin = sp.precioMin ? parseFloat(sp.precioMin) : undefined;
  const precioMax = sp.precioMax ? parseFloat(sp.precioMax) : undefined;
  const m2Min     = sp.m2Min    ? parseFloat(sp.m2Min)    : undefined;
  const m2Max     = sp.m2Max    ? parseFloat(sp.m2Max)    : undefined;
  const inmobiliariaId = sp.inmobiliaria?.trim() || undefined;
  const ordenar   = sp.ordenar ?? "recientes";
  const pagina    = Math.max(1, parseInt(sp.pagina ?? "1"));

  const currentParams: Record<string, string | undefined> = {
    operacion,
    tipo,
    search,
    precioMin:  precioMin  != null ? String(precioMin)  : undefined,
    precioMax:  precioMax  != null ? String(precioMax)  : undefined,
    m2Min:      m2Min      != null ? String(m2Min)      : undefined,
    m2Max:      m2Max      != null ? String(m2Max)      : undefined,
    inmobiliaria: inmobiliariaId,
    ordenar: ordenar !== "recientes" ? ordenar : undefined,
  };

  const orderBy: Prisma.PropiedadOrderByWithRelationInput =
    ordenar === "precio_asc"  ? { precio: "asc" }  :
    ordenar === "precio_desc" ? { precio: "desc" } :
    { createdAt: "desc" };

  // Base: publicadas de inmobiliarias activas/en prueba, o de dueños particulares (inmobiliariaId null)
  const condiciones: Prisma.PropiedadWhereInput[] = [{ publicada: true }];

  if (inmobiliariaId === "PARTICULAR") {
    condiciones.push({ inmobiliariaId: null });
  } else if (inmobiliariaId) {
    condiciones.push({ inmobiliariaId });
  } else {
    condiciones.push({
      OR: [
        { inmobiliaria: { estado: { in: ["ACTIVA", "PRUEBA"] } } },
        { inmobiliariaId: null },
      ],
    });
  }

  if (operacion) condiciones.push({ operacion });
  if (tipo) condiciones.push({ tipo });
  if (search) {
    condiciones.push({
      OR: [
        { titulo:    { contains: search, mode: "insensitive" } },
        { direccion: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (precioMin != null || precioMax != null) {
    condiciones.push({
      precio: {
        ...(precioMin != null ? { gte: new Prisma.Decimal(precioMin) } : {}),
        ...(precioMax != null ? { lte: new Prisma.Decimal(precioMax) } : {}),
      },
    });
  }
  if (m2Min != null || m2Max != null) {
    condiciones.push({
      atributos: {
        OR: [
          {
            superficieCubierta: {
              ...(m2Min != null ? { gte: m2Min } : {}),
              ...(m2Max != null ? { lte: m2Max } : {}),
              not: null,
            },
          },
          {
            superficieTotal: {
              ...(m2Min != null ? { gte: m2Min } : {}),
              ...(m2Max != null ? { lte: m2Max } : {}),
              not: null,
            },
          },
        ],
      },
    });
  }

  const where: Prisma.PropiedadWhereInput = { AND: condiciones };

  const [propiedades, total, inmobiliarias] = await Promise.all([
    db.propiedad.findMany({
      where, orderBy,
      skip: (pagina - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        atributos: {
          select: {
            habitaciones: true, banos: true,
            superficieCubierta: true, superficieTotal: true,
            anchoMetros: true, largoMetros: true,
            garage: true, caracteristicasCustom: true,
          },
        },
        fotos: { where: { esPortada: true }, take: 1 },
        inmobiliaria: { select: { id: true, nombre: true, logoUrl: true, whatsapp: true } },
      },
    }),
    db.propiedad.count({ where }),
    db.inmobiliaria.findMany({
      where: { estado: { in: ["ACTIVA", "PRUEBA"] } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const inmobiliariaSeleccionada = inmobiliariaId === "PARTICULAR"
    ? { nombre: "Dueño directo" }
    : inmobiliariaId
    ? inmobiliarias.find((i) => i.id === inmobiliariaId)
    : undefined;

  const totalPages = Math.ceil(total / PER_PAGE);
  const hasFilters = !!(operacion || tipo || search || precioMin != null || precioMax != null || m2Min != null || m2Max != null || inmobiliariaId);

  type Chip = { key: string; label: string };
  const chips: Chip[] = [
    operacion  && { key: "operacion", label: TIPO_OPERACION_LABELS[operacion] },
    tipo       && { key: "tipo",      label: TIPO_PROPIEDAD_LABELS[tipo] },
    search     && { key: "search",    label: `"${search}"` },
    inmobiliariaId && { key: "inmobiliaria", label: inmobiliariaSeleccionada?.nombre ?? "Inmobiliaria" },
    precioMin != null && { key: "precioMin", label: `Desde ${precioMin.toLocaleString("es-AR")}` },
    precioMax != null && { key: "precioMax", label: `Hasta ${precioMax.toLocaleString("es-AR")}` },
    m2Min != null && { key: "m2Min", label: `${m2Min} m² mín.` },
    m2Max != null && { key: "m2Max", label: `${m2Max} m² máx.` },
  ].filter(Boolean) as Chip[];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 11px",
    border: "1px solid var(--border, #E8DFD0)",
    borderRadius: 10, fontSize: 13,
    color: "var(--antracita-700, #3A332C)",
    background: "var(--crema-50, #FBF8F2)",
    outline: "none", boxSizing: "border-box",
    fontFamily: "var(--font-dm-sans), sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10.5,
    color: "var(--antracita-300, #6F665C)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "var(--font-jetbrains-mono), monospace",
    display: "block",
    marginBottom: 8,
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8">

        {/* ── Encabezado ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--antracita-300)", marginBottom: 10 }}>
            <Link href="/" style={{ color: "var(--antracita-300)", textDecoration: "none" }}>Inicio</Link>
            <ChevronRight size={13} />
            <span style={{ color: "var(--antracita-700)" }}>
              {operacion ? TIPO_OPERACION_LABELS[operacion] : "Todas las propiedades"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="display" style={{ fontSize: "clamp(22px, 3.5vw, 30px)", margin: 0, color: "var(--antracita-900)" }}>
                {operacion === "VENTA"                ? "Propiedades en venta"
                 : operacion === "ALQUILER"           ? "Propiedades en alquiler"
                 : operacion === "ALQUILER_TEMPORARIO"? "Alquiler temporario"
                 : "Todas las propiedades"}
              </h1>
              <p style={{ fontSize: 13.5, color: "var(--antracita-500)", margin: "4px 0 0", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                <span style={{ fontWeight: 600, color: "var(--antracita-700)" }}>{total}</span>{" "}
                {total === 1 ? "propiedad disponible" : "propiedades disponibles"}
              </p>
            </div>

            {/* Sort rápido — desktop */}
            <form method="GET" action="/buscar" className="hidden lg:flex items-center gap-2">
              {operacion  && <input type="hidden" name="operacion"  value={operacion} />}
              {tipo       && <input type="hidden" name="tipo"       value={tipo} />}
              {search     && <input type="hidden" name="search"     value={search} />}
              {precioMin != null && <input type="hidden" name="precioMin" value={precioMin} />}
              {precioMax != null && <input type="hidden" name="precioMax" value={precioMax} />}
              {m2Min != null && <input type="hidden" name="m2Min" value={m2Min} />}
              {m2Max != null && <input type="hidden" name="m2Max" value={m2Max} />}
              {inmobiliariaId && <input type="hidden" name="inmobiliaria" value={inmobiliariaId} />}
              <span style={{ fontSize: 12.5, color: "var(--antracita-500)" }}>Ordenar:</span>
              <select name="ordenar" defaultValue={ordenar}
                style={{ padding: "7px 12px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--antracita-700)", background: "white", outline: "none", cursor: "pointer" }}
              >
                <option value="recientes">Más recientes</option>
                <option value="precio_asc">Menor precio</option>
                <option value="precio_desc">Mayor precio</option>
              </select>
              <button type="submit" style={{ background: "var(--antracita-900)", color: "white", border: "none", borderRadius: 9, padding: "7px 14px", fontSize: 12.5, cursor: "pointer", fontWeight: 500 }}>
                Ordenar
              </button>
            </form>
          </div>
        </div>

        {/* ── Chips de filtros activos ── */}
        {chips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {chips.map((chip) => (
              <Link key={chip.key} href={buildUrl(currentParams, { [chip.key]: undefined, pagina: undefined })}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "var(--terracota-100, #FCEAE4)", color: "var(--terracota-700, #8C3D27)", textDecoration: "none", border: "1px solid var(--terracota-200, #F4C0AA)" }}
              >
                {chip.label} <X size={11} />
              </Link>
            ))}
            <Link href="/buscar"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, fontSize: 12, color: "var(--antracita-500)", textDecoration: "none", border: "1px solid var(--border)", background: "white" }}
            >
              Limpiar todo
            </Link>
          </div>
        )}

        {/* ── Layout: sidebar + grid ── */}
        <div className="flex gap-8 items-start">

          {/* Sidebar — desktop */}
          <aside className="hidden lg:block shrink-0 w-[260px] sticky top-24">
            <div className="il-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                <SlidersHorizontal size={15} style={{ color: "var(--terracota-500)" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--antracita-900)", fontFamily: "var(--font-fraunces-display), Georgia, serif" }}>
                  Filtros
                </span>
                {hasFilters && (
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, background: "var(--terracota-500)", color: "#fff", borderRadius: 999, padding: "2px 8px" }}>
                    {chips.length}
                  </span>
                )}
              </div>

              <form method="GET" action="/buscar" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {/* Buscar */}
                <div>
                  <label style={labelStyle}>Buscar</label>
                  <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--antracita-300)" }} />
                    <input name="search" defaultValue={search ?? ""} placeholder="Barrio, calle, tipo…" style={{ ...inputStyle, paddingLeft: 32 }} />
                  </div>
                </div>

                {/* Operación */}
                <div>
                  <span style={labelStyle}>Operación</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {OPERACIONES.map((op) => {
                      const active = operacion === op.value || (!operacion && !op.value);
                      return (
                        <label key={op.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "7px 10px", borderRadius: 9, background: active ? "var(--terracota-100)" : "transparent", transition: "background 150ms" }}>
                          <input type="radio" name="operacion" value={op.value} defaultChecked={active} style={{ accentColor: "var(--terracota-500)" }} />
                          <span style={{ fontSize: 13.5, color: active ? "var(--terracota-700)" : "var(--antracita-700)", fontWeight: active ? 500 : 400 }}>
                            {op.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label style={labelStyle}>Tipo de propiedad</label>
                  <select name="tipo" defaultValue={tipo ?? ""} style={inputStyle}>
                    <option value="">Todos los tipos</option>
                    {TIPOS.map((t) => <option key={t} value={t}>{TIPO_PROPIEDAD_LABELS[t]}</option>)}
                  </select>
                </div>

                {/* Inmobiliaria / dueño directo */}
                <div>
                  <label style={labelStyle}>Publicado por</label>
                  <select name="inmobiliaria" defaultValue={inmobiliariaId ?? ""} style={inputStyle}>
                    <option value="">Todos</option>
                    <option value="PARTICULAR">Dueño directo</option>
                    {inmobiliarias.map((i) => (
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Precio */}
                <div>
                  <span style={labelStyle}>Precio</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input type="number" name="precioMin" defaultValue={precioMin ?? ""} placeholder="Mínimo" min={0} style={inputStyle} />
                    <input type="number" name="precioMax" defaultValue={precioMax ?? ""} placeholder="Máximo" min={0} style={inputStyle} />
                  </div>
                </div>

                {/* m² */}
                <div>
                  <span style={labelStyle}>Superficie (m²)</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input type="number" name="m2Min" defaultValue={m2Min ?? ""} placeholder="Mín." min={0} style={inputStyle} />
                    <input type="number" name="m2Max" defaultValue={m2Max ?? ""} placeholder="Máx." min={0} style={inputStyle} />
                  </div>
                </div>

                {/* Ordenar */}
                <div>
                  <label style={labelStyle}>Ordenar por</label>
                  <select name="ordenar" defaultValue={ordenar} style={inputStyle}>
                    <option value="recientes">Más recientes</option>
                    <option value="precio_asc">Menor precio primero</option>
                    <option value="precio_desc">Mayor precio primero</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button type="submit" className="btn-primary w-full" style={{ height: 42, fontSize: 14, borderRadius: 10 }}>
                    Aplicar filtros
                  </button>
                  {hasFilters && (
                    <Link href="/buscar" style={{ fontSize: 13, color: "var(--antracita-500)", textDecoration: "none", textAlign: "center", padding: "8px 0", display: "block" }}>
                      Limpiar todos los filtros
                    </Link>
                  )}
                </div>
              </form>
            </div>
          </aside>

          {/* Filtros mobile compact */}
          <div className="lg:hidden w-full mb-4" style={{ gridColumn: "1 / -1" }}>
            <form method="GET" action="/buscar" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select name="operacion" defaultValue={operacion ?? ""} style={{ ...inputStyle, flex: "1 1 120px", width: "auto" }}>
                <option value="">Todas</option>
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
                <option value="ALQUILER_TEMPORARIO">Temporario</option>
              </select>
              <select name="tipo" defaultValue={tipo ?? ""} style={{ ...inputStyle, flex: "1 1 140px", width: "auto" }}>
                <option value="">Todos los tipos</option>
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_PROPIEDAD_LABELS[t]}</option>)}
              </select>
              <select name="inmobiliaria" defaultValue={inmobiliariaId ?? ""} style={{ ...inputStyle, flex: "1 1 160px", width: "auto" }}>
                <option value="">Publicado por: todos</option>
                <option value="PARTICULAR">Dueño directo</option>
                {inmobiliarias.map((i) => (
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary shrink-0" style={{ height: 42, borderRadius: 10, padding: "0 18px", fontSize: 13 }}>
                Filtrar
              </button>
              {hasFilters && (
                <Link href="/buscar" style={{ display: "flex", alignItems: "center", height: 42, padding: "0 14px", borderRadius: 10, border: "1px solid var(--border)", color: "var(--antracita-500)", textDecoration: "none", fontSize: 13, background: "white" }}>
                  <X size={14} />
                </Link>
              )}
            </form>
          </div>

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {propiedades.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: "var(--terracota-100)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building2 size={36} style={{ color: "var(--terracota-500)" }} />
                </div>
                <h3 className="display" style={{ fontSize: 22, color: "var(--antracita-900)", margin: "0 0 10px" }}>Sin resultados</h3>
                <p style={{ fontSize: 14, color: "var(--antracita-500)", margin: "0 0 24px", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                  No encontramos propiedades con esos filtros. Probá con otros criterios.
                </p>
                <Link href="/buscar" className="btn-primary inline-flex items-center gap-2" style={{ borderRadius: 10, padding: "10px 22px", fontSize: 14 }}>
                  Ver todas las propiedades
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
                      atributos={p.atributos ? {
                        habitaciones:       p.atributos.habitaciones,
                        banos:              p.atributos.banos,
                        superficieCubierta: p.atributos.superficieCubierta != null ? Number(p.atributos.superficieCubierta) : null,
                        superficieTotal:    p.atributos.superficieTotal    != null ? Number(p.atributos.superficieTotal)    : null,
                        anchoMetros:        p.atributos.anchoMetros        != null ? Number(p.atributos.anchoMetros)        : null,
                        largoMetros:        p.atributos.largoMetros        != null ? Number(p.atributos.largoMetros)        : null,
                        garage:             p.atributos.garage,
                        caracteristicasCustom: p.atributos.caracteristicasCustom,
                      } : null}
                      inmobiliaria={p.inmobiliaria}
                      createdAt={p.createdAt.toISOString()}
                      index={i}
                    />
                  ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 48 }}>
                      {pagina > 1 ? (
                        <Link href={buildUrl(currentParams, { pagina: String(pagina - 1) })}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "white", color: "var(--antracita-700)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}
                        >
                          <ChevronLeft size={14} /> Anterior
                        </Link>
                      ) : <span style={{ width: 88 }} />}

                      <div style={{ display: "flex", gap: 4 }}>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const pg = totalPages <= 5
                            ? i + 1
                            : pagina <= 3 ? i + 1
                            : pagina >= totalPages - 2 ? totalPages - 4 + i
                            : pagina - 2 + i;
                          return (
                            <Link key={pg} href={buildUrl(currentParams, { pagina: pg === 1 ? undefined : String(pg) })}
                              style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 9, fontSize: 13, fontWeight: 500, textDecoration: "none", background: pg === pagina ? "var(--antracita-900)" : "white", color: pg === pagina ? "white" : "var(--antracita-700)", border: `1px solid ${pg === pagina ? "var(--antracita-900)" : "var(--border)"}` }}
                            >
                              {pg}
                            </Link>
                          );
                        })}
                      </div>

                      {pagina < totalPages ? (
                        <Link href={buildUrl(currentParams, { pagina: String(pagina + 1) })}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "white", color: "var(--antracita-700)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}
                        >
                          Siguiente <ChevronRight size={14} />
                        </Link>
                      ) : <span style={{ width: 88 }} />}
                    </div>

                    <p style={{ textAlign: "center", fontSize: 12, color: "var(--antracita-300)", marginTop: 10 }}>
                      Página {pagina} de {totalPages} · {total} propiedades
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
    </div>
  );
}
