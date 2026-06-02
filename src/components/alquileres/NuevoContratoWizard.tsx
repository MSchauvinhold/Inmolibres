"use client";

import { useReducer, useCallback, useState, useMemo } from "react";
import { ContactoSelector, type ContactoMinimal } from "./ContactoSelector";
import { toast } from "sonner";
import { X, ChevronLeft, ChevronRight, Loader2, FileText, Home, Calendar, Gavel, Check, Printer } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  buildContratoAlquilerHtml,
  buildContratoVentaHtml,
  printHtml,
} from "@/lib/contrato-pdf";

// ─── Shared types ────────────────────────────────────────────────────────────

export interface WizardConfig {
  colorPrimario: string;
  colorSecundario: string;
  clausulasAdicionales: string | null;
  piePaginaContrato: string | null;
  cuit: string | null;
  razonSocial: string | null;
  domicilioLegal: string | null;
  matriculaCorredora: string | null;
  comisionVendedorPct: number;
  comisionCompradorPct: number;
}

export interface WizardInmobiliaria {
  nombre: string;
  logoUrl: string | null;
  firmaUrl: string | null;
  whatsapp: string;
  email: string;
}

export interface PropiedadItem {
  id: string;
  titulo: string;
  direccion: string;
}

export interface ContratoVentaCreado {
  id: string;
  inmobiliariaId: string;
  propiedadDireccion: string;
  propiedadDescripcion: string | null;
  matriculaInmueble: string | null;
  vendedorNombre: string;
  vendedorDni: string;
  vendedorDomicilio: string | null;
  vendedorEstadoCivil: string;
  vendedorConyuge: string | null;
  compradorNombre: string;
  compradorDni: string;
  compradorDomicilio: string | null;
  compradorEstadoCivil: string;
  compradorConyuge: string | null;
  precioVenta: number;
  moneda: "ARS" | "USD";
  sena: number | null;
  comisionVendedorPct: number;
  comisionCompradorPct: number;
  formaPago: string;
  escribanoNombre: string | null;
  escribanoRegistro: string | null;
  fechaEscritura: string | null;
  clausulas: string | null;
  createdAt: string;
}

export interface ContratoCreado {
  id: string;
  propiedadId: string;
  inmobiliariaId: string;
  inquilinoNombre: string;
  inquilinoTel: string;
  precioMensual: number;
  moneda: "ARS" | "USD";
  diaVencimientoPago: number;
  estadoPago: "AL_DIA" | "ATRASADO";
  fechaInicio: string;
  fechaFin: string;
  createdAt: string;
  propiedad: { id: string; titulo: string; direccion: string };
}

// ─── State / Reducer ─────────────────────────────────────────────────────────

type Tipo = "alquiler" | "compraventa";

interface AlquilerData {
  propiedadId: string;
  locadorNombre: string;
  locadorCuit: string;
  locadorDomicilio: string;
  locadorMatricula: string;
  // Inquilino — se llena desde ContactoSelector
  inquilinoContactoId: string | null;
  inquilinoNombre: string;
  inquilinoTel: string;
  // Garante — se llena desde ContactoSelector
  tieneGarante: boolean;
  garanteContactoId: string | null;
  garanteNombre: string;
  garanteTel: string;
  garanteDomicilio: string;
  precioMensual: string;
  moneda: "ARS" | "USD";
  diaVencimientoPago: number;
  deposito: string;
  clausulas: string;
  fechaInicio: string;
  fechaFin: string;
  // Ajuste periódico
  ajusteActivo: boolean;
  ajusteIndice: "ICL" | "IPC";
  ajusteMeses: number;
  ajusteDia: number;
  // Firma
  tipoFirma: "DIGITAL" | "MANUAL";
}

export interface CompraventaData {
  tipoFirma: "DIGITAL" | "MANUAL";
  // Propiedad opcional del sistema (auto-completa los campos de texto)
  propiedadId: string;
  // Vendedor y comprador — se llenan desde ContactoSelector
  vendedorContactoId: string | null;
  compradorContactoId: string | null;
  propiedadDireccion: string;
  propiedadDescripcion: string;
  matriculaInmueble: string;
  vendedorNombre: string;
  vendedorDni: string;
  vendedorDomicilio: string;
  vendedorEstadoCivil: string;
  vendedorConyuge: string;
  compradorNombre: string;
  compradorDni: string;
  compradorDomicilio: string;
  compradorEstadoCivil: string;
  compradorConyuge: string;
  precioVenta: string;
  moneda: "ARS" | "USD";
  sena: string;
  comisionVendedorPct: string;
  comisionCompradorPct: string;
  formaPago: string;
  escribanoNombre: string;
  escribanoRegistro: string;
  fechaEscritura: string;
  clausulas: string;
}

interface WizardState {
  tipo: Tipo | null;
  paso: number;
  alquiler: AlquilerData;
  compraventa: CompraventaData;
  saving: boolean;
  done: boolean;
  ventaCreada: ContratoVentaCreado | null;
}

