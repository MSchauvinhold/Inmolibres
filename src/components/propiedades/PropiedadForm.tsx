"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useMemo, Fragment } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Plus, X, Check, Bed, Bath, Square, Car, MapPin, ChevronRight, ChevronLeft,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { propiedadFormSchema, type PropiedadInput } from "@/lib/validations/property";
import { CAMPOS_POR_TIPO, CARACTERISTICAS_POR_TIPO } from "@/lib/propiedades-config";
import { FotoUploader, type FotoData } from "./FotoUploader";
import { PropertyIllustration } from "@/components/ui/property-illustration";
import { formatPrice } from "@/lib/utils";
import type { TipoPropiedad, TipoOperacion, Moneda } from "@prisma/client";

const MapPicker = dynamic(
  () => import("@/components/maps/MapPicker").then((m) => m.MapPicker),
  { ssr: false, loading: () => <div className="h-64 bg-surface-raised rounded-xl animate-pulse" /> }
);

const MapaPoligonoEditor = dynamic(
  () => import("@/components/maps/MapaPoligonoEditor").then((m) => m.MapaPoligonoEditor),
  { ssr: false, loading: () => <div className="h-72 bg-surface-raised rounded-xl animate-pulse" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

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
  poligonoJson: [number, number][] | null;
  descripcion: string | null;
  videoUrl: string | null;
  publicada: boolean;
  agenteId: string | null;
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

interface AgenteOption {
  id: string;
  nombre: string;
  rol: string;
}

interface Props {
  propiedad?: PropiedadParaEditar;
  /** Lista de agentes seleccionables (solo se pasa cuando el usuario es ADMIN) */
  agentes?: AgenteOption[];
  currentUserId?: string;
}

// ─── Design tokens (inline, no Tailwind) ─────────────────────────────────────

const W_INPUT: React.CSSProperties = {
  flex: 1,
  border: "none",
  background: "transparent",
  padding: "0 12px",
  fontSize: 14,
  fontFamily: "var(--font-mono)",
  color: "var(--antracita-900)",
  outline: "none",
  fontWeight: 500,
  minWidth: 0,
};

// ─── WizardField ─────────────────────────────────────────────────────────────

function WizardField({
  label,
  suffix,
  required,
  children,
  error,
}: {
  label: string;
  suffix?: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      {label && (
        <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 5, fontWeight: 500 }}>
          {label}
          {required && <span style={{ color: "var(--terracota-500)", marginLeft: 2 }}>*</span>}
        </div>
      )}
      <div style={{
        display: "flex", border: `1px solid ${error ? "var(--danger-500)" : "var(--border)"}`,
        borderRadius: 10, background: "var(--crema-50)", alignItems: "stretch",
        height: 42, overflow: "hidden",
      }}>
        {children}
        {suffix && (
          <span style={{
            padding: "0 12px", display: "flex", alignItems: "center",
            fontSize: 12, color: "var(--antracita-300)",
            borderLeft: "1px solid var(--border)", fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--danger-500)", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ─── PillToggle ───────────────────────────────────────────────────────────────

function PillToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 12px", borderRadius: 999, fontSize: 12,
        background: active ? "var(--terracota-100)" : "white",
        border: active ? "1px solid var(--terracota-300)" : "1px solid var(--border)",
        color: active ? "var(--terracota-700)" : "var(--antracita-500)",
        fontWeight: active ? 600 : 500, cursor: "pointer",
        display: "inline-flex", gap: 5, alignItems: "center",
        transition: "all 150ms ease",
      }}
    >
      {active && <Check size={12} color="var(--terracota-600)" />}
      {label}
    </button>
  );
}

// ─── TypePill — Tipo / Operación selector ─────────────────────────────────────

function TypePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 18px", borderRadius: 999, fontSize: 13,
        background: active ? "var(--terracota-100)" : "white",
        border: active ? "1.5px solid var(--terracota-300)" : "1.5px solid var(--border)",
        color: active ? "var(--terracota-700)" : "var(--antracita-500)",
        fontWeight: active ? 700 : 500, cursor: "pointer",
        display: "inline-flex", gap: 5, alignItems: "center",
        transition: "all 150ms ease",
      }}
    >
      {active && <Check size={12} color="var(--terracota-600)" />}
      {label}
    </button>
  );
}

// ─── StepperBar ───────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Datos básicos" },
  { n: 2, label: "Ubicación" },
  { n: 3, label: "Características" },
  { n: 4, label: "Fotos" },
  { n: 5, label: "Publicación" },
];

