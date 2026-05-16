"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useMemo } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { propiedadFormSchema, type PropiedadInput } from "@/lib/validations/property";
import { CAMPOS_POR_TIPO, CARACTERISTICAS_POR_TIPO } from "@/lib/propiedades-config";
import { FotoUploader, type FotoData } from "./FotoUploader";
import type { TipoPropiedad, TipoOperacion, Moneda } from "@prisma/client";

const MapPicker = dynamic(
  () => import("@/components/maps/MapPicker").then((m) => m.MapPicker),
  { ssr: false, loading: () => <div className="h-64 bg-surface-raised rounded-xl animate-pulse" /> }
);

export interface PropiedadParaEditar {
  id: string;
  titulo: string;
  tipo: TipoPropiedad;
  operacion: TipoOperacion;
  precio: number;
  moneda: Moneda;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  descripcion: string | null;
  videoUrl: string | null;
  publicada: boolean;
  atributos: {
    superficieCubierta: number | null;
    superficieTotal: number | null;
    habitaciones: number | null;
    banos: number | null;
    garage: boolean | null;
    pileta: boolean | null;
    quincho: boolean | null;
    balcon: boolean | null;
    amueblado: boolean | null;
    cantidadPisos: number | null;
    numeroPiso: number | null;
    mostrarPrecioPorM2: boolean;
    precioPorDia: number | null;
    precioSemana: number | null;
    precioQuincena: number | null;
    diasMinimos: number | null;
    diasMaximos: number | null;
    anchoMetros: number | null;
    largoMetros: number | null;
    alturaInterna: number | null;
    serviciosAgua: boolean | null;
    serviciosLuz: boolean | null;
    serviciosGas: boolean | null;
    serviciosCloaca: boolean | null;
    caracteristicasCustom: string[];
  } | null;
  fotos: { urlCloudinary: string; orden: number; esPortada: boolean }[];
}

interface Props {
  propiedad?: PropiedadParaEditar;
}