type WizardAction =
  | { type: "SET_TIPO"; payload: Tipo }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "UPD_ALQ"; payload: Partial<AlquilerData> }
  | { type: "UPD_CV"; payload: Partial<CompraventaData> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_DONE" }
  | { type: "SET_VENTA_CREADA"; payload: ContratoVentaCreado };

const DEFAULT_CLAUSULAS_ALQ = `PRIMERA — DESTINO: El inmueble será destinado exclusivamente a uso habitacional familiar, quedando prohibida su utilización para cualquier otra actividad.

SEGUNDA — SUBARRENDAMIENTO: El locatario no podrá subarrendar, ceder ni transferir este contrato sin el consentimiento expreso y por escrito del locador.

TERCERA — CONSERVACIÓN: El locatario se compromete a mantener el inmueble en perfectas condiciones de conservación e higiene, realizando las reparaciones locativas a su cargo.

CUARTA — SERVICIOS: Todos los servicios (energía eléctrica, gas, agua corriente, internet, etc.) serán abonados íntegramente por el locatario desde la fecha de inicio del contrato.

QUINTA — DEPÓSITO EN GARANTÍA: Al momento de la firma, el locatario entregará en concepto de depósito en garantía el equivalente a un (1) mes de alquiler, el cual le será devuelto al finalizar el contrato previa verificación del estado del inmueble.

SEXTA — ACTUALIZACIONES: El precio del alquiler será actualizado conforme a la variación del Índice de Contratos de Locación (ICL) publicado por el BCRA, de acuerdo con la Ley N° 27.737 y sus normas reglamentarias.

SÉPTIMA — ENTREGA: A la finalización del contrato, el locatario deberá entregar el inmueble libre de personas y bienes, en las mismas condiciones en que lo recibió, salvo el desgaste normal por el uso.

OCTAVA — DOMICILIOS ESPECIALES: Las partes constituyen domicilios especiales en los indicados en el presente instrumento, donde serán válidas todas las notificaciones judiciales y extrajudiciales.`;

const DEFAULT_CLAUSULAS_CV = `PRIMERA — OBJETO: El VENDEDOR vende y el COMPRADOR compra el inmueble descripto en el presente instrumento, en el estado de uso y conservación en que se encuentra, que el COMPRADOR declara conocer y aceptar, libre de ocupantes y deudas a la fecha de la escrituración.

SEGUNDA — PRECIO Y FORMA DE PAGO: El precio total de la operación es el consignado en las condiciones económicas, que el COMPRADOR abonará en la forma y plazos allí establecidos. La seña entregada se imputa a cuenta del precio total convenido.

TERCERA — SEÑA Y ARRAS: La suma entregada en concepto de seña tendrá el carácter de arras confirmatorias conforme al art. 1059 del Código Civil y Comercial de la Nación. En caso de desistimiento del COMPRADOR, perderá la seña entregada; en caso de desistimiento del VENDEDOR, deberá restituirla duplicada, sin perjuicio de las demás acciones legales que pudieran corresponder.

CUARTA — LIBRE DE GRAVÁMENES: El VENDEDOR garantiza que el inmueble se encuentra libre de hipotecas, embargos, inhibiciones, servidumbres y todo otro gravamen real o personal que pudiera afectarlo, obligándose a mantener dicha condición hasta la firma de la escritura traslativa de dominio.

QUINTA — POSESIÓN: La posesión del inmueble será entregada al COMPRADOR en el acto de la escrituración, salvo acuerdo expreso en contrario que las partes consignen por escrito.

SEXTA — ESCRITURACIÓN: Las partes se comprometen a otorgar la escritura traslativa de dominio en el plazo pactado, ante el escribano designado. Los gastos notariales, impuestos de sellos y demás costos inherentes a la escrituración serán soportados conforme a la ley y los usos de plaza, salvo acuerdo en contrario.

SÉPTIMA — MORA: La mora se producirá de pleno derecho por el solo vencimiento de los plazos convenidos, sin necesidad de interpelación judicial o extrajudicial alguna.

OCTAVA — DOMICILIOS Y JURISDICCIÓN: Las partes constituyen domicilios especiales en los indicados en el presente, donde se tendrán por válidas todas las notificaciones. Para cualquier divergencia se someten a la jurisdicción de los Tribunales Ordinarios de la ciudad de Paso de los Libres, Provincia de Corrientes, renunciando a todo otro fuero o jurisdicción.`;

function mkAlqInit(cfg: WizardConfig | null): AlquilerData {
  const hoy = new Date().toISOString().slice(0, 10);
  const dosAnios = new Date(Date.now() + 730 * 86_400_000).toISOString().slice(0, 10);
  return {
    propiedadId: "",
    locadorNombre: cfg?.razonSocial ?? "",
    locadorCuit: cfg?.cuit ?? "",
    locadorDomicilio: cfg?.domicilioLegal ?? "",
    locadorMatricula: cfg?.matriculaCorredora ?? "",
    inquilinoContactoId: null,
    inquilinoNombre: "",
    inquilinoTel: "",
    tieneGarante: false,
    garanteContactoId: null,
    garanteNombre: "",
    garanteTel: "",
    garanteDomicilio: "",
    precioMensual: "",
    moneda: "ARS",
    diaVencimientoPago: 10,
    deposito: "",
    clausulas: cfg?.clausulasAdicionales ?? DEFAULT_CLAUSULAS_ALQ,
    fechaInicio: hoy,
    fechaFin: dosAnios,
    ajusteActivo: true,
    ajusteIndice: "ICL",
    ajusteMeses: 6,
    ajusteDia: 14,
    tipoFirma: "MANUAL" as const,
  };
}

function mkCvInit(cfg: WizardConfig | null): CompraventaData {
  return {
    tipoFirma: "MANUAL",
    propiedadId: "",
    vendedorContactoId: null,
    compradorContactoId: null,
    propiedadDireccion: "",
    propiedadDescripcion: "",
    matriculaInmueble: "",
    vendedorNombre: cfg?.razonSocial ?? "",
    vendedorDni: cfg?.cuit ?? "",
    vendedorDomicilio: cfg?.domicilioLegal ?? "",
    vendedorEstadoCivil: "soltero",
    vendedorConyuge: "",
    compradorNombre: "",
    compradorDni: "",
    compradorDomicilio: "",
    compradorEstadoCivil: "soltero",
    compradorConyuge: "",
    precioVenta: "",
    moneda: "USD",
    sena: "",
    comisionVendedorPct: String(cfg?.comisionVendedorPct ?? 3),
    comisionCompradorPct: String(cfg?.comisionCompradorPct ?? 3),
    formaPago: "Contado",
    escribanoNombre: "",
    escribanoRegistro: "",
    fechaEscritura: "",
    clausulas: DEFAULT_CLAUSULAS_CV,
  };
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_TIPO": return { ...state, tipo: action.payload, paso: 1 };
    case "NEXT": return { ...state, paso: state.paso + 1 };
    case "PREV": return { ...state, paso: state.paso > 1 ? state.paso - 1 : 0 };
    case "UPD_ALQ": return { ...state, alquiler: { ...state.alquiler, ...action.payload } };
    case "UPD_CV": return { ...state, compraventa: { ...state.compraventa, ...action.payload } };
    case "SET_SAVING": return { ...state, saving: action.payload };
    case "SET_DONE": return { ...state, done: true, saving: false };
    case "SET_VENTA_CREADA": return { ...state, ventaCreada: action.payload };
    default: return state;
  }
}

// ─── UI primitives ───────────────────────────────────────────────────────────

const inp = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#8B4513]/20 focus:border-[#8B4513]";
const inpStyle = { borderColor: "#D4D0CB", background: "#FAFAF8", color: "#1a1a1a" };
const lbl = "block text-xs font-semibold mb-1.5 text-[#3a3a3a]";
const errCls = "text-[11px] text-red-500 mt-1";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
      {error && <p className={errCls}>{error}</p>}
    </div>
  );
}