function StepperBar({ current }: { current: number }) {
  return (
    <div style={{
      padding: "16px 24px", marginBottom: 20,
      background: "white", borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      boxShadow: "var(--shadow-sm-il)",
    }}>
      {STEPS.map((s, i) => (
        <Fragment key={s.n}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{
              width: 30, height: 30, borderRadius: 999, flexShrink: 0,
              background: s.n < current ? "var(--success-500)" : s.n === current ? "var(--terracota-500)" : "var(--crema-200)",
              color: (s.n < current || s.n === current) ? "#fff" : "var(--antracita-400)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12,
              transition: "background 300ms ease",
            }}>
              {s.n < current ? <Check size={13} strokeWidth={2.5} /> : s.n}
            </span>
            <div>
              <div style={{ fontSize: 9.5, color: "var(--antracita-300)", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                Paso {s.n}
              </div>
              <div style={{
                fontSize: 12, fontWeight: s.n === current ? 600 : 500,
                color: s.n === current ? "var(--antracita-900)" : "var(--antracita-400)",
                whiteSpace: "nowrap",
              }}>
                {s.label}
              </div>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2,
              background: s.n < current ? "var(--success-500)" : "var(--crema-200)",
              borderRadius: 999, margin: "0 12px",
              transition: "background 300ms ease",
            }} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ─── SEED_MAP ─────────────────────────────────────────────────────────────────

const SEED_MAP: Record<string, number> = {
  CASA: 0, DEPARTAMENTO: 1, TERRENO: 2, LOCAL: 3, GALPON: 3, OFICINA: 3,
};

const OP_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  VENTA:               { bg: "rgba(193,105,79,0.92)", color: "#fff",     label: "Venta" },
  ALQUILER:            { bg: "rgba(45,106,79,0.9)",   color: "#fff",     label: "Alquiler" },
  ALQUILER_TEMPORARIO: { bg: "rgba(201,168,76,0.94)", color: "#2C2C2C", label: "Temporario" },
};

// ─── LivePreviewCard ──────────────────────────────────────────────────────────

function LivePreviewCard({
  titulo, tipo, operacion, precio, moneda, direccion, fotos, atributos,
}: {
  titulo?: string;
  tipo?: TipoPropiedad;
  operacion?: TipoOperacion;
  precio?: number;
  moneda?: Moneda;
  direccion?: string;
  fotos?: { urlCloudinary: string }[];
  atributos?: {
    habitaciones?: number | null;
    banos?: number | null;
    superficieCubierta?: number | null;
    garage?: boolean | null;
  } | null;
}) {
  const portada = fotos?.[0];
  const opBadge = operacion ? OP_BADGE[operacion] : null;

  return (
    <div>
      <div style={{
        fontSize: 10, color: "var(--terracota-600)", letterSpacing: "0.12em",
        textTransform: "uppercase", marginBottom: 10,
        fontFamily: "var(--font-mono)", fontWeight: 700,
      }}>
        Vista previa · marketplace
      </div>

      <div style={{
        background: "white", borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)", overflow: "hidden",
        boxShadow: "var(--shadow-mp-card)",
      }}>
        {/* Image */}
        <div style={{ position: "relative", height: 180, background: "var(--crema-100)" }}>
          {portada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portada.urlCloudinary}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <PropertyIllustration
              seed={tipo ? (SEED_MAP[tipo] ?? 0) : 0}
              style={{ width: "100%", height: "100%" }}
            />
          )}
          {opBadge && (
            <div style={{ position: "absolute", top: 10, left: 10 }}>
              <span style={{
                padding: "4px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 600,
                background: opBadge.bg, color: opBadge.color,
                backdropFilter: "blur(6px)",
              }}>
                {opBadge.label}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "14px 16px" }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700,
            color: "var(--antracita-900)", lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}>
            {precio && precio > 0 && moneda
              ? formatPrice(precio, moneda)
              : <span style={{ opacity: 0.25, fontSize: 15 }}>— Precio —</span>}
          </p>

          <p style={{
            fontSize: 13, fontWeight: 500, color: "var(--antracita-900)",
            marginTop: 6, lineHeight: 1.35,
            overflow: "hidden", display: "-webkit-box",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
          }}>
            {titulo || <span style={{ opacity: 0.25 }}>Título de la propiedad</span>}
          </p>

          {direccion ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
              <MapPin size={11} color="var(--antracita-400)" style={{ flexShrink: 0 }} />
              <p style={{
                fontSize: 11.5, color: "var(--antracita-500)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {direccion}
              </p>
            </div>
          ) : null}

          {/* Chips */}
          {(atributos?.habitaciones || atributos?.banos || atributos?.superficieCubierta || atributos?.garage) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
              {atributos?.habitaciones ? (
                <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 999, background: "var(--terracota-50)", color: "var(--terracota-600)", fontSize: 11 }}>
                  <Bed size={10} />{atributos.habitaciones}
                </span>
              ) : null}
              {atributos?.banos ? (
                <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 999, background: "var(--terracota-50)", color: "var(--terracota-600)", fontSize: 11 }}>
                  <Bath size={10} />{atributos.banos}
                </span>
              ) : null}
              {atributos?.superficieCubierta ? (
                <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 999, background: "var(--terracota-50)", color: "var(--terracota-600)", fontSize: 11 }}>
                  <Square size={10} />{atributos.superficieCubierta}m²
                </span>
              ) : null}
              {atributos?.garage ? (
                <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 999, background: "var(--terracota-50)", color: "var(--terracota-600)", fontSize: 11 }}>
                  <Car size={10} />Garage
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--antracita-300)", marginTop: 8, textAlign: "center" }}>
        Así verán tu propiedad en el marketplace
      </p>
    </div>
  );
}