function Field({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: "hidden" }}
        >
          <div className="pt-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PropiedadForm({ propiedad }: Props) {
  const router = useRouter();
  const isEdit = !!propiedad;
  const [loading, setLoading] = useState(false);
  const [nuevaCaract, setNuevaCaract] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PropiedadInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(propiedadFormSchema) as any,
    defaultValues: propiedad
      ? {
          titulo: propiedad.titulo,
          tipo: propiedad.tipo,
          operacion: propiedad.operacion,
          precio: Number(propiedad.precio),
          moneda: propiedad.moneda,
          direccion: propiedad.direccion,
          latitud: propiedad.latitud,
          longitud: propiedad.longitud,
          descripcion: propiedad.descripcion ?? "",
          videoUrl: propiedad.videoUrl ?? "",
          publicada: propiedad.publicada,
          atributos: propiedad.atributos
            ? {
                superficieCubierta: propiedad.atributos.superficieCubierta ?? undefined,
                superficieTotal: propiedad.atributos.superficieTotal ?? undefined,
                habitaciones: propiedad.atributos.habitaciones ?? undefined,
                banos: propiedad.atributos.banos ?? undefined,
                garage: propiedad.atributos.garage ?? undefined,
                pileta: propiedad.atributos.pileta ?? undefined,
                quincho: propiedad.atributos.quincho ?? undefined,
                balcon: propiedad.atributos.balcon ?? undefined,
                amueblado: propiedad.atributos.amueblado ?? undefined,
                cantidadPisos: propiedad.atributos.cantidadPisos ?? undefined,
                numeroPiso: propiedad.atributos.numeroPiso ?? undefined,
                mostrarPrecioPorM2: propiedad.atributos.mostrarPrecioPorM2,
                precioPorDia: propiedad.atributos.precioPorDia ? Number(propiedad.atributos.precioPorDia) : undefined,
                precioSemana: propiedad.atributos.precioSemana ? Number(propiedad.atributos.precioSemana) : undefined,
                precioQuincena: propiedad.atributos.precioQuincena ? Number(propiedad.atributos.precioQuincena) : undefined,
                diasMinimos: propiedad.atributos.diasMinimos ?? undefined,
                diasMaximos: propiedad.atributos.diasMaximos ?? undefined,
                anchoMetros: propiedad.atributos.anchoMetros ?? undefined,
                largoMetros: propiedad.atributos.largoMetros ?? undefined,
                alturaInterna: propiedad.atributos.alturaInterna ?? undefined,
                serviciosAgua: propiedad.atributos.serviciosAgua ?? undefined,
                serviciosLuz: propiedad.atributos.serviciosLuz ?? undefined,
                serviciosGas: propiedad.atributos.serviciosGas ?? undefined,
                serviciosCloaca: propiedad.atributos.serviciosCloaca ?? undefined,
                caracteristicasCustom: propiedad.atributos.caracteristicasCustom ?? [],
              }
            : undefined,
          fotos: propiedad.fotos.map((f) => ({
            urlCloudinary: f.urlCloudinary,
            orden: f.orden,
            esPortada: f.esPortada,
          })),
        }
      : {
          moneda: "USD",
          publicada: true,
          fotos: [],
          atributos: { mostrarPrecioPorM2: false, caracteristicasCustom: [] },
        },
  });

  const tipo = watch("tipo") as TipoPropiedad | undefined;
  const operacion = watch("operacion") as TipoOperacion | undefined;
  const fotos = watch("fotos") ?? [];
  const lat = watch("latitud");
  const lon = watch("longitud");
  const rawCaract = useWatch({ control, name: "atributos.caracteristicasCustom" }) as string[] | undefined;
  const caracteristicasCustom = useMemo(() => rawCaract ?? [], [rawCaract]);

  const campos = tipo ? CAMPOS_POR_TIPO[tipo] : null;
  const predefinidas = tipo ? CARACTERISTICAS_POR_TIPO[tipo] : [];

  // predefined items that were selected
  const predSeleccionadas = caracteristicasCustom.filter((c) => predefinidas.includes(c));
  // custom items that are NOT in the predefined list
  const soloCustom = caracteristicasCustom.filter((c) => !predefinidas.includes(c));

  const toggleCaract = useCallback(
    (item: string) => {
      const current = caracteristicasCustom;
      if (current.includes(item)) {
        setValue("atributos.caracteristicasCustom", current.filter((c) => c !== item), { shouldDirty: true });
      } else {
        setValue("atributos.caracteristicasCustom", [...current, item], { shouldDirty: true });
      }
    },
    [caracteristicasCustom, setValue]
  );

  const agregarCustom = useCallback(() => {
    const trimmed = nuevaCaract.trim();
    if (!trimmed || caracteristicasCustom.includes(trimmed)) return;
    setValue("atributos.caracteristicasCustom", [...caracteristicasCustom, trimmed], { shouldDirty: true });
    setNuevaCaract("");
  }, [nuevaCaract, caracteristicasCustom, setValue]);

  const quitarCustom = useCallback(
    (item: string) => {
      setValue(
        "atributos.caracteristicasCustom",
        caracteristicasCustom.filter((c) => c !== item),
        { shouldDirty: true }
      );
    },
    [caracteristicasCustom, setValue]
  );

  async function onSubmit(data: PropiedadInput) {
    setLoading(true);
    try {
      const url = isEdit ? `/api/propiedades/${propiedad.id}` : "/api/propiedades";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al guardar");
        return;
      }
      toast.success(isEdit ? "Propiedad actualizada" : "Propiedad creada");
      router.push("/propiedades");
      router.refresh();
    } catch {
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const inp = "input-base w-full";
  const lbl = "block text-sm font-medium text-text-primary mb-1.5";
  const err = "text-xs text-danger mt-1";
  const sec = "p-5 bg-surface rounded-xl border border-border";
  const chkStyle = { accentColor: "var(--brand-primary)" };

  const hasMedida = (key: string) => campos?.medidas.includes(key) ?? false;
  const hasNumerico = (key: string) => campos?.numericos.includes(key) ?? false;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 w-full">

      {/* ── Información básica ────────────────────────────────────────────── */}
      <section className={sec}>
        <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">
          Información básica
        </h2>

        <div className="space-y-4">
          <div>
            <label className={lbl}>Título *</label>
            <input {...register("titulo")} className={inp} placeholder="Casa en barrio céntrico..." />
            {errors.titulo && <p className={err}>{errors.titulo.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Tipo *</label>
              <select {...register("tipo")} className={inp}>
                <option value="">Seleccioná...</option>
                <option value="CASA">Casa</option>
                <option value="DEPARTAMENTO">Departamento</option>
                <option value="LOCAL">Local</option>
                <option value="GALPON">Galpón</option>
                <option value="TERRENO">Terreno</option>
                <option value="OFICINA">Oficina</option>
              </select>
              {errors.tipo && <p className={err}>{errors.tipo.message}</p>}
            </div>
            <div>
              <label className={lbl}>Operación *</label>
              <select {...register("operacion")} className={inp}>
                <option value="">Seleccioná...</option>
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
                <option value="ALQUILER_TEMPORARIO">Alquiler Temporario</option>
              </select>
              {errors.operacion && <p className={err}>{errors.operacion.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Precio *</label>
              <input
                {...register("precio", { valueAsNumber: true })}
                type="number"
                className={inp}
                placeholder="0"
              />
              {errors.precio && <p className={err}>{errors.precio.message}</p>}
            </div>
            <div>
              <label className={lbl}>Moneda</label>
              <select {...register("moneda")} className={inp}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Dirección *</label>
            <input {...register("direccion")} className={inp} placeholder="Av. San Martín 450..." />
            {errors.direccion && <p className={err}>{errors.direccion.message}</p>}
          </div>

          <div>
            <label className={lbl}>Descripción</label>
            <textarea {...register("descripcion")} rows={4} className={inp} placeholder="Describí la propiedad..." />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Controller
              control={control}
              name="publicada"
              render={({ field }) => (
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={field.onChange}
                  className="w-4 h-4"
                  style={chkStyle}
                />
              )}
            />
            <span className="text-sm text-text-primary">Publicada en marketplace</span>
          </label>
        </div>
      </section>

      {/* ── Características ───────────────────────────────────────────────── */}
      <section className={sec}>
        <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">
          Características
        </h2>

        {/* Medidas — condicionales por tipo */}
        <AnimatePresence initial={false}>
          {campos && (
            <motion.div
              key={tipo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {/* Superficies */}
              {(hasMedida("superficieCubierta") || hasMedida("superficieTotal") || hasMedida("anchoMetros") || hasMedida("largoMetros") || hasMedida("alturaInterna")) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {hasMedida("superficieCubierta") && (
                    <div>
                      <label className={lbl}>Sup. Cubierta (m²)</label>
                      <input {...register("atributos.superficieCubierta", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                  {hasMedida("superficieTotal") && (
                    <div>
                      <label className={lbl}>Sup. Total (m²)</label>
                      <input {...register("atributos.superficieTotal", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                  {hasMedida("anchoMetros") && (
                    <div>
                      <label className={lbl}>Ancho (m)</label>
                      <input {...register("atributos.anchoMetros", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                  {hasMedida("largoMetros") && (
                    <div>
                      <label className={lbl}>Largo (m)</label>
                      <input {...register("atributos.largoMetros", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                  {hasMedida("alturaInterna") && (
                    <div>
                      <label className={lbl}>Altura interna (m)</label>
                      <input {...register("atributos.alturaInterna", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                </div>
              )}

              {/* Numéricos */}
              {campos.numericos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {hasNumerico("habitaciones") && (
                    <div>
                      <label className={lbl}>Dormitorios</label>
                      <input {...register("atributos.habitaciones", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                  {hasNumerico("banos") && (
                    <div>
                      <label className={lbl}>Baños</label>
                      <input {...register("atributos.banos", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                  {hasNumerico("cantidadPisos") && (
                    <div>
                      <label className={lbl}>Cantidad de pisos</label>
                      <input {...register("atributos.cantidadPisos", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                  {hasNumerico("numeroPiso") && (
                    <div>
                      <label className={lbl}>N° de piso</label>
                      <input {...register("atributos.numeroPiso", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checkboxes predefinidos por tipo */}
        <AnimatePresence mode="wait">
          {tipo && predefinidas.length > 0 && (
            <motion.div
              key={`caract-${tipo}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22 }}
              className="border-t border-border pt-4 mt-2"
            >
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                Características de la propiedad
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                {predefinidas.map((item) => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={predSeleccionadas.includes(item)}
                      onChange={() => toggleCaract(item)}
                      className="w-4 h-4 shrink-0"
                      style={chkStyle}
                    />
                    <span className="text-sm text-text-primary leading-tight">{item}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Servicios — solo CASA, TERRENO, GALPON */}
        <Field show={!!campos?.servicios}>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
              Servicios disponibles
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5">
              {[
                { name: "atributos.serviciosAgua" as const, label: "Agua corriente" },
                { name: "atributos.serviciosLuz" as const, label: "Luz eléctrica" },
                { name: "atributos.serviciosGas" as const, label: "Gas natural" },
                { name: "atributos.serviciosCloaca" as const, label: "Cloaca" },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={!!field.value}
                        onChange={field.onChange}
                        className="w-4 h-4"
                        style={chkStyle}
                      />
                    )}
                  />
                  <span className="text-sm text-text-primary">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </Field>

        {/* Custom características */}
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            ¿Falta alguna característica?
          </p>
          <div className="flex gap-2">
            <input
              value={nuevaCaract}
              onChange={(e) => setNuevaCaract(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarCustom(); } }}
              placeholder="Ej: Sótano, Pozo de agua, Panel solar..."
              className={`${inp} flex-1`}
            />
            <button
              type="button"
              onClick={agregarCustom}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
              style={{ background: "var(--brand-primary)" }}
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>

          {soloCustom.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {soloCustom.map((c) => (
                <span
                  key={c}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                  style={{
                    background: "rgba(27,67,50,0.1)",
                    border: "1px solid rgba(27,67,50,0.3)",
                    color: "var(--brand-secondary)",
                  }}
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => quitarCustom(c)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Precios temporarios */}
        <Field show={operacion === "ALQUILER_TEMPORARIO"}>
          <div className="space-y-4 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Precios temporarios
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Precio por día *</label>
                <input
                  {...register("atributos.precioPorDia", { valueAsNumber: true })}
                  type="number"
                  className={inp}
                  placeholder="0"
                />
                {errors.atributos?.precioPorDia && (
                  <p className={err}>{errors.atributos.precioPorDia.message}</p>
                )}
              </div>
              <div>
                <label className={lbl}>Precio por semana</label>
                <input {...register("atributos.precioSemana", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
              </div>
              <div>
                <label className={lbl}>Precio por quincena</label>
                <input {...register("atributos.precioQuincena", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
              </div>
              <div>
                <label className={lbl}>Días mínimos</label>
                <input {...register("atributos.diasMinimos", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
              </div>
              <div>
                <label className={lbl}>Días máximos</label>
                <input {...register("atributos.diasMaximos", { valueAsNumber: true })} type="number" className={inp} placeholder="—" />
              </div>
            </div>
          </div>
        </Field>
      </section>

      {/* ── Ubicación ─────────────────────────────────────────────────────── */}
      <section className={sec}>
        <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">
          Ubicación en mapa
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Hacé clic en el mapa para marcar la ubicación exacta de la propiedad.
        </p>
        <MapPicker
          lat={lat ?? undefined}
          lon={lon ?? undefined}
          onChange={(la, lo) => {
            setValue("latitud", la);
            setValue("longitud", lo);
          }}
        />
        {lat && lon && (
          <p className="text-xs text-text-muted mt-2">
            Lat: {lat.toFixed(6)}, Lon: {lon.toFixed(6)}
          </p>
        )}
      </section>

      {/* ── Fotos ─────────────────────────────────────────────────────────── */}
      <section className={sec}>
        <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">
          Fotos
        </h2>
        <FotoUploader
          value={fotos as FotoData[]}
          onChange={(f) => setValue("fotos", f)}
        />
      </section>

      {/* ── Video ─────────────────────────────────────────────────────────── */}
      <section className={sec}>
        <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">
          Video
        </h2>
        <div>
          <label className={lbl}>URL de YouTube / Vimeo</label>
          <input
            {...register("videoUrl")}
            className={inp}
            placeholder="https://youtube.com/watch?v=..."
          />
          {errors.videoUrl && <p className={err}>{errors.videoUrl.message}</p>}
        </div>
      </section>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-8">
        <button type="button" onClick={() => router.back()} className="btn-outline">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-terra flex items-center gap-2 px-6 py-2.5">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "Guardar cambios" : "Publicar propiedad"}
        </button>
      </div>
    </form>
  );
}