function SectionHeader({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 rounded-full shrink-0" style={{ background: color }} />
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{children}</p>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{ background: checked ? "#2C2C2C" : "#D4D0CB" }}
        onClick={() => onChange(!checked)}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </div>
      <span className="text-sm text-[#3a3a3a]">{label}</span>
    </label>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

const ALQ_STEPS = ["Inmueble", "Partes", "Condiciones", "Vigencia", "Vista previa"];
const CV_STEPS = ["Inmueble", "Partes", "Condiciones", "Escritura", "Vista previa"];

function StepIndicator({ steps, current, color }: { steps: string[]; current: number; color: string }) {
  return (
    <>
      {/* Desktop: numbered circles with connectors */}
      <div className="hidden sm:flex items-center justify-center px-6 py-4">
        {steps.map((label, i) => {
          const idx = i + 1;
          const done = idx < current;
          const active = idx === current;
          const connectorFilled = idx < current;
          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 56 }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: done || active ? color : "transparent",
                    color: done || active ? "white" : "#B0A898",
                    border: done || active ? "none" : "2px solid #D4D0CB",
                    boxShadow: active ? `0 0 0 4px ${color}22` : "none",
                  }}
                >
                  {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : idx}
                </div>
                <span
                  className="text-[10px] font-semibold whitespace-nowrap"
                  style={{ color: active ? color : done ? "#6a6a6a" : "#B0A898", fontWeight: active ? 700 : 600 }}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="h-px w-10 mx-0.5 mb-5 rounded-full transition-all"
                  style={{ background: connectorFilled ? color : "#D4D0CB" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact text indicator */}
      <div className="sm:hidden flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: color }}
          >
            {current}
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color }}>
              {steps[current - 1]}
            </p>
            <p className="text-[10px] text-[#9a9a9a]">Paso {current} de {steps.length}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i + 1 === current ? 20 : 6,
                background: i + 1 <= current ? color : "#D4D0CB",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Step 0: Type selector ───────────────────────────────────────────────────

function Step0({ onSelect }: { onSelect: (t: Tipo) => void }) {
  return (
    <div className="p-8 space-y-6">
      <div className="text-center space-y-1.5">
        <p className="text-lg font-bold text-[#1a1a1a]">¿Qué tipo de contrato?</p>
        <p className="text-sm text-[#6a6a6a]">Seleccioná el tipo para comenzar el proceso</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect("alquiler")}
          className="group p-6 rounded-2xl border-2 text-left space-y-3 transition-all hover:border-[#2C2C2C] hover:shadow-lg"
          style={{ borderColor: "#E8E5E0", background: "#FAFAF8" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#2C2C2C" }}>
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a] text-sm">Contrato de Alquiler</p>
            <p className="text-xs text-[#6a6a6a] mt-0.5 leading-relaxed">Locación habitacional o comercial. Se registra en el sistema.</p>
          </div>
        </button>
        <button
          onClick={() => onSelect("compraventa")}
          className="group p-6 rounded-2xl border-2 text-left space-y-3 transition-all hover:border-[#2C2C2C] hover:shadow-lg"
          style={{ borderColor: "#E8E5E0", background: "#FAFAF8" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#2C2C2C" }}>
            <Gavel className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a] text-sm">Boleto de Compraventa</p>
            <p className="text-xs text-[#6a6a6a] mt-0.5 leading-relaxed">Compraventa de inmueble. Se registra en el sistema y genera PDF.</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Alquiler steps ──────────────────────────────────────────────────────────

function AlqStep1({
  data, propiedades, color, errs, onChange,
}: {
  data: AlquilerData;
  propiedades: PropiedadItem[];
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<AlquilerData>) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader color={color}>Inmueble locado</SectionHeader>
      <Field label="Propiedad *" error={errs.propiedadId}>
        <select className={inp} style={inpStyle} value={data.propiedadId} onChange={(e) => onChange({ propiedadId: e.target.value })}>
          <option value="">Seleccioná una propiedad...</option>
          {propiedades.map((p) => (
            <option key={p.id} value={p.id}>{p.titulo} — {p.direccion}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function AlqStep2({
  data, color, errs, onChange,
}: {
  data: AlquilerData;
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<AlquilerData>) => void;
}) {
  // Contacto inquilino seleccionado (reconstruido desde los campos del form)
  const inquilinoContacto: ContactoMinimal | null = data.inquilinoContactoId
    ? { id: data.inquilinoContactoId, nombre: data.inquilinoNombre, dni: null, telefono: data.inquilinoTel || null, domicilio: null, estadoCivil: null, email: null }
    : null;

  const garanteContacto: ContactoMinimal | null = data.garanteContactoId
    ? { id: data.garanteContactoId, nombre: data.garanteNombre, dni: null, telefono: data.garanteTel || null, domicilio: data.garanteDomicilio || null, estadoCivil: null, email: null }
    : null;

  function onInquilinoSelect(c: ContactoMinimal | null) {
    onChange({
      inquilinoContactoId: c?.id ?? null,
      inquilinoNombre: c?.nombre ?? "",
      inquilinoTel: c?.telefono ?? "",
    });
  }

  function onGaranteSelect(c: ContactoMinimal | null) {
    onChange({
      garanteContactoId: c?.id ?? null,
      garanteNombre: c?.nombre ?? "",
      garanteTel: c?.telefono ?? "",
      garanteDomicilio: c?.domicilio ?? "",
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Locador (datos de la inmobiliaria — no es un contacto) ── */}
      <div className="space-y-4">
        <SectionHeader color={color}>Locador / Inmobiliaria</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Razón social / Nombre *" error={errs.locadorNombre}>
            <input className={inp} style={inpStyle} value={data.locadorNombre} onChange={(e) => onChange({ locadorNombre: e.target.value })} placeholder="Inmobiliaria SRL" />
          </Field>
          <Field label="CUIT">
            <input className={inp} style={inpStyle} value={data.locadorCuit} onChange={(e) => onChange({ locadorCuit: e.target.value })} placeholder="20-12345678-9" />
          </Field>
          <Field label="Domicilio legal">
            <input className={inp} style={inpStyle} value={data.locadorDomicilio} onChange={(e) => onChange({ locadorDomicilio: e.target.value })} placeholder="Av. San Martín 123" />
          </Field>
          <Field label="Matrícula corredor">
            <input className={inp} style={inpStyle} value={data.locadorMatricula} onChange={(e) => onChange({ locadorMatricula: e.target.value })} placeholder="Nº 1234" />
          </Field>
        </div>
      </div>

      {/* ── Inquilino — selector de contactos ── */}
      <div className="space-y-4">
        <SectionHeader color={color}>Locatario (Inquilino)</SectionHeader>
        <ContactoSelector
          label="Inquilino"
          required
          color={color}
          rolHint="INQUILINO"
          selected={inquilinoContacto}
          onSelect={onInquilinoSelect}
          error={errs.inquilinoNombre ?? errs.inquilinoContactoId}
        />
        {/* Teléfono editable: se pre-llena desde el contacto pero puede corregirse */}
        {data.inquilinoContactoId && (
          <Field label="Teléfono del inquilino *" error={errs.inquilinoTel}>
            <input
              className={inp} style={inpStyle}
              value={data.inquilinoTel}
              onChange={(e) => onChange({ inquilinoTel: e.target.value })}
              placeholder="+54 3772 ..."
            />
          </Field>
        )}
      </div>

      {/* ── Garante — selector de contactos ── */}
      <div className="space-y-4">
        <Toggle checked={data.tieneGarante} onChange={(v) => onChange({ tieneGarante: v, garanteContactoId: null, garanteNombre: "", garanteTel: "", garanteDomicilio: "" })} label="Incluir garante" />
        {data.tieneGarante && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "#F3F1EE" }}>
            <ContactoSelector
              label="Garante"
              color={color}
              selected={garanteContacto}
              onSelect={onGaranteSelect}
              error={errs.garanteNombre}
            />
            {/* Campos editables post-selección */}
            {data.garanteContactoId && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono">
                  <input className={inp} style={inpStyle} value={data.garanteTel} onChange={(e) => onChange({ garanteTel: e.target.value })} placeholder="+54 3772 ..." />
                </Field>
                <Field label="Domicilio">
                  <input className={inp} style={inpStyle} value={data.garanteDomicilio} onChange={(e) => onChange({ garanteDomicilio: e.target.value })} placeholder="Calle 456" />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AlqStep3({
  data, color, errs, onChange,
}: {
  data: AlquilerData;
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<AlquilerData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeader color={color}>Condiciones económicas</SectionHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Canon mensual (alquiler) *" error={errs.precioMensual}>
              <input type="number" min={0} className={inp} style={inpStyle} value={data.precioMensual} onChange={(e) => onChange({ precioMensual: e.target.value })} placeholder={`Monto en ${data.moneda}`} />
            </Field>
          </div>
          <Field label="Moneda">
            <select className={inp} style={inpStyle} value={data.moneda} onChange={(e) => onChange({ moneda: e.target.value as "ARS" | "USD" })}>
              <option value="ARS">ARS $</option>
              <option value="USD">USD U$S</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Depósito en garantía (monto)">
            <input type="number" min={0} className={inp} style={inpStyle} value={data.deposito} onChange={(e) => onChange({ deposito: e.target.value })} placeholder={`Monto en ${data.moneda}`} />
            <p className="text-[11px] text-[#9a9a9a] mt-1">Ingresá el monto en {data.moneda} según corresponda. Suele equivaler a 1 mes de alquiler.</p>
          </Field>
          <Field label="Día de vencimiento del pago">
            <input type="number" min={1} max={28} className={inp} style={inpStyle} value={data.diaVencimientoPago} onChange={(e) => onChange({ diaVencimientoPago: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <div className="space-y-2">
        <SectionHeader color={color}>Cláusulas del contrato</SectionHeader>
        <textarea
          rows={10}
          className={inp + " resize-none font-mono"}
          style={{ ...inpStyle, fontSize: 11, lineHeight: 1.7 }}
          value={data.clausulas}
          onChange={(e) => onChange({ clausulas: e.target.value })}
        />
      </div>
    </div>
  );
}

function calcPrimerAjuste(fechaInicio: string, meses: number, dia: number): string {
  if (!fechaInicio) return "";
  const d = new Date(fechaInicio + "T00:00:00");
  d.setMonth(d.getMonth() + meses);
  // Ajustar al día correcto, sin salirse del mes
  const maxDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, maxDia));
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function AlqStep4({
  data, color, errs, onChange,
}: {
  data: AlquilerData;
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<AlquilerData>) => void;
}) {
  let meses = 0;
  if (data.fechaInicio && data.fechaFin && data.fechaFin > data.fechaInicio) {
    const d1 = new Date(data.fechaInicio + "T00:00:00");
    const d2 = new Date(data.fechaFin + "T00:00:00");
    meses = (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
  }

  const primerAjuste = data.ajusteActivo && data.fechaInicio
    ? calcPrimerAjuste(data.fechaInicio, data.ajusteMeses, data.ajusteDia)
    : null;

  return (
    <div className="space-y-6">
      {/* ── Vigencia ── */}
      <div className="space-y-4">
        <SectionHeader color={color}>Vigencia del contrato</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de inicio *" error={errs.fechaInicio}>
            <input type="date" className={inp} style={inpStyle} value={data.fechaInicio} onChange={(e) => onChange({ fechaInicio: e.target.value })} />
          </Field>
          <Field label="Fecha de fin *" error={errs.fechaFin}>
            <input type="date" className={inp} style={inpStyle} value={data.fechaFin} onChange={(e) => onChange({ fechaFin: e.target.value })} />
          </Field>
        </div>
        {meses > 0 && (
          <div className="text-center py-3 rounded-xl" style={{ background: "#F3F1EE" }}>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{meses}</p>
            <p className="text-xs text-[#6a6a6a] mt-0.5">meses de duración</p>
          </div>
        )}
        {errs.fechaFin && <p className={errCls}>{errs.fechaFin}</p>}
      </div>

      {/* ── Ajuste periódico ── */}
      <div className="space-y-4">
        <SectionHeader color={color}>Ajuste automático de precio</SectionHeader>

        <Toggle
          checked={data.ajusteActivo}
          onChange={(v) => onChange({ ajusteActivo: v })}
          label="Activar ajuste periódico según índice oficial"
        />

        {data.ajusteActivo && (
          <div
            className="rounded-xl p-4 space-y-4"
            style={{ background: "#F7F5F2", border: "1px solid #E8E5E0" }}
          >
            {/* Índice */}
            <Field label="Índice de actualización">
              <div className="grid grid-cols-2 gap-2">
                {(["ICL", "IPC"] as const).map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange({ ajusteIndice: idx })}
                    className="rounded-xl p-3 text-left transition-all border-2"
                    style={{
                      borderColor: data.ajusteIndice === idx ? color : "#D4D0CB",
                      background: data.ajusteIndice === idx ? `${color}10` : "white",
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: data.ajusteIndice === idx ? color : "#3a3a3a" }}>
                      {idx === "ICL" ? "ICL — BCRA" : "IPC — INDEC"}
                    </p>
                    <p className="text-[10px] text-[#7a7a7a] mt-0.5 leading-relaxed">
                      {idx === "ICL"
                        ? "Índice de Contratos de Locación. Obligatorio por Ley 27.737."
                        : "Índice de Precios al Consumidor. Para contratos en dólares o acuerdo de partes."}
                    </p>
                  </button>
                ))}
              </div>
            </Field>

            {/* Frecuencia + Día */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Frecuencia del ajuste">
                <select
                  className={inp}
                  style={inpStyle}
                  value={data.ajusteMeses}
                  onChange={(e) => onChange({ ajusteMeses: Number(e.target.value) })}
                >
                  <option value={1}>Cada 1 mes</option>
                  <option value={2}>Cada 2 meses</option>
                  <option value={3}>Cada 3 meses</option>
                  <option value={6}>Cada 6 meses</option>
                  <option value={12}>Cada 12 meses</option>
                </select>
              </Field>
              <Field label="Día del mes del ajuste">
                <input
                  type="number"
                  min={1}
                  max={28}
                  className={inp}
                  style={inpStyle}
                  value={data.ajusteDia}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(28, Number(e.target.value)));
                    onChange({ ajusteDia: v });
                  }}
                />
              </Field>
            </div>

            {/* Info: primer ajuste estimado */}
            {primerAjuste && (
              <div
                className="flex items-start gap-2.5 rounded-lg p-3"
                style={{ background: `${color}0D`, border: `1px solid ${color}30` }}
              >
                <Calendar className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                <div>
                  <p className="text-[11px] font-semibold" style={{ color }}>
                    Primer ajuste estimado
                  </p>
                  <p className="text-xs text-[#5a5a5a] mt-0.5">
                    {primerAjuste} — el sistema lo avisará con anticipación para que confirmes el nuevo valor.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {!data.ajusteActivo && (
          <p className="text-xs text-[#9a9a9a]">
            Sin ajuste automático. El precio se mantendrá fijo durante toda la vigencia del contrato.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Compraventa steps ───────────────────────────────────────────────────────

function CvStep1({
  data, propiedades, color, errs, onChange,
}: {
  data: CompraventaData;
  propiedades: PropiedadItem[];
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<CompraventaData>) => void;
}) {
  function onSelectPropiedad(id: string) {
    if (!id) {
      onChange({ propiedadId: "" });
      return;
    }
    const p = propiedades.find((x) => x.id === id);
    if (!p) return;
    // Auto-completar los campos de texto desde la propiedad elegida (editables)
    onChange({
      propiedadId: id,
      propiedadDireccion: p.direccion,
      propiedadDescripcion: p.titulo,
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeader color={color}>Datos del inmueble</SectionHeader>

      <Field label="Elegir propiedad del sistema (opcional)">
        <select className={inp} style={inpStyle} value={data.propiedadId} onChange={(e) => onSelectPropiedad(e.target.value)}>
          <option value="">— Cargar manualmente —</option>
          {propiedades.map((p) => (
            <option key={p.id} value={p.id}>{p.titulo} — {p.direccion}</option>
          ))}
        </select>
      </Field>

      <Field label="Dirección *" error={errs.propiedadDireccion}>
        <input className={inp} style={inpStyle} value={data.propiedadDireccion} onChange={(e) => onChange({ propiedadDireccion: e.target.value })} placeholder="Calle 123, Paso de los Libres" />
      </Field>
      <Field label="Descripción / Nomenclatura catastral">
        <input className={inp} style={inpStyle} value={data.propiedadDescripcion} onChange={(e) => onChange({ propiedadDescripcion: e.target.value })} placeholder="Casa 3 ambientes, planta baja..." />
      </Field>
      <Field label="Matrícula de dominio / Partida registral">
        <input className={inp} style={inpStyle} value={data.matriculaInmueble} onChange={(e) => onChange({ matriculaInmueble: e.target.value })} placeholder="Matrícula Nº ..." />
      </Field>
    </div>
  );
}

const ESTADO_CIVIL_OPTS = [
  { value: "soltero", label: "Soltero/a" },
  { value: "casado", label: "Casado/a" },
  { value: "divorciado", label: "Divorciado/a" },
  { value: "viudo", label: "Viudo/a" },
];

function CvStep2({
  data, color, errs, onChange,
}: {
  data: CompraventaData;
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<CompraventaData>) => void;
}) {
  const vendedorContacto: ContactoMinimal | null = data.vendedorContactoId
    ? { id: data.vendedorContactoId, nombre: data.vendedorNombre, dni: data.vendedorDni || null, telefono: null, domicilio: data.vendedorDomicilio || null, estadoCivil: data.vendedorEstadoCivil || null, email: null }
    : null;

  const compradorContacto: ContactoMinimal | null = data.compradorContactoId
    ? { id: data.compradorContactoId, nombre: data.compradorNombre, dni: data.compradorDni || null, telefono: null, domicilio: data.compradorDomicilio || null, estadoCivil: data.compradorEstadoCivil || null, email: null }
    : null;

  function onVendedorSelect(c: ContactoMinimal | null) {
    onChange({
      vendedorContactoId: c?.id ?? null,
      vendedorNombre: c?.nombre ?? "",
      vendedorDni: c?.dni ?? "",
      vendedorDomicilio: c?.domicilio ?? "",
      vendedorEstadoCivil: c?.estadoCivil ?? "soltero",
    });
  }

  function onCompradorSelect(c: ContactoMinimal | null) {
    onChange({
      compradorContactoId: c?.id ?? null,
      compradorNombre: c?.nombre ?? "",
      compradorDni: c?.dni ?? "",
      compradorDomicilio: c?.domicilio ?? "",
      compradorEstadoCivil: c?.estadoCivil ?? "soltero",
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Vendedor ── */}
      <div className="space-y-4">
        <SectionHeader color={color}>Vendedor</SectionHeader>
        <ContactoSelector
          label="Vendedor / Propietario"
          required
          color={color}
          rolHint="PROPIETARIO"
          selected={vendedorContacto}
          onSelect={onVendedorSelect}
          error={errs.vendedorNombre}
        />
        {/* Campos editables para corregir/completar datos del contacto */}
        {data.vendedorContactoId && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field label="DNI / CUIT *" error={errs.vendedorDni}>
              <input className={inp} style={inpStyle} value={data.vendedorDni} onChange={(e) => onChange({ vendedorDni: e.target.value })} placeholder="12.345.678" />
            </Field>
            <Field label="Estado civil">
              <select className={inp} style={inpStyle} value={data.vendedorEstadoCivil} onChange={(e) => onChange({ vendedorEstadoCivil: e.target.value })}>
                {ESTADO_CIVIL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Domicilio">
                <input className={inp} style={inpStyle} value={data.vendedorDomicilio} onChange={(e) => onChange({ vendedorDomicilio: e.target.value })} placeholder="Calle 123" />
              </Field>
            </div>
            {data.vendedorEstadoCivil === "casado" && (
              <div className="col-span-2">
                <Field label="Cónyuge">
                  <input className={inp} style={inpStyle} value={data.vendedorConyuge} onChange={(e) => onChange({ vendedorConyuge: e.target.value })} placeholder="Nombre del cónyuge" />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Comprador ── */}
      <div className="space-y-4">
        <SectionHeader color={color}>Comprador</SectionHeader>
        <ContactoSelector
          label="Comprador"
          required
          color={color}
          rolHint="COMPRADOR"
          selected={compradorContacto}
          onSelect={onCompradorSelect}
          error={errs.compradorNombre}
        />
        {data.compradorContactoId && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field label="DNI / CUIT *" error={errs.compradorDni}>
              <input className={inp} style={inpStyle} value={data.compradorDni} onChange={(e) => onChange({ compradorDni: e.target.value })} placeholder="12.345.678" />
            </Field>
            <Field label="Estado civil">
              <select className={inp} style={inpStyle} value={data.compradorEstadoCivil} onChange={(e) => onChange({ compradorEstadoCivil: e.target.value })}>
                {ESTADO_CIVIL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Domicilio">
                <input className={inp} style={inpStyle} value={data.compradorDomicilio} onChange={(e) => onChange({ compradorDomicilio: e.target.value })} placeholder="Calle 456" />
              </Field>
            </div>
            {data.compradorEstadoCivil === "casado" && (
              <div className="col-span-2">
                <Field label="Cónyuge">
                  <input className={inp} style={inpStyle} value={data.compradorConyuge} onChange={(e) => onChange({ compradorConyuge: e.target.value })} placeholder="Nombre del cónyuge" />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CvStep3({
  data, color, errs, onChange,
}: {
  data: CompraventaData;
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<CompraventaData>) => void;
}) {
  const precio = Number(data.precioVenta) || 0;
  const sena = Number(data.sena) || 0;
  const comV = (Number(data.comisionVendedorPct) || 0) / 100;
  const comC = (Number(data.comisionCompradorPct) || 0) / 100;
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeader color={color}>Precio de venta</SectionHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Precio acordado *" error={errs.precioVenta}>
              <input type="number" min={0} className={inp} style={inpStyle} value={data.precioVenta} onChange={(e) => onChange({ precioVenta: e.target.value })} placeholder="0" />
            </Field>
          </div>
          <Field label="Moneda">
            <select className={inp} style={inpStyle} value={data.moneda} onChange={(e) => onChange({ moneda: e.target.value as "ARS" | "USD" })}>
              <option value="USD">USD U$S</option>
              <option value="ARS">ARS $</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seña / Reserva" error={errs.sena}>
            <input type="number" min={0} className={inp} style={inpStyle} value={data.sena} onChange={(e) => onChange({ sena: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Forma de pago">
            <select className={inp} style={inpStyle} value={data.formaPago} onChange={(e) => onChange({ formaPago: e.target.value })}>
              <option value="Contado">Contado</option>
              <option value="Crédito hipotecario">Crédito hipotecario</option>
              <option value="Cuotas">Cuotas</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader color={color}>Comisiones de la inmobiliaria</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="% Comisión vendedor">
            <input type="number" min={0} max={20} step={0.5} className={inp} style={inpStyle} value={data.comisionVendedorPct} onChange={(e) => onChange({ comisionVendedorPct: e.target.value })} />
          </Field>
          <Field label="% Comisión comprador">
            <input type="number" min={0} max={20} step={0.5} className={inp} style={inpStyle} value={data.comisionCompradorPct} onChange={(e) => onChange({ comisionCompradorPct: e.target.value })} />
          </Field>
        </div>
        {precio > 0 && (
          <div className="grid grid-cols-3 gap-2 p-4 rounded-xl" style={{ background: "#F3F1EE" }}>
            <div className="text-center">
              <p className="text-[10px] text-[#6a6a6a] uppercase font-semibold">Precio</p>
              <p className="font-bold text-sm tabular-nums mt-0.5">{formatPrice(precio, data.moneda)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-[#6a6a6a] uppercase font-semibold">Com. vendedor</p>
              <p className="font-bold text-sm tabular-nums mt-0.5" style={{ color }}>{formatPrice(precio * comV, data.moneda)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-[#6a6a6a] uppercase font-semibold">Com. comprador</p>
              <p className="font-bold text-sm tabular-nums mt-0.5" style={{ color }}>{formatPrice(precio * comC, data.moneda)}</p>
            </div>
            {sena > 0 && (
              <div className="col-span-3 text-center border-t pt-2 mt-1" style={{ borderColor: "#D4D0CB" }}>
                <p className="text-[10px] text-[#6a6a6a]">Seña: <span className="font-bold text-[#1a1a1a]">{formatPrice(sena, data.moneda)}</span> ({((sena / precio) * 100).toFixed(1)}% del precio)</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <SectionHeader color={color}>Cláusulas del boleto</SectionHeader>
        <textarea rows={8} className={inp + " resize-none font-mono"} style={{ ...inpStyle, fontSize: 11, lineHeight: 1.7 }} value={data.clausulas} onChange={(e) => onChange({ clausulas: e.target.value })} />
      </div>
    </div>
  );
}

function CvStep4({
  data, color, errs, onChange,
}: {
  data: CompraventaData;
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<CompraventaData>) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader color={color}>Escribanía y cierre</SectionHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Escribano designado">
          <input className={inp} style={inpStyle} value={data.escribanoNombre} onChange={(e) => onChange({ escribanoNombre: e.target.value })} placeholder="Dr. Juan López" />
        </Field>
        <Field label="Registro notarial Nº">
          <input className={inp} style={inpStyle} value={data.escribanoRegistro} onChange={(e) => onChange({ escribanoRegistro: e.target.value })} placeholder="Registro 15" />
        </Field>
        <div className="col-span-2">
          <Field label="Fecha tentativa de escrituración" error={errs.fechaEscritura}>
            <input type="date" className={inp} style={inpStyle} value={data.fechaEscritura} onChange={(e) => onChange({ fechaEscritura: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="p-4 rounded-xl space-y-2" style={{ background: "#F7F5F2", border: "1px solid #E8E5E0" }}>
        <p className="text-xs font-semibold text-[#3a3a3a]">Todo listo para generar el boleto</p>
        <p className="text-xs text-[#6a6a6a] leading-relaxed">Al confirmar se generará el documento en pantalla. Podés imprimirlo o guardarlo como PDF desde el navegador.</p>
      </div>
    </div>
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateAlq(paso: number, data: AlquilerData): Record<string, string> {
  const e: Record<string, string> = {};
  if (paso === 1) {
    if (!data.propiedadId) e.propiedadId = "Seleccioná una propiedad";
  }
  if (paso === 2) {
    if (!data.locadorNombre.trim()) e.locadorNombre = "Requerido";
    if (!data.inquilinoContactoId)  e.inquilinoNombre = "Seleccioná o creá el inquilino";
    else if (!data.inquilinoTel.trim() || data.inquilinoTel.length < 7) e.inquilinoTel = "Teléfono inválido";
    if (data.tieneGarante && !data.garanteContactoId) e.garanteNombre = "Seleccioná o creá el garante";
  }
  if (paso === 3) {
    if (!data.precioMensual || Number(data.precioMensual) <= 0) e.precioMensual = "Ingresá el precio";
  }
  if (paso === 4) {
    if (!data.fechaInicio) e.fechaInicio = "Requerida";
    if (!data.fechaFin) e.fechaFin = "Requerida";
    if (data.fechaInicio && data.fechaFin && data.fechaFin <= data.fechaInicio) e.fechaFin = "Debe ser posterior al inicio";
  }
  return e;
}

function validateCv(paso: number, data: CompraventaData): Record<string, string> {
  const e: Record<string, string> = {};
  if (paso === 1) {
    if (!data.propiedadDireccion.trim()) e.propiedadDireccion = "Requerida";
  }
  if (paso === 2) {
    if (!data.vendedorContactoId)      e.vendedorNombre  = "Seleccioná o creá el vendedor";
    else if (!data.vendedorDni.trim()) e.vendedorDni     = "El DNI/CUIT es requerido";
    if (!data.compradorContactoId)     e.compradorNombre = "Seleccioná o creá el comprador";
    else if (!data.compradorDni.trim()) e.compradorDni   = "El DNI/CUIT es requerido";
  }
  if (paso === 3) {
    if (!data.precioVenta || Number(data.precioVenta) <= 0) e.precioVenta = "Ingresá el precio";
  }
  return e;
}


function printAlquiler(
  contrato: ContratoCreado,
  clausulasOverride: string,
  tipoFirma: "DIGITAL" | "MANUAL",
  cfg: WizardConfig | null,
  inmob: WizardInmobiliaria | null,
) {
  const html = buildContratoAlquilerHtml(
    {
      id: contrato.id,
      inquilinoNombre: contrato.inquilinoNombre,
      inquilinoTel:    contrato.inquilinoTel,
      precioMensual:   contrato.precioMensual,
      moneda:          contrato.moneda,
      diaVencimientoPago: contrato.diaVencimientoPago,
      fechaInicio:     contrato.fechaInicio,
      fechaFin:        contrato.fechaFin,
      propiedad:       contrato.propiedad,
      tipoFirma,
      clausulasOverride,
    },
    cfg,
    inmob,
  );
  printHtml(html, () => toast.error("Habilitá las ventanas emergentes para imprimir"));
}

// Construye el HTML completo del boleto (reutilizable: preview en pantalla + impresión)
export function printCompraventa(
  venta: ContratoVentaCreado,
  tipoFirma: "DIGITAL" | "MANUAL",
  cfg: WizardConfig | null,
  inmob: WizardInmobiliaria | null,
) {
  const html = buildContratoVentaHtml(
    {
      id: venta.id,
      vendedorNombre:      venta.vendedorNombre,
      vendedorDni:         venta.vendedorDni,
      vendedorDomicilio:   venta.vendedorDomicilio ?? null,
      compradorNombre:     venta.compradorNombre,
      compradorDni:        venta.compradorDni,
      compradorDomicilio:  venta.compradorDomicilio ?? null,
      propiedadDireccion:  venta.propiedadDireccion,
      propiedadDescripcion: venta.propiedadDescripcion ?? null,
      matriculaInmueble:   venta.matriculaInmueble ?? null,
      precioVenta:         venta.precioVenta,
      moneda:              venta.moneda,
      sena:                venta.sena ?? null,
      comisionVendedorPct: venta.comisionVendedorPct,
      comisionCompradorPct: venta.comisionCompradorPct,
      formaPago:           venta.formaPago,
      escribanoNombre:     venta.escribanoNombre ?? null,
      escribanoRegistro:   venta.escribanoRegistro ?? null,
      fechaEscritura:      venta.fechaEscritura ?? null,
      clausulas:           venta.clausulas ?? null,
      tipoFirma,
    },
    cfg,
    inmob,
  );
  printHtml(html, () => toast.error("Habilitá las ventanas emergentes para imprimir"));
}

// ─── Selector de tipo de firma (reutilizable en ambos previews) ──────────────

function SelectorTipoFirma({
  tipoFirma, firmaUrl, color,
  onChange,
}: {
  tipoFirma: "DIGITAL" | "MANUAL";
  firmaUrl: string | null | undefined;
  color: string;
  onChange: (t: "DIGITAL" | "MANUAL") => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>¿Cómo querés firmar este contrato?</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Firma digital */}
        <button
          type="button"
          onClick={() => onChange("DIGITAL")}
          className="p-3 rounded-xl text-left transition-all border-2"
          style={{
            borderColor: tipoFirma === "DIGITAL" ? color : "#D4D0CB",
            background: tipoFirma === "DIGITAL" ? `${color}10` : "white",
          }}
        >
          <p className="text-xs font-bold" style={{ color: tipoFirma === "DIGITAL" ? color : "#3a3a3a" }}>Firma digital</p>
          <p className="text-[10px] text-[#7a7a7a] mt-1 leading-relaxed">
            Se inserta automáticamente tu firma guardada en el documento.
          </p>
          {!firmaUrl && (
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: "#DC2626" }}>
              ⚠️ No tenés firma guardada. Configurala en Configuración → Firma digital.
            </p>
          )}
          {firmaUrl && (
            <img src={firmaUrl} alt="Tu firma" className="h-8 mt-2 object-contain" style={{ maxWidth: 120 }} />
          )}
        </button>

        {/* Manual */}
        <button
          type="button"
          onClick={() => onChange("MANUAL")}
          className="p-3 rounded-xl text-left transition-all border-2"
          style={{
            borderColor: tipoFirma === "MANUAL" ? color : "#D4D0CB",
            background: tipoFirma === "MANUAL" ? `${color}10` : "white",
          }}
        >
          <p className="text-xs font-bold" style={{ color: tipoFirma === "MANUAL" ? color : "#3a3a3a" }}>Imprimir y firmar a mano</p>
          <p className="text-[10px] text-[#7a7a7a] mt-1 leading-relaxed">
            El documento se genera sin firma. Lo imprimís y firmás con todas las partes.
          </p>
        </button>
      </div>

      {/* Aviso si elige digital */}
      {tipoFirma === "DIGITAL" && (
        <div className="rounded-xl p-3" style={{ background: "#FFFBEB", borderLeft: "4px solid #D4A853" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "#78350F" }}>
            <strong style={{ color: "#92400E" }}>Nota:</strong>{" "}
            Esta es una firma electrónica (imagen de tu firma), no una firma digital certificada por AFIP (Ley 25.506).
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Paso de previsualización (compraventa) ──────────────────────────────────
function CvPreview({
  data, cfg, inmob, color, onChange,
}: {
  data: CompraventaData;
  cfg: WizardConfig | null;
  inmob: WizardInmobiliaria | null;
  color: string;
  onChange: (p: Partial<CompraventaData>) => void;
}) {
  // El HTML se recalcula cuando cambian los datos (incluidas las cláusulas editadas)
  const html = useMemo(() => buildContratoVentaHtml(
    {
      id: "PREV",
      vendedorNombre:      data.vendedorNombre,
      vendedorDni:         data.vendedorDni,
      vendedorDomicilio:   data.vendedorDomicilio || null,
      compradorNombre:     data.compradorNombre,
      compradorDni:        data.compradorDni,
      compradorDomicilio:  data.compradorDomicilio || null,
      propiedadDireccion:  data.propiedadDireccion,
      propiedadDescripcion: data.propiedadDescripcion || null,
      matriculaInmueble:   data.matriculaInmueble || null,
      precioVenta:         Number(data.precioVenta) || 0,
      moneda:              data.moneda,
      sena:                data.sena ? Number(data.sena) : null,
      comisionVendedorPct: Number(data.comisionVendedorPct) || 0,
      comisionCompradorPct: Number(data.comisionCompradorPct) || 0,
      formaPago:           data.formaPago,
      escribanoNombre:     data.escribanoNombre || null,
      escribanoRegistro:   data.escribanoRegistro || null,
      fechaEscritura:      data.fechaEscritura || null,
      clausulas:           data.clausulas,
      tipoFirma:           data.tipoFirma,
    },
    cfg, inmob,
  ), [data, cfg, inmob]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-bold text-[#1a1a1a]">Vista previa del documento</p>
        <p className="text-sm text-[#6a6a6a]">
          Así se verá el boleto al imprimirlo. Podés ajustar las cláusulas abajo — el resto de los datos se editan volviendo atrás.
        </p>
      </div>

      {/* Selector de firma */}
      <SelectorTipoFirma
        tipoFirma={data.tipoFirma}
        firmaUrl={inmob?.firmaUrl}
        color={color}
        onChange={(t) => onChange({ tipoFirma: t })}
      />

      {/* Previsualización del documento real */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{ borderColor: "#D4D0CB", background: "#fff" }}
      >
        <iframe
          title="Previsualización del boleto"
          srcDoc={html}
          style={{ width: "100%", height: 420, border: "none", display: "block" }}
        />
      </div>

      {/* Editor de cláusulas */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 text-[#3a3a3a]">
          Cláusulas y condiciones
          <span className="font-normal text-[#9a9a9a]"> — editá libremente, se reflejan arriba</span>
        </label>
        <textarea
          value={data.clausulas}
          onChange={(e) => onChange({ clausulas: e.target.value })}
          rows={10}
          className="w-full rounded-xl border px-3 py-2.5 text-xs outline-none transition-colors leading-relaxed"
          style={{ borderColor: "#D4D0CB", background: "#FAFAF8", color: "#1a1a1a", fontFamily: "Georgia, serif" }}
          placeholder="Cláusulas del boleto..."
        />
        <button
          type="button"
          onClick={() => onChange({ clausulas: DEFAULT_CLAUSULAS_CV })}
          className="mt-1.5 text-xs font-medium hover:underline"
          style={{ color }}
        >
          Restaurar cláusulas estándar
        </button>
      </div>
    </div>
  );
}

// ─── Paso de previsualización (alquiler) ─────────────────────────────────────
function AlqPreview({
  data, propiedades, cfg, inmob, color, onChange,
}: {
  data: AlquilerData;
  propiedades: PropiedadItem[];
  cfg: WizardConfig | null;
  inmob: WizardInmobiliaria | null;
  color: string;
  onChange: (p: Partial<AlquilerData>) => void;
}) {
  const prop = propiedades.find((p) => p.id === data.propiedadId);
  const html = useMemo(
    () => buildContratoAlquilerHtml(
      {
        id: "PREV",
        inquilinoNombre:    data.inquilinoNombre || "—",
        inquilinoTel:       data.inquilinoTel || "—",
        precioMensual:      Number(data.precioMensual) || 0,
        moneda:             data.moneda,
        diaVencimientoPago: data.diaVencimientoPago,
        fechaInicio:        data.fechaInicio,
        fechaFin:           data.fechaFin,
        ajusteActivo:       data.ajusteActivo,
        ajusteIndice:       data.ajusteIndice,
        ajusteMeses:        data.ajusteMeses,
        tipoFirma:          data.tipoFirma,
        propiedad:          prop ?? { titulo: "—", direccion: "—" },
        clausulasOverride:  data.clausulas,
      },
      cfg, inmob,
    ),
    [data, prop, cfg, inmob]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-bold text-[#1a1a1a]">Vista previa del documento</p>
        <p className="text-sm text-[#6a6a6a]">
          Así se verá el contrato al imprimirlo. Podés ajustar las cláusulas abajo — el resto de los datos se editan volviendo atrás.
        </p>
      </div>

      {/* Selector de firma */}
      <SelectorTipoFirma
        tipoFirma={data.tipoFirma}
        firmaUrl={inmob?.firmaUrl}
        color={color}
        onChange={(t) => onChange({ tipoFirma: t })}
      />

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#D4D0CB", background: "#fff" }}>
        <iframe
          title="Previsualización del contrato"
          srcDoc={html}
          style={{ width: "100%", height: 420, border: "none", display: "block" }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5 text-[#3a3a3a]">
          Cláusulas y condiciones
          <span className="font-normal text-[#9a9a9a]"> — editá libremente, se reflejan arriba</span>
        </label>
        <textarea
          value={data.clausulas}
          onChange={(e) => onChange({ clausulas: e.target.value })}
          rows={10}
          className="w-full rounded-xl border px-3 py-2.5 text-xs outline-none transition-colors leading-relaxed"
          style={{ borderColor: "#D4D0CB", background: "#FAFAF8", color: "#1a1a1a", fontFamily: "Georgia, serif" }}
          placeholder="Cláusulas del contrato..."
        />
        <button
          type="button"
          onClick={() => onChange({ clausulas: cfg?.clausulasAdicionales ?? DEFAULT_CLAUSULAS_ALQ })}
          className="mt-1.5 text-xs font-medium hover:underline"
          style={{ color }}
        >
          Restaurar cláusulas estándar
        </button>
      </div>
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export function NuevoContratoWizard({
  propiedades, config, inmobiliaria, onClose, onCreated, onVentaCreated,
}: {
  propiedades: PropiedadItem[];
  config: WizardConfig | null;
  inmobiliaria: WizardInmobiliaria | null;
  onClose: () => void;
  onCreated: (c: ContratoCreado) => void;
  onVentaCreated?: (v: ContratoVentaCreado) => void;
}) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    tipo: null,
    paso: 0,
    alquiler: mkAlqInit(config),
    compraventa: mkCvInit(config),
    saving: false,
    done: false,
    ventaCreada: null,
  }));
  const [errs, setErrs] = useState<Record<string, string>>({});

  const { tipo, paso, alquiler, compraventa, saving, done, ventaCreada } = state;
  // El wizard usa un gris carbón neutro (no el verde de marca) para los pasos.
  const color = "#2C2C2C";
  const steps = tipo === "compraventa" ? CV_STEPS : ALQ_STEPS;
  const totalPasos = 5;

  const updAlq = useCallback((p: Partial<AlquilerData>) => dispatch({ type: "UPD_ALQ", payload: p }), []);
  const updCv = useCallback((p: Partial<CompraventaData>) => dispatch({ type: "UPD_CV", payload: p }), []);

  function handleNext() {
    const newErrs = tipo === "alquiler" ? validateAlq(paso, alquiler) : validateCv(paso, compraventa);
    if (Object.keys(newErrs).length > 0) { setErrs(newErrs); return; }
    setErrs({});
    if (paso < totalPasos) { dispatch({ type: "NEXT" }); return; }
    // Last step submit
    if (tipo === "alquiler") submitAlquiler();
    else submitCompraventa();
  }

  async function submitAlquiler() {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const res = await fetch("/api/alquileres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propiedadId: alquiler.propiedadId,
          inquilinoNombre: alquiler.inquilinoNombre,
          inquilinoTel: alquiler.inquilinoTel,
          precioMensual: Number(alquiler.precioMensual),
          moneda: alquiler.moneda,
          diaVencimientoPago: alquiler.diaVencimientoPago,
          fechaInicio: alquiler.fechaInicio,
          fechaFin: alquiler.fechaFin,
          ajusteActivo: alquiler.ajusteActivo,
          ajusteIndice: alquiler.ajusteIndice,
          ajusteMeses: alquiler.ajusteMeses,
          ajusteDia: alquiler.ajusteDia,
          tipoFirma: alquiler.tipoFirma,
          inquilinoContactoId: alquiler.inquilinoContactoId ?? null,
          garanteContactoId:   alquiler.garanteContactoId ?? null,
        }),
      });
      const json = await res.json() as { data?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al crear");
      const d = json.data!;
      const contratoCreado: ContratoCreado = {
        id: d.id as string,
        propiedadId: d.propiedadId as string,
        inmobiliariaId: d.inmobiliariaId as string,
        inquilinoNombre: d.inquilinoNombre as string,
        inquilinoTel: d.inquilinoTel as string,
        precioMensual: Number(d.precioMensual),
        moneda: d.moneda as "ARS" | "USD",
        diaVencimientoPago: d.diaVencimientoPago as number,
        estadoPago: "AL_DIA",
        fechaInicio: (d.fechaInicio as string).slice(0, 10),
        fechaFin: (d.fechaFin as string).slice(0, 10),
        createdAt: d.createdAt as string,
        propiedad: d.propiedad as ContratoCreado["propiedad"],
      };
      dispatch({ type: "SET_DONE" });
      // Print con el formato del CRM usando los datos guardados en DB
      setTimeout(() => printAlquiler(contratoCreado, alquiler.clausulas, alquiler.tipoFirma, config, inmobiliaria), 200);
      onCreated(contratoCreado);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }

  async function submitCompraventa() {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const res = await fetch("/api/contratos-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoFirma:            compraventa.tipoFirma,
          vendedorContactoId:   compraventa.vendedorContactoId ?? null,
          compradorContactoId:  compraventa.compradorContactoId ?? null,
          propiedadDireccion:   compraventa.propiedadDireccion,
          propiedadDescripcion: compraventa.propiedadDescripcion || undefined,
          matriculaInmueble:    compraventa.matriculaInmueble || undefined,
          vendedorNombre:       compraventa.vendedorNombre,
          vendedorDni:          compraventa.vendedorDni,
          vendedorDomicilio:    compraventa.vendedorDomicilio || undefined,
          vendedorEstadoCivil:  compraventa.vendedorEstadoCivil,
          vendedorConyuge:      compraventa.vendedorConyuge || undefined,
          compradorNombre:      compraventa.compradorNombre,
          compradorDni:         compraventa.compradorDni,
          compradorDomicilio:   compraventa.compradorDomicilio || undefined,
          compradorEstadoCivil: compraventa.compradorEstadoCivil,
          compradorConyuge:     compraventa.compradorConyuge || undefined,
          precioVenta:          Number(compraventa.precioVenta),
          moneda:               compraventa.moneda,
          sena:                 compraventa.sena ? Number(compraventa.sena) : undefined,
          comisionVendedorPct:  Number(compraventa.comisionVendedorPct),
          comisionCompradorPct: Number(compraventa.comisionCompradorPct),
          formaPago:            compraventa.formaPago,
          escribanoNombre:      compraventa.escribanoNombre || undefined,
          escribanoRegistro:    compraventa.escribanoRegistro || undefined,
          fechaEscritura:       compraventa.fechaEscritura || undefined,
          clausulas:            compraventa.clausulas || undefined,
        }),
      });
      const json = await res.json() as { data?: ContratoVentaCreado; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      dispatch({ type: "SET_DONE" });
      if (json.data) {
        dispatch({ type: "SET_VENTA_CREADA", payload: json.data });
        setTimeout(() => printCompraventa(json.data!, compraventa.tipoFirma, config, inmobiliaria), 200);
        onVentaCreated?.(json.data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }

  function handleBack() {
    setErrs({});
    dispatch({ type: "PREV" });
  }

  // Done screen for compraventa (alquiler closes after onCreated)
  if (done && tipo === "compraventa") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: "#F7F5F2" }}>
            <Check className="w-8 h-8" style={{ color }} />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a]">Boleto generado</p>
            <p className="text-sm text-[#6a6a6a] mt-1">El documento se abrió en una nueva ventana para imprimir o guardar como PDF.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => ventaCreada && printCompraventa(ventaCreada, compraventa.tipoFirma, config, inmobiliaria)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
              style={{ borderColor: color, color }}
            >
              <Printer className="w-4 h-4" />
              Reimprimir
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: color }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLastStep = paso === totalPasos;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "94vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: color }}>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white opacity-80" />
            <div>
              <p className="text-white font-bold text-sm leading-tight">
                {tipo === "compraventa" ? "Boleto de Compraventa" : tipo === "alquiler" ? "Contrato de Alquiler" : "Nuevo Contrato"}
              </p>
              {paso > 0 && <p className="text-white/60 text-xs">Paso {paso} de {totalPasos}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.7)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        {paso > 0 && tipo && (
          <div className="shrink-0 border-b" style={{ borderColor: "#E8E5E0", background: "#FAFAF8" }}>
            <StepIndicator steps={steps} current={paso} color={color} />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {paso === 0 && (
            <Step0 onSelect={(t) => dispatch({ type: "SET_TIPO", payload: t })} />
          )}
          {tipo === "alquiler" && paso === 1 && <AlqStep1 data={alquiler} propiedades={propiedades} color={color} errs={errs} onChange={updAlq} />}
          {tipo === "alquiler" && paso === 2 && <AlqStep2 data={alquiler} color={color} errs={errs} onChange={updAlq} />}
          {tipo === "alquiler" && paso === 3 && <AlqStep3 data={alquiler} color={color} errs={errs} onChange={updAlq} />}
          {tipo === "alquiler" && paso === 4 && <AlqStep4 data={alquiler} color={color} errs={errs} onChange={updAlq} />}
          {tipo === "alquiler" && paso === 5 && <AlqPreview data={alquiler} propiedades={propiedades} cfg={config} inmob={inmobiliaria} color={color} onChange={updAlq} />}
          {tipo === "compraventa" && paso === 1 && <CvStep1 data={compraventa} propiedades={propiedades} color={color} errs={errs} onChange={updCv} />}
          {tipo === "compraventa" && paso === 2 && <CvStep2 data={compraventa} color={color} errs={errs} onChange={updCv} />}
          {tipo === "compraventa" && paso === 3 && <CvStep3 data={compraventa} color={color} errs={errs} onChange={updCv} />}
          {tipo === "compraventa" && paso === 4 && <CvStep4 data={compraventa} color={color} errs={errs} onChange={updCv} />}
          {tipo === "compraventa" && paso === 5 && <CvPreview data={compraventa} cfg={config} inmob={inmobiliaria} color={color} onChange={updCv} />}
        </div>

        {/* Footer actions */}
        {paso > 0 && (
          <div className="shrink-0 px-6 py-4 border-t flex gap-3" style={{ borderColor: "#E8E5E0" }}>
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
              style={{ borderColor: "#D4D0CB", color: "#3a3a3a" }}
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>
            {(() => {
              // Deshabilitar si eligió firma digital sin tener firma guardada
              const needsFirma = isLastStep &&
                ((tipo === "alquiler" && alquiler.tipoFirma === "DIGITAL") ||
                 (tipo === "compraventa" && compraventa.tipoFirma === "DIGITAL")) &&
                !inmobiliaria?.firmaUrl;
              return (
            <button
              onClick={handleNext}
              disabled={saving || needsFirma}
              title={needsFirma ? "Guardá tu firma en Configuración → Firma digital" : undefined}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: color }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLastStep ? (
                tipo === "alquiler" ? (
                  <><FileText className="w-4 h-4" /> Guardar e imprimir contrato</>
                ) : (
                  <><FileText className="w-4 h-4" /> Guardar y generar boleto</>
                )
              ) : (
                <>Siguiente <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