// ─── Slide animation ──────────────────────────────────────────────────────────

function StepSlide({ stepKey, children }: { stepKey: number; children: React.ReactNode }) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--antracita-900)", marginBottom: 4 }}>
      {children}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function PropiedadForm({ propiedad, agentes = [], currentUserId }: Props) {
  const router = useRouter();
  const isEdit = !!propiedad;
  const puedeElegirAsesor = agentes.length > 0; // true solo para ADMIN

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [nuevaCaract, setNuevaCaract] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
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
          poligonoJson: propiedad.poligonoJson,
          descripcion: propiedad.descripcion ?? "",
          videoUrl: propiedad.videoUrl ?? "",
          publicada: propiedad.publicada,
          agenteId: propiedad.agenteId ?? "",
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
          // Por defecto se atribuye al usuario actual (admin). Puede cambiarlo en el selector.
          agenteId: currentUserId ?? "",
          atributos: { mostrarPrecioPorM2: false, caracteristicasCustom: [] },
        },
  });

  // ─── Watched values ───────────────────────────────────────────────────────
  const tipo      = watch("tipo") as TipoPropiedad | undefined;
  const operacion = watch("operacion") as TipoOperacion | undefined;
  const fotos     = watch("fotos") ?? [];
  const precio    = watch("precio");
  const moneda    = watch("moneda") as Moneda | undefined;
  const titulo    = watch("titulo");
  const direccion = watch("direccion");
  const lat       = watch("latitud");
  const lon       = watch("longitud");
  const poligonoJson = watch("poligonoJson") as [number, number][] | null | undefined;

  const rawCaract = useWatch({ control, name: "atributos.caracteristicasCustom" }) as string[] | undefined;
  const rawHab    = useWatch({ control, name: "atributos.habitaciones" }) as number | undefined;
  const rawBanos  = useWatch({ control, name: "atributos.banos" }) as number | undefined;
  const rawSupCub = useWatch({ control, name: "atributos.superficieCubierta" }) as number | undefined;
  const rawGarage = useWatch({ control, name: "atributos.garage" }) as boolean | undefined;

  const caracteristicasCustom = useMemo(() => rawCaract ?? [], [rawCaract]);
  const campos      = tipo ? CAMPOS_POR_TIPO[tipo] : null;
  const predefinidas = tipo ? CARACTERISTICAS_POR_TIPO[tipo] : [];
  const predSeleccionadas = caracteristicasCustom.filter((c) => predefinidas.includes(c));
  const soloCustom        = caracteristicasCustom.filter((c) => !predefinidas.includes(c));

  const hasMedida   = (key: string) => campos?.medidas.includes(key) ?? false;
  const hasNumerico = (key: string) => campos?.numericos.includes(key) ?? false;

  // ─── Characteristic toggles ───────────────────────────────────────────────
  const toggleCaract = useCallback((item: string) => {
    const current = caracteristicasCustom;
    if (current.includes(item)) {
      setValue("atributos.caracteristicasCustom", current.filter((c) => c !== item), { shouldDirty: true });
    } else {
      setValue("atributos.caracteristicasCustom", [...current, item], { shouldDirty: true });
    }
  }, [caracteristicasCustom, setValue]);

  const agregarCustom = useCallback(() => {
    const trimmed = nuevaCaract.trim();
    if (!trimmed || caracteristicasCustom.includes(trimmed)) return;
    setValue("atributos.caracteristicasCustom", [...caracteristicasCustom, trimmed], { shouldDirty: true });
    setNuevaCaract("");
  }, [nuevaCaract, caracteristicasCustom, setValue]);

  const quitarCustom = useCallback((item: string) => {
    setValue("atributos.caracteristicasCustom", caracteristicasCustom.filter((c) => c !== item), { shouldDirty: true });
  }, [caracteristicasCustom, setValue]);

  // ─── Submit ───────────────────────────────────────────────────────────────
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

  // ─── Wizard navigation ────────────────────────────────────────────────────
  async function goNext() {
    const fieldsPerStep: Record<number, string[]> = {
      1: ["titulo", "tipo", "operacion", "precio", "moneda"],
      2: ["direccion"],
      3: operacion === "ALQUILER_TEMPORARIO" ? ["atributos.precioPorDia"] : [],
      4: [],
    };
    const fields = fieldsPerStep[step] ?? [];
    if (fields.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valid = await trigger(fields as any);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrev() {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ─── Shared edit-mode styles ──────────────────────────────────────────────
  const inp  = "input-base w-full";
  const lbl  = "block text-sm font-medium text-text-primary mb-1.5";
  const errS = "text-xs text-danger mt-1";
  const sec  = "p-5 bg-surface rounded-xl border border-border";
  const chk  = { accentColor: "var(--brand-primary)" };

  // ─── Characteristics panel (shared between wizard step 3 and edit mode) ───
  function CaracteristicasPanel() {
    return (
      <div className="space-y-5">
        {/* Medidas */}
        {campos && (hasMedida("superficieCubierta") || hasMedida("superficieTotal") || hasMedida("anchoMetros") || hasMedida("largoMetros") || hasMedida("alturaInterna")) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {hasMedida("superficieCubierta") && (
              <WizardField label="Sup. cubierta" suffix="m²">
                <input {...register("atributos.superficieCubierta", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
            {hasMedida("superficieTotal") && (
              <WizardField label="Sup. total" suffix="m²">
                <input {...register("atributos.superficieTotal", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
            {hasMedida("anchoMetros") && (
              <WizardField label="Ancho" suffix="m">
                <input {...register("atributos.anchoMetros", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
            {hasMedida("largoMetros") && (
              <WizardField label="Largo" suffix="m">
                <input {...register("atributos.largoMetros", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
            {hasMedida("alturaInterna") && (
              <WizardField label="Altura interna" suffix="m">
                <input {...register("atributos.alturaInterna", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
          </div>
        )}

        {/* Numéricos */}
        {campos && campos.numericos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {hasNumerico("habitaciones") && (
              <WizardField label="Dormitorios">
                <input {...register("atributos.habitaciones", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
            {hasNumerico("banos") && (
              <WizardField label="Baños">
                <input {...register("atributos.banos", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
            {hasNumerico("cantidadPisos") && (
              <WizardField label="Cant. pisos">
                <input {...register("atributos.cantidadPisos", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
            {hasNumerico("numeroPiso") && (
              <WizardField label="N° de piso">
                <input {...register("atributos.numeroPiso", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            )}
          </div>
        )}

        {/* Predefined pill-toggles */}
        <AnimatePresence mode="wait">
          {tipo && predefinidas.length > 0 && (
            <motion.div
              key={`pred-${tipo}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 8, fontWeight: 500 }}>
                Servicios y comodidades
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {predefinidas.map((item) => (
                  <PillToggle
                    key={item}
                    label={item}
                    active={predSeleccionadas.includes(item)}
                    onClick={() => toggleCaract(item)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Servicios (agua, luz, gas, cloaca) */}
        {campos?.servicios && (
          <div>
            <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 8, fontWeight: 500 }}>
              Servicios disponibles
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(
                [
                  { name: "atributos.serviciosAgua", label: "Agua corriente" },
                  { name: "atributos.serviciosLuz", label: "Luz eléctrica" },
                  { name: "atributos.serviciosGas", label: "Gas natural" },
                  { name: "atributos.serviciosCloaca", label: "Cloaca" },
                ] as { name: "atributos.serviciosAgua" | "atributos.serviciosLuz" | "atributos.serviciosGas" | "atributos.serviciosCloaca"; label: string }[]
              ).map(({ name, label }) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <PillToggle
                      label={label}
                      active={!!field.value}
                      onClick={() => field.onChange(!field.value)}
                    />
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Precios temporarios */}
        {operacion === "ALQUILER_TEMPORARIO" && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 10, fontWeight: 500 }}>
              Precios temporarios
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 8 }}>
              <WizardField label="Por día" suffix="$" required error={errors.atributos?.precioPorDia?.message}>
                <input {...register("atributos.precioPorDia", { valueAsNumber: true })} type="number" style={{ ...W_INPUT, fontWeight: 700 }} placeholder="0" />
              </WizardField>
              <WizardField label="Por semana" suffix="$">
                <input {...register("atributos.precioSemana", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
              <WizardField label="Por quincena" suffix="$">
                <input {...register("atributos.precioQuincena", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
              <WizardField label="Días mínimos">
                <input {...register("atributos.diasMinimos", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
              <WizardField label="Días máximos">
                <input {...register("atributos.diasMaximos", { valueAsNumber: true })} type="number" style={W_INPUT} placeholder="—" />
              </WizardField>
            </div>
          </div>
        )}

        {/* Custom características */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 8, fontWeight: 500 }}>
            ¿Falta alguna característica?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <WizardField label="">
              <input
                value={nuevaCaract}
                onChange={(e) => setNuevaCaract(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarCustom(); } }}
                style={{ ...W_INPUT, fontSize: 13 }}
                placeholder="Ej: Sótano, Panel solar…"
              />
            </WizardField>
            <button
              type="button"
              onClick={agregarCustom}
              style={{
                padding: "0 16px", background: "var(--brand-primary)", color: "white",
                border: "none", borderRadius: 10, cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0, height: 42,
              }}
            >
              <Plus size={14} />Agregar
            </button>
          </div>
          {soloCustom.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {soloCustom.map((c) => (
                <span
                  key={c}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 999, fontSize: 12,
                    background: "rgba(27,67,50,0.08)", border: "1px solid rgba(27,67,50,0.2)",
                    color: "var(--antracita-700)",
                  }}
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => quitarCustom(c)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", opacity: 0.55 }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── EDIT MODE ────────────────────────────────────────────────────────────
  if (isEdit) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 w-full">

        {/* Información básica */}
        <section className={sec}>
          <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">Información básica</h2>
          <div className="space-y-4">
            <div>
              <label className={lbl}>Título *</label>
              <input {...register("titulo")} className={inp} placeholder="Casa en barrio céntrico..." />
              {errors.titulo && <p className={errS}>{errors.titulo.message}</p>}
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
                {errors.tipo && <p className={errS}>{errors.tipo.message}</p>}
              </div>
              <div>
                <label className={lbl}>Operación *</label>
                <select {...register("operacion")} className={inp}>
                  <option value="">Seleccioná...</option>
                  <option value="VENTA">Venta</option>
                  <option value="ALQUILER">Alquiler</option>
                  <option value="ALQUILER_TEMPORARIO">Alquiler Temporario</option>
                </select>
                {errors.operacion && <p className={errS}>{errors.operacion.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Precio *</label>
                <input {...register("precio", { valueAsNumber: true })} type="number" className={inp} placeholder="0" />
                {errors.precio && <p className={errS}>{errors.precio.message}</p>}
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
              {errors.direccion && <p className={errS}>{errors.direccion.message}</p>}
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
                  <input type="checkbox" checked={!!field.value} onChange={field.onChange} className="w-4 h-4" style={chk} />
                )}
              />
              <span className="text-sm text-text-primary">Publicada en marketplace</span>
            </label>
          </div>
        </section>

        {/* Características */}
        <section className={sec}>
          <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">Características</h2>
          <AnimatePresence initial={false}>
            {campos && (
              <motion.div key={tipo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                <CaracteristicasPanel />
              </motion.div>
            )}
          </AnimatePresence>
          {!campos && (
            <p className="text-sm text-text-muted">Seleccioná el tipo de propiedad para ver las características disponibles.</p>
          )}
        </section>

        {/* Ubicación */}
        <section className={sec}>
          <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">Ubicación en mapa</h2>
          <p className="text-xs text-text-muted mb-4">Hacé clic en el mapa para marcar la ubicación exacta de la propiedad.</p>
          <MapPicker
            lat={lat ?? undefined}
            lon={lon ?? undefined}
            onChange={(la, lo) => { setValue("latitud", la); setValue("longitud", lo); }}
          />
          {lat && lon && (
            <p className="text-xs text-text-muted mt-2">Lat: {lat.toFixed(6)}, Lon: {lon.toFixed(6)}</p>
          )}
          {tipo === "TERRENO" && (
            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm font-medium text-text-primary mb-0.5">Límites del terreno <span className="text-text-muted font-normal">(opcional)</span></p>
              <p className="text-xs text-text-muted mb-3">Dibujá el perímetro del terreno.</p>
              {lat && lon ? (
                <MapaPoligonoEditor lat={lat} lon={lon} initialPolygon={poligonoJson ?? null} onChange={(p) => setValue("poligonoJson", p)} />
              ) : (
                <p className="text-xs text-text-muted py-3 px-4 rounded-xl bg-surface-raised">Marcá primero la ubicación.</p>
              )}
            </div>
          )}
        </section>

        {/* Fotos */}
        <section className={sec}>
          <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">Fotos</h2>
          <FotoUploader value={fotos as FotoData[]} onChange={(f) => setValue("fotos", f)} />
        </section>

        {/* Video */}
        <section className={sec}>
          <h2 className="font-semibold text-text-primary border-b border-border pb-2 mb-4">Video</h2>
          <div>
            <label className={lbl}>URL de YouTube / Vimeo</label>
            <input {...register("videoUrl")} className={inp} placeholder="https://youtube.com/watch?v=..." />
            {errors.videoUrl && <p className={errS}>{errors.videoUrl.message}</p>}
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => router.back()} className="btn-outline">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-terra flex items-center gap-2 px-6 py-2.5">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    );
  }

  // ─── WIZARD MODE (create) ─────────────────────────────────────────────────

  const btnPrimary: React.CSSProperties = {
    height: 44, padding: "0 22px", borderRadius: 12, fontSize: 14, fontWeight: 600,
    background: "var(--brand-primary)", color: "white", border: "none", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 7,
    transition: "opacity 150ms",
  };

  const btnGhost: React.CSSProperties = {
    height: 44, padding: "0 18px", borderRadius: 12, fontSize: 14, fontWeight: 500,
    background: "white", color: "var(--antracita-500)",
    border: "1px solid var(--border)", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 7,
    transition: "all 150ms",
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSubmit as any)} className="w-full">

      {/* Stepper */}
      <StepperBar current={step} />

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Form card ── */}
        <div style={{
          background: "white", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)", padding: 28,
          boxShadow: "var(--shadow-il)",
        }}>
          <AnimatePresence mode="wait">

            {/* ── Step 1: Datos básicos ── */}
            {step === 1 && (
              <StepSlide stepKey={1}>
                <SectionTitle>Datos básicos</SectionTitle>
                <p style={{ fontSize: 13, color: "var(--antracita-400)", marginBottom: 24 }}>
                  Información principal de la propiedad.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Título */}
                  <WizardField label="Título" required error={errors.titulo?.message}>
                    <input {...register("titulo")} style={W_INPUT} placeholder="Ej: Casa 3 dormitorios en barrio céntrico…" />
                  </WizardField>

                  {/* Tipo */}
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 8, fontWeight: 500 }}>
                      Tipo de propiedad <span style={{ color: "var(--terracota-500)" }}>*</span>
                    </div>
                    <Controller
                      control={control}
                      name="tipo"
                      render={({ field }) => (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {[
                            { value: "CASA",         label: "Casa" },
                            { value: "DEPARTAMENTO", label: "Departamento" },
                            { value: "LOCAL",        label: "Local" },
                            { value: "GALPON",       label: "Galpón" },
                            { value: "TERRENO",      label: "Terreno" },
                            { value: "OFICINA",      label: "Oficina" },
                          ].map(({ value, label }) => (
                            <TypePill
                              key={value}
                              label={label}
                              active={field.value === value}
                              onClick={() => field.onChange(value)}
                            />
                          ))}
                        </div>
                      )}
                    />
                    {errors.tipo && <p style={{ fontSize: 11.5, color: "var(--danger-500)", marginTop: 5 }}>{errors.tipo.message}</p>}
                  </div>

                  {/* Operación */}
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 8, fontWeight: 500 }}>
                      Operación <span style={{ color: "var(--terracota-500)" }}>*</span>
                    </div>
                    <Controller
                      control={control}
                      name="operacion"
                      render={({ field }) => (
                        <div style={{ display: "flex", gap: 8 }}>
                          {[
                            { value: "VENTA",               label: "Venta" },
                            { value: "ALQUILER",            label: "Alquiler" },
                            { value: "ALQUILER_TEMPORARIO", label: "Temporario" },
                          ].map(({ value, label }) => (
                            <TypePill
                              key={value}
                              label={label}
                              active={field.value === value}
                              onClick={() => field.onChange(value)}
                            />
                          ))}
                        </div>
                      )}
                    />
                    {errors.operacion && <p style={{ fontSize: 11.5, color: "var(--danger-500)", marginTop: 5 }}>{errors.operacion.message}</p>}
                  </div>

                  {/* Precio + Moneda */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12, alignItems: "start" }}>
                    <WizardField label="Precio" required error={errors.precio?.message}>
                      <input
                        {...register("precio", { valueAsNumber: true })}
                        type="number"
                        style={{ ...W_INPUT, fontSize: 16, fontWeight: 700 }}
                        placeholder="0"
                      />
                    </WizardField>
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 5, fontWeight: 500 }}>Moneda</div>
                      <Controller
                        control={control}
                        name="moneda"
                        render={({ field }) => (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {(["USD", "ARS"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => field.onChange(m)}
                                style={{
                                  height: 42, borderRadius: 8, fontSize: 13, fontFamily: "var(--font-mono)",
                                  background: field.value === m ? "var(--terracota-100)" : "white",
                                  border: field.value === m ? "1.5px solid var(--terracota-300)" : "1.5px solid var(--border)",
                                  color: field.value === m ? "var(--terracota-700)" : "var(--antracita-500)",
                                  fontWeight: field.value === m ? 700 : 500, cursor: "pointer",
                                  transition: "all 150ms",
                                }}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 5, fontWeight: 500 }}>Descripción</div>
                    <textarea
                      {...register("descripcion")}
                      rows={3}
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: "1px solid var(--border)", borderRadius: 10,
                        background: "var(--crema-50)", fontSize: 13,
                        fontFamily: "var(--font-body)", color: "var(--antracita-700)",
                        outline: "none", resize: "vertical",
                      }}
                      placeholder="Describí la propiedad..."
                    />
                  </div>

                  {/* Publicada */}
                  <Controller
                    control={control}
                    name="publicada"
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 16px", borderRadius: 10, width: "100%", textAlign: "left",
                          background: field.value ? "var(--terracota-50)" : "white",
                          border: `1.5px solid ${field.value ? "var(--terracota-300)" : "var(--border)"}`,
                          cursor: "pointer", transition: "all 150ms",
                        }}
                      >
                        <span style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          background: field.value ? "var(--terracota-500)" : "white",
                          border: `1.5px solid ${field.value ? "var(--terracota-500)" : "var(--border-strong)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 150ms",
                        }}>
                          {field.value && <Check size={12} color="white" strokeWidth={2.5} />}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)" }}>
                            Publicar en marketplace
                          </div>
                          <div style={{ fontSize: 11, color: "var(--antracita-400)", marginTop: 1 }}>
                            Visible para compradores e inquilinos en inmolibres.com
                          </div>
                        </div>
                      </button>
                    )}
                  />

                  {/* Asesor asignado — solo ADMIN */}
                  {puedeElegirAsesor && (
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 8, fontWeight: 500 }}>
                        Asesor a cargo
                        <span style={{ fontSize: 10, color: "var(--antracita-300)", fontWeight: 400, marginLeft: 6 }}>
                          — aparece como contacto en la publicación
                        </span>
                      </div>
                      <Controller
                        control={control}
                        name="agenteId"
                        render={({ field }) => (
                          <select
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            style={{
                              width: "100%", height: 46, padding: "0 14px",
                              borderRadius: 10, border: "1.5px solid var(--border)",
                              background: "white", fontSize: 14,
                              color: "var(--antracita-900)", outline: "none",
                              fontFamily: "var(--font-body)", cursor: "pointer",
                            }}
                          >
                            <option value="">A nombre de la inmobiliaria (sin asesor)</option>
                            {agentes.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nombre}{a.rol === "ADMIN" ? " (Admin)" : ""}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </div>
                  )}
                </div>
              </StepSlide>
            )}

            {/* ── Step 2: Ubicación ── */}
            {step === 2 && (
              <StepSlide stepKey={2}>
                <SectionTitle>Ubicación</SectionTitle>
                <p style={{ fontSize: 13, color: "var(--antracita-400)", marginBottom: 24 }}>
                  Indicá la dirección y marcá el punto exacto en el mapa.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <WizardField label="Dirección" required error={errors.direccion?.message}>
                    <input
                      {...register("direccion")}
                      style={W_INPUT}
                      placeholder="Ej: Av. San Martín 450, Paso de los Libres"
                    />
                  </WizardField>

                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginBottom: 8, fontWeight: 500 }}>
                      Ubicación en mapa
                      <span style={{ fontSize: 10, color: "var(--antracita-300)", fontWeight: 400, marginLeft: 6 }}>
                        — hacé clic para marcar
                      </span>
                    </div>
                    <MapPicker
                      lat={lat ?? undefined}
                      lon={lon ?? undefined}
                      onChange={(la, lo) => { setValue("latitud", la); setValue("longitud", lo); }}
                    />
                    {lat && lon && (
                      <p style={{ fontSize: 11, color: "var(--antracita-300)", marginTop: 6 }}>
                        📍 {lat.toFixed(6)}, {lon.toFixed(6)}
                      </p>
                    )}
                  </div>

                  {tipo === "TERRENO" && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--antracita-900)", marginBottom: 4 }}>
                        Límites del terreno
                        <span style={{ fontSize: 11.5, color: "var(--antracita-400)", fontWeight: 400, marginLeft: 6 }}>
                          (opcional)
                        </span>
                      </div>
                      <p style={{ fontSize: 11.5, color: "var(--antracita-400)", marginBottom: 12 }}>
                        Dibujá el perímetro para mostrarlo en el marketplace.
                      </p>
                      {lat && lon ? (
                        <MapaPoligonoEditor
                          lat={lat}
                          lon={lon}
                          initialPolygon={poligonoJson ?? null}
                          onChange={(polygon) => setValue("poligonoJson", polygon)}
                        />
                      ) : (
                        <p style={{ fontSize: 12, color: "var(--antracita-400)", padding: "12px 16px", borderRadius: 10, background: "var(--crema-100)", border: "1px solid var(--border)" }}>
                          Marcá primero la ubicación en el mapa de arriba.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </StepSlide>
            )}

            {/* ── Step 3: Características ── */}
            {step === 3 && (
              <StepSlide stepKey={3}>
                <SectionTitle>Características</SectionTitle>
                <p style={{ fontSize: 13, color: "var(--antracita-400)", marginBottom: 24 }}>
                  Detallá las medidas y comodidades de la propiedad.
                </p>
                {tipo ? (
                  <CaracteristicasPanel />
                ) : (
                  <div style={{ padding: "20px 16px", borderRadius: 10, background: "var(--crema-100)", border: "1px solid var(--border)", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "var(--antracita-400)" }}>
                      Volvé al paso 1 y seleccioná el tipo de propiedad para ver las características disponibles.
                    </p>
                  </div>
                )}
              </StepSlide>
            )}

            {/* ── Step 4: Fotos ── */}
            {step === 4 && (
              <StepSlide stepKey={4}>
                <SectionTitle>Fotos</SectionTitle>
                <p style={{ fontSize: 13, color: "var(--antracita-400)", marginBottom: 24 }}>
                  Agregá hasta 15 fotos. La primera marcada como portada aparece destacada.
                </p>

                <FotoUploader
                  value={fotos as FotoData[]}
                  onChange={(f) => setValue("fotos", f)}
                />

                <div style={{ borderTop: "1px solid var(--border)", marginTop: 24, paddingTop: 20 }}>
                  <WizardField label="Video (YouTube o Vimeo)" error={errors.videoUrl?.message}>
                    <input
                      {...register("videoUrl")}
                      style={{ ...W_INPUT, fontSize: 13 }}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </WizardField>
                </div>
              </StepSlide>
            )}

            {/* ── Step 5: Publicación (review) ── */}
            {step === 5 && (
              <StepSlide stepKey={5}>
                <SectionTitle>Revisión final</SectionTitle>
                <p style={{ fontSize: 13, color: "var(--antracita-400)", marginBottom: 24 }}>
                  Revisá que todo esté correcto antes de publicar.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Título",    value: titulo || "—" },
                    { label: "Tipo",      value: tipo || "—" },
                    { label: "Operación", value: operacion || "—" },
                    { label: "Precio",    value: precio && precio > 0 && moneda ? formatPrice(precio, moneda) : "—" },
                    { label: "Dirección", value: direccion || "—" },
                    { label: "Fotos",     value: `${fotos.length} foto${fotos.length !== 1 ? "s" : ""}` },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "baseline",
                        padding: "11px 16px", borderRadius: 10,
                        background: "var(--crema-50)", border: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--antracita-400)", fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: 13, color: "var(--antracita-900)", fontWeight: 600, fontFamily: label === "Precio" ? "var(--font-mono)" : undefined }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: 20, padding: "14px 16px", borderRadius: 12,
                  background: "var(--success-100)", border: "1px solid rgba(74,124,89,0.3)",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <Check size={16} color="var(--success-500)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success-500)" }}>Lista para publicar</div>
                    <div style={{ fontSize: 11.5, color: "var(--success-500)", marginTop: 2, opacity: 0.85 }}>
                      La propiedad aparecerá en el marketplace inmediatamente.
                    </div>
                  </div>
                </div>
              </StepSlide>
            )}

          </AnimatePresence>
        </div>

        {/* ── Preview panel ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <LivePreviewCard
            titulo={titulo}
            tipo={tipo}
            operacion={operacion}
            precio={precio}
            moneda={moneda}
            direccion={direccion}
            fotos={fotos as { urlCloudinary: string }[]}
            atributos={{
              habitaciones: rawHab ?? null,
              banos: rawBanos ?? null,
              superficieCubierta: rawSupCub ?? null,
              garage: rawGarage ?? null,
            }}
          />
        </div>
      </div>

      {/* ── Footer navigation ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingBottom: 32 }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 1}
          style={{ ...btnGhost, opacity: step === 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} /> Anterior
        </button>

        {step < 5 ? (
          <button type="button" onClick={goNext} style={btnPrimary}>
            Continuar a {STEPS[step].label}
            <ChevronRight size={16} />
          </button>
        ) : (
          <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
            {loading && <Loader2 size={15} className="animate-spin" />}
            Publicar propiedad
            {!loading && <Check size={15} />}
          </button>
        )}
      </div>
    </form>
  );
}
