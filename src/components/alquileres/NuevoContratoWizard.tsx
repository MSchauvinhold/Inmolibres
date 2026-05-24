"use client";

import { useReducer, useCallback, useId, useState } from "react";
import { toast } from "sonner";
import { X, ChevronLeft, ChevronRight, Loader2, FileText, Home, Users, DollarSign, Calendar, Gavel, Check, Printer } from "lucide-react";
import { formatPrice } from "@/lib/utils";

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
  inquilinoNombre: string;
  inquilinoTel: string;
  tieneGarante: boolean;
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
}

export interface CompraventaData {
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
}

type WizardAction =
  | { type: "SET_TIPO"; payload: Tipo }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "UPD_ALQ"; payload: Partial<AlquilerData> }
  | { type: "UPD_CV"; payload: Partial<CompraventaData> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_DONE" };

const DEFAULT_CLAUSULAS_ALQ = `PRIMERA — DESTINO: El inmueble será destinado exclusivamente a uso habitacional familiar, quedando prohibida su utilización para cualquier otra actividad.

SEGUNDA — SUBARRENDAMIENTO: El locatario no podrá subarrendar, ceder ni transferir este contrato sin el consentimiento expreso y por escrito del locador.

TERCERA — CONSERVACIÓN: El locatario se compromete a mantener el inmueble en perfectas condiciones de conservación e higiene, realizando las reparaciones locativas a su cargo.

CUARTA — SERVICIOS: Todos los servicios (energía eléctrica, gas, agua corriente, internet, etc.) serán abonados íntegramente por el locatario desde la fecha de inicio del contrato.

QUINTA — DEPÓSITO EN GARANTÍA: Al momento de la firma, el locatario entregará en concepto de depósito en garantía el equivalente a un (1) mes de alquiler, el cual le será devuelto al finalizar el contrato previa verificación del estado del inmueble.

SEXTA — ACTUALIZACIONES: El precio del alquiler será actualizado conforme a la variación del Índice de Contratos de Locación (ICL) publicado por el BCRA, de acuerdo con la Ley N° 27.737 y sus normas reglamentarias.

SÉPTIMA — ENTREGA: A la finalización del contrato, el locatario deberá entregar el inmueble libre de personas y bienes, en las mismas condiciones en que lo recibió, salvo el desgaste normal por el uso.

OCTAVA — DOMICILIOS ESPECIALES: Las partes constituyen domicilios especiales en los indicados en el presente instrumento, donde serán válidas todas las notificaciones judiciales y extrajudiciales.`;

const DEFAULT_CLAUSULAS_CV = `PRIMERA — BOLETO DE COMPRAVENTA: El presente instrumento constituye el boleto de compraventa del inmueble descripto, comprometiéndose las partes a otorgar la escritura traslativa de dominio en el plazo pactado.

SEGUNDA — LIBRE DE GRAVÁMENES: El vendedor garantiza que el inmueble se encuentra libre de hipotecas, embargos, inhibiciones y todo otro gravamen real o personal que pudiera afectarlo.

TERCERA — SEÑA Y PENALIDAD: La suma entregada en concepto de seña y a cuenta de precio tendrá el carácter de arras confirmatorias conforme al art. 1059 del Código Civil y Comercial. En caso de incumplimiento del comprador perderá dicha suma; en caso de incumplimiento del vendedor, deberá restituirla doblada.

CUARTA — GASTOS DE ESCRITURACIÓN: Los gastos notariales, impuestos de sellos y demás costos inherentes a la escrituración serán soportados en un cincuenta por ciento (50%) por cada parte, salvo acuerdo en contrario.`;

function mkAlqInit(cfg: WizardConfig | null): AlquilerData {
  const hoy = new Date().toISOString().slice(0, 10);
  const dosAnios = new Date(Date.now() + 730 * 86_400_000).toISOString().slice(0, 10);
  return {
    propiedadId: "",
    locadorNombre: cfg?.razonSocial ?? "",
    locadorCuit: cfg?.cuit ?? "",
    locadorDomicilio: cfg?.domicilioLegal ?? "",
    locadorMatricula: cfg?.matriculaCorredora ?? "",
    inquilinoNombre: "",
    inquilinoTel: "",
    tieneGarante: false,
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
  };
}

function mkCvInit(cfg: WizardConfig | null): CompraventaData {
  return {
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
        style={{ background: checked ? "#8B4513" : "#D4D0CB" }}
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

const ALQ_STEPS = ["Inmueble", "Partes", "Condiciones", "Vigencia"];
const CV_STEPS = ["Inmueble", "Partes", "Condiciones", "Escritura"];

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
          className="group p-6 rounded-2xl border-2 text-left space-y-3 transition-all hover:border-[#8B4513] hover:shadow-lg"
          style={{ borderColor: "#E8E5E0", background: "#FAFAF8" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#8B4513" }}>
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a] text-sm">Contrato de Alquiler</p>
            <p className="text-xs text-[#6a6a6a] mt-0.5 leading-relaxed">Locación habitacional o comercial. Se registra en el sistema.</p>
          </div>
        </button>
        <button
          onClick={() => onSelect("compraventa")}
          className="group p-6 rounded-2xl border-2 text-left space-y-3 transition-all hover:border-[#8B4513] hover:shadow-lg"
          style={{ borderColor: "#E8E5E0", background: "#FAFAF8" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#8B4513" }}>
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
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeader color={color}>Locador / Inmobiliaria</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Razón social / Nombre *" error={errs.locadorNombre}>
            <input className={inp} style={inpStyle} value={data.locadorNombre} onChange={(e) => onChange({ locadorNombre: e.target.value })} placeholder="Inmobiliaria SRL" />
          </Field>
          <Field label="CUIT" error={errs.locadorCuit}>
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

      <div className="space-y-4">
        <SectionHeader color={color}>Locatario (Inquilino)</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo *" error={errs.inquilinoNombre}>
            <input className={inp} style={inpStyle} value={data.inquilinoNombre} onChange={(e) => onChange({ inquilinoNombre: e.target.value })} placeholder="Juan Pérez" />
          </Field>
          <Field label="Teléfono *" error={errs.inquilinoTel}>
            <input className={inp} style={inpStyle} value={data.inquilinoTel} onChange={(e) => onChange({ inquilinoTel: e.target.value })} placeholder="+54 3772 ..." />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <Toggle checked={data.tieneGarante} onChange={(v) => onChange({ tieneGarante: v })} label="Incluir garante" />
        {data.tieneGarante && (
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl" style={{ background: "#F3F1EE" }}>
            <Field label="Nombre del garante *" error={errs.garanteNombre}>
              <input className={inp} style={inpStyle} value={data.garanteNombre} onChange={(e) => onChange({ garanteNombre: e.target.value })} placeholder="María García" />
            </Field>
            <Field label="Teléfono">
              <input className={inp} style={inpStyle} value={data.garanteTel} onChange={(e) => onChange({ garanteTel: e.target.value })} placeholder="+54 3772 ..." />
            </Field>
            <div className="col-span-2">
              <Field label="Domicilio">
                <input className={inp} style={inpStyle} value={data.garanteDomicilio} onChange={(e) => onChange({ garanteDomicilio: e.target.value })} placeholder="Calle 456, Paso de los Libres" />
              </Field>
            </div>
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
            <Field label="Canon mensual *" error={errs.precioMensual}>
              <input type="number" min={0} className={inp} style={inpStyle} value={data.precioMensual} onChange={(e) => onChange({ precioMensual: e.target.value })} placeholder="0" />
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
          <Field label="Depósito en garantía">
            <input type="number" min={0} className={inp} style={inpStyle} value={data.deposito} onChange={(e) => onChange({ deposito: e.target.value })} placeholder="1 mes de alquiler" />
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
  return (
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
        <div className="text-center py-4 rounded-xl" style={{ background: "#F3F1EE" }}>
          <p className="text-2xl font-bold tabular-nums" style={{ color }}>{meses}</p>
          <p className="text-xs text-[#6a6a6a] mt-0.5">meses de duración</p>
        </div>
      )}
      {errs.fechaFin && <p className={errCls}>{errs.fechaFin}</p>}
    </div>
  );
}

// ─── Compraventa steps ───────────────────────────────────────────────────────

function CvStep1({
  data, color, errs, onChange,
}: {
  data: CompraventaData;
  color: string;
  errs: Record<string, string>;
  onChange: (p: Partial<CompraventaData>) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader color={color}>Datos del inmueble</SectionHeader>
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
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeader color={color}>Vendedor</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo *" error={errs.vendedorNombre}>
            <input className={inp} style={inpStyle} value={data.vendedorNombre} onChange={(e) => onChange({ vendedorNombre: e.target.value })} placeholder="Nombre y apellido" />
          </Field>
          <Field label="DNI / CUIT *" error={errs.vendedorDni}>
            <input className={inp} style={inpStyle} value={data.vendedorDni} onChange={(e) => onChange({ vendedorDni: e.target.value })} placeholder="12.345.678" />
          </Field>
          <Field label="Domicilio">
            <input className={inp} style={inpStyle} value={data.vendedorDomicilio} onChange={(e) => onChange({ vendedorDomicilio: e.target.value })} placeholder="Calle 123" />
          </Field>
          <Field label="Estado civil">
            <select className={inp} style={inpStyle} value={data.vendedorEstadoCivil} onChange={(e) => onChange({ vendedorEstadoCivil: e.target.value })}>
              {ESTADO_CIVIL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          {data.vendedorEstadoCivil === "casado" && (
            <div className="col-span-2">
              <Field label="Cónyuge del vendedor">
                <input className={inp} style={inpStyle} value={data.vendedorConyuge} onChange={(e) => onChange({ vendedorConyuge: e.target.value })} placeholder="Nombre del cónyuge" />
              </Field>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader color={color}>Comprador</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre completo *" error={errs.compradorNombre}>
            <input className={inp} style={inpStyle} value={data.compradorNombre} onChange={(e) => onChange({ compradorNombre: e.target.value })} placeholder="Nombre y apellido" />
          </Field>
          <Field label="DNI / CUIT *" error={errs.compradorDni}>
            <input className={inp} style={inpStyle} value={data.compradorDni} onChange={(e) => onChange({ compradorDni: e.target.value })} placeholder="12.345.678" />
          </Field>
          <Field label="Domicilio">
            <input className={inp} style={inpStyle} value={data.compradorDomicilio} onChange={(e) => onChange({ compradorDomicilio: e.target.value })} placeholder="Calle 456" />
          </Field>
          <Field label="Estado civil">
            <select className={inp} style={inpStyle} value={data.compradorEstadoCivil} onChange={(e) => onChange({ compradorEstadoCivil: e.target.value })}>
              {ESTADO_CIVIL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          {data.compradorEstadoCivil === "casado" && (
            <div className="col-span-2">
              <Field label="Cónyuge del comprador">
                <input className={inp} style={inpStyle} value={data.compradorConyuge} onChange={(e) => onChange({ compradorConyuge: e.target.value })} placeholder="Nombre del cónyuge" />
              </Field>
            </div>
          )}
        </div>
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
    if (!data.inquilinoNombre.trim() || data.inquilinoNombre.length < 2) e.inquilinoNombre = "Nombre requerido";
    if (!data.inquilinoTel.trim() || data.inquilinoTel.length < 7) e.inquilinoTel = "Teléfono inválido";
    if (data.tieneGarante && !data.garanteNombre.trim()) e.garanteNombre = "Nombre del garante requerido";
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
    if (!data.vendedorNombre.trim()) e.vendedorNombre = "Requerido";
    if (!data.vendedorDni.trim()) e.vendedorDni = "Requerido";
    if (!data.compradorNombre.trim()) e.compradorNombre = "Requerido";
    if (!data.compradorDni.trim()) e.compradorDni = "Requerido";
  }
  if (paso === 3) {
    if (!data.precioVenta || Number(data.precioVenta) <= 0) e.precioVenta = "Ingresá el precio";
  }
  return e;
}

// ─── Document generator: Alquiler ────────────────────────────────────────────

function fmtFechaLarga(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function duracionMeses(inicio: string, fin: string): number {
  const d1 = new Date(inicio + "T00:00:00");
  const d2 = new Date(fin + "T00:00:00");
  return (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
}

function printAlquiler(data: AlquilerData, propiedades: PropiedadItem[], cfg: WizardConfig | null, inmob: WizardInmobiliaria | null) {
  const cp = cfg?.colorPrimario ?? "#8B4513";
  const cs = cfg?.colorSecundario ?? "#2C2C2C";
  const prop = propiedades.find((p) => p.id === data.propiedadId);
  const hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const meses = duracionMeses(data.fechaInicio, data.fechaFin);
  const pie = cfg?.piePaginaContrato ?? [cfg?.razonSocial ?? inmob?.nombre ?? "", inmob?.whatsapp && `Tel: ${inmob.whatsapp}`, inmob?.email].filter(Boolean).join(" · ");

  const logoHtml = inmob?.logoUrl
    ? `<img src="${inmob.logoUrl}" alt="" style="height:64px;width:auto;object-fit:contain;background:#fff;border-radius:8px;padding:6px;flex-shrink:0"/>`
    : `<div style="height:64px;width:64px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:white;font-size:28px;font-weight:700">${(cfg?.razonSocial ?? inmob?.nombre ?? "I").charAt(0)}</span></div>`;

  const garanHtml = data.tieneGarante && data.garanteNombre ? `
    <div class="section">
      <div class="section-title">Garante</div>
      <div class="grid2">
        <div class="field"><div class="fl">Nombre completo</div><div class="fv">${data.garanteNombre}</div></div>
        ${data.garanteTel ? `<div class="field"><div class="fl">Teléfono</div><div class="fv">${data.garanteTel}</div></div>` : ""}
        ${data.garanteDomicilio ? `<div class="field" style="grid-column:span 2"><div class="fl">Domicilio</div><div class="fv">${data.garanteDomicilio}</div></div>` : ""}
      </div>
    </div>` : "";

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Contrato — ${data.inquilinoNombre}</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#1a1a1a}
.hdr{background:${cp};color:#fff;padding:20px 28px;display:flex;align-items:center;gap:20px}
.hdr-text h1{font-size:17px;font-weight:700}.hdr-text p{font-size:10px;opacity:.85;margin-top:2px}
.tbar{background:${cs};color:#fff;text-align:center;padding:9px;font-size:13px;font-weight:700;letter-spacing:2.5px}
.body{padding:24px 28px}.section{margin-bottom:16px}
.section-title{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${cp};border-bottom:1.5px solid ${cp};padding-bottom:4px;margin-bottom:10px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.field .fl{font-size:8.5px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.8px}.field .fv{font-weight:600;margin-top:2px}
.fv-lg{font-weight:700;font-size:15px;color:${cp};margin-top:2px}.intro{font-size:11px;line-height:1.7;color:#333;margin-bottom:18px}
.clausulas{white-space:pre-wrap;font-size:10px;line-height:1.7;color:#444}
.firmas{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px}
.firma-line{height:40px;border-bottom:1px solid #aaa;margin-bottom:6px}.firma-label{font-size:9.5px;font-weight:700;text-align:center;color:#333}
.firma-sub{font-size:9px;text-align:center;color:#888;margin-top:2px}
.doc-footer{border-top:2px solid ${cp};background:#f7f7f7;padding:10px 20px;font-size:9px;color:#666;text-align:center;margin-top:16px}
@media print{@page{margin:10mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr">${logoHtml}<div class="hdr-text"><h1>${cfg?.razonSocial ?? inmob?.nombre ?? "Inmobiliaria"}</h1>${cfg?.cuit ? `<p>CUIT: ${cfg.cuit}</p>` : ""}${cfg?.domicilioLegal ? `<p>${cfg.domicilioLegal}</p>` : ""}${cfg?.matriculaCorredora ? `<p>Matrícula corredor N° ${cfg.matriculaCorredora}</p>` : ""}</div></div>
<div class="tbar">CONTRATO DE LOCACIÓN</div>
<div class="body">
<p class="intro">En la ciudad de Paso de los Libres, Corrientes, a los <strong>${hoy}</strong>, entre <strong>${data.locadorNombre}</strong>${data.locadorCuit ? `, CUIT ${data.locadorCuit}` : ""}${data.locadorDomicilio ? `, con domicilio en ${data.locadorDomicilio}` : ""}${data.locadorMatricula ? `, corredor inmobiliario matrícula N° ${data.locadorMatricula}` : ""}, en adelante el <strong>LOCADOR</strong>; y <strong>${data.inquilinoNombre}</strong>, tel. ${data.inquilinoTel}, en adelante el <strong>LOCATARIO</strong>; se celebra el presente Contrato de Locación bajo los siguientes términos y condiciones:</p>
<div class="section"><div class="section-title">Inmueble locado</div><div class="grid2"><div class="field"><div class="fl">Propiedad</div><div class="fv">${prop?.titulo ?? ""}</div></div><div class="field"><div class="fl">Dirección</div><div class="fv">${prop?.direccion ?? ""}</div></div></div></div>
<div class="section"><div class="section-title">Partes</div><div class="grid2"><div class="field"><div class="fl">Locatario</div><div class="fv">${data.inquilinoNombre}</div></div><div class="field"><div class="fl">Teléfono</div><div class="fv">${data.inquilinoTel}</div></div></div></div>
${garanHtml}
<div class="section"><div class="section-title">Condiciones económicas</div><div class="grid3"><div class="field"><div class="fl">Canon mensual</div><div class="fv-lg">${formatPrice(Number(data.precioMensual), data.moneda)}</div></div><div class="field"><div class="fl">Moneda</div><div class="fv">${data.moneda}</div></div><div class="field"><div class="fl">Día de pago</div><div class="fv">Día ${data.diaVencimientoPago} de cada mes</div></div></div>${data.deposito ? `<p style="margin-top:8px;font-size:10px;color:#555">Depósito en garantía: <strong>${formatPrice(Number(data.deposito), data.moneda)}</strong></p>` : ""}</div>
<div class="section"><div class="section-title">Vigencia</div><div class="grid3"><div class="field"><div class="fl">Fecha de inicio</div><div class="fv">${fmtFechaLarga(data.fechaInicio)}</div></div><div class="field"><div class="fl">Fecha de fin</div><div class="fv">${fmtFechaLarga(data.fechaFin)}</div></div><div class="field"><div class="fl">Duración</div><div class="fv">${meses} meses</div></div></div></div>
<div class="section"><div class="section-title">Cláusulas y condiciones</div><pre class="clausulas">${data.clausulas}</pre></div>
<div class="firmas"><div><div class="firma-line"></div><div class="firma-label">LOCADOR / INMOBILIARIA</div><div class="firma-sub">${data.locadorNombre}</div>${data.locadorMatricula ? `<div class="firma-sub">Mat. N° ${data.locadorMatricula}</div>` : ""}</div><div><div class="firma-line"></div><div class="firma-label">LOCATARIO</div><div class="firma-sub">${data.inquilinoNombre}</div><div class="firma-sub">Tel: ${data.inquilinoTel}</div></div></div>
</div><div class="doc-footer">${pie}</div></body></html>`;

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Habilitá las ventanas emergentes para imprimir"); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

export function printCompraventa(data: CompraventaData, cfg: WizardConfig | null, inmob: WizardInmobiliaria | null) {
  const cp = cfg?.colorPrimario ?? "#8B4513";
  const cs = cfg?.colorSecundario ?? "#2C2C2C";
  const hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const pie = cfg?.piePaginaContrato ?? [cfg?.razonSocial ?? inmob?.nombre ?? "", inmob?.whatsapp && `Tel: ${inmob.whatsapp}`, inmob?.email].filter(Boolean).join(" · ");
  const precio = Number(data.precioVenta) || 0;
  const sena = Number(data.sena) || 0;
  const comV = ((Number(data.comisionVendedorPct) || 0) / 100) * precio;
  const comC = ((Number(data.comisionCompradorPct) || 0) / 100) * precio;

  const logoHtml = inmob?.logoUrl
    ? `<img src="${inmob.logoUrl}" alt="" style="height:64px;width:auto;object-fit:contain;background:#fff;border-radius:8px;padding:6px;flex-shrink:0"/>`
    : `<div style="height:64px;width:64px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:white;font-size:28px;font-weight:700">${(cfg?.razonSocial ?? inmob?.nombre ?? "I").charAt(0)}</span></div>`;

  const conyugeVendRow = data.vendedorEstadoCivil === "casado" && data.vendedorConyuge ? `<div class="field"><div class="fl">Cónyuge</div><div class="fv">${data.vendedorConyuge}</div></div>` : "";
  const conyugeComprRow = data.compradorEstadoCivil === "casado" && data.compradorConyuge ? `<div class="field"><div class="fl">Cónyuge</div><div class="fv">${data.compradorConyuge}</div></div>` : "";

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Boleto de Compraventa</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#1a1a1a}
.hdr{background:${cp};color:#fff;padding:20px 28px;display:flex;align-items:center;gap:20px}
.hdr-text h1{font-size:17px;font-weight:700}.hdr-text p{font-size:10px;opacity:.85;margin-top:2px}
.tbar{background:${cs};color:#fff;text-align:center;padding:9px;font-size:13px;font-weight:700;letter-spacing:2.5px}
.body{padding:24px 28px}.section{margin-bottom:16px}
.section-title{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${cp};border-bottom:1.5px solid ${cp};padding-bottom:4px;margin-bottom:10px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.field .fl{font-size:8.5px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.8px}.field .fv{font-weight:600;margin-top:2px}
.fv-lg{font-weight:700;font-size:15px;color:${cp};margin-top:2px}
.clausulas{white-space:pre-wrap;font-size:10px;line-height:1.7;color:#444}
.firmas{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px}
.firma-line{height:40px;border-bottom:1px solid #aaa;margin-bottom:6px}.firma-label{font-size:9.5px;font-weight:700;text-align:center;color:#333}
.firma-sub{font-size:9px;text-align:center;color:#888;margin-top:2px}
.doc-footer{border-top:2px solid ${cp};background:#f7f7f7;padding:10px 20px;font-size:9px;color:#666;text-align:center;margin-top:16px}
@media print{@page{margin:10mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr">${logoHtml}<div class="hdr-text"><h1>${cfg?.razonSocial ?? inmob?.nombre ?? "Inmobiliaria"}</h1>${cfg?.cuit ? `<p>CUIT: ${cfg.cuit}</p>` : ""}${cfg?.domicilioLegal ? `<p>${cfg.domicilioLegal}</p>` : ""}${cfg?.matriculaCorredora ? `<p>Matrícula corredor N° ${cfg.matriculaCorredora}</p>` : ""}</div></div>
<div class="tbar">BOLETO DE COMPRAVENTA</div>
<div class="body">
<p style="font-size:11px;line-height:1.7;color:#333;margin-bottom:18px">En la ciudad de Paso de los Libres, Corrientes, a los <strong>${hoy}</strong>, las partes que se identifican a continuación acuerdan celebrar el presente Boleto de Compraventa bajo los términos y condiciones que se detallan:</p>
<div class="section"><div class="section-title">Inmueble objeto</div><div class="grid2"><div class="field"><div class="fl">Dirección</div><div class="fv">${data.propiedadDireccion}</div></div>${data.matriculaInmueble ? `<div class="field"><div class="fl">Matrícula / Partida</div><div class="fv">${data.matriculaInmueble}</div></div>` : ""}${data.propiedadDescripcion ? `<div class="field" style="grid-column:span 2"><div class="fl">Descripción</div><div class="fv">${data.propiedadDescripcion}</div></div>` : ""}</div></div>
<div class="section"><div class="section-title">Vendedor</div><div class="grid2"><div class="field"><div class="fl">Nombre completo</div><div class="fv">${data.vendedorNombre}</div></div><div class="field"><div class="fl">DNI / CUIT</div><div class="fv">${data.vendedorDni}</div></div>${data.vendedorDomicilio ? `<div class="field"><div class="fl">Domicilio</div><div class="fv">${data.vendedorDomicilio}</div></div>` : ""}<div class="field"><div class="fl">Estado civil</div><div class="fv" style="text-transform:capitalize">${data.vendedorEstadoCivil}</div></div>${conyugeVendRow}</div></div>
<div class="section"><div class="section-title">Comprador</div><div class="grid2"><div class="field"><div class="fl">Nombre completo</div><div class="fv">${data.compradorNombre}</div></div><div class="field"><div class="fl">DNI / CUIT</div><div class="fv">${data.compradorDni}</div></div>${data.compradorDomicilio ? `<div class="field"><div class="fl">Domicilio</div><div class="fv">${data.compradorDomicilio}</div></div>` : ""}<div class="field"><div class="fl">Estado civil</div><div class="fv" style="text-transform:capitalize">${data.compradorEstadoCivil}</div></div>${conyugeComprRow}</div></div>
<div class="section"><div class="section-title">Condiciones económicas</div><div class="grid3"><div class="field"><div class="fl">Precio acordado</div><div class="fv-lg">${formatPrice(precio, data.moneda)}</div></div>${sena > 0 ? `<div class="field"><div class="fl">Seña / Reserva</div><div class="fv-lg">${formatPrice(sena, data.moneda)}</div></div>` : ""}<div class="field"><div class="fl">Forma de pago</div><div class="fv">${data.formaPago}</div></div></div>${comV > 0 || comC > 0 ? `<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><div class="fl">Comisión vendedor (${data.comisionVendedorPct}%)</div><div class="fv">${formatPrice(comV, data.moneda)}</div></div><div class="field"><div class="fl">Comisión comprador (${data.comisionCompradorPct}%)</div><div class="fv">${formatPrice(comC, data.moneda)}</div></div></div>` : ""}</div>
${data.escribanoNombre ? `<div class="section"><div class="section-title">Escribanía</div><div class="grid2"><div class="field"><div class="fl">Escribano</div><div class="fv">${data.escribanoNombre}</div></div>${data.escribanoRegistro ? `<div class="field"><div class="fl">Registro notarial</div><div class="fv">${data.escribanoRegistro}</div></div>` : ""}${data.fechaEscritura ? `<div class="field"><div class="fl">Fecha tentativa escritura</div><div class="fv">${fmtFechaLarga(data.fechaEscritura)}</div></div>` : ""}</div></div>` : ""}
<div class="section"><div class="section-title">Cláusulas y condiciones</div><pre class="clausulas">${data.clausulas}</pre></div>
<div class="firmas"><div><div class="firma-line"></div><div class="firma-label">VENDEDOR</div><div class="firma-sub">${data.vendedorNombre}</div><div class="firma-sub">DNI/CUIT: ${data.vendedorDni}</div></div><div><div class="firma-line"></div><div class="firma-label">COMPRADOR</div><div class="firma-sub">${data.compradorNombre}</div><div class="firma-sub">DNI/CUIT: ${data.compradorDni}</div></div></div>
${cfg?.matriculaCorredora ? `<div style="margin-top:24px;text-align:center"><div style="display:inline-block;text-align:center"><div style="height:36px;border-bottom:1px solid #aaa;width:200px;margin-bottom:5px"></div><div style="font-size:9.5px;font-weight:700;color:#333">CORREDOR INMOBILIARIO</div><div style="font-size:9px;color:#888">${cfg.razonSocial ?? ""} · Mat. N° ${cfg.matriculaCorredora}</div></div></div>` : ""}
</div><div class="doc-footer">${pie}</div></body></html>`;

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { toast.error("Habilitá las ventanas emergentes para imprimir"); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
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
  const uid = useId();
  const [state, dispatch] = useReducer(reducer, null, () => ({
    tipo: null,
    paso: 0,
    alquiler: mkAlqInit(config),
    compraventa: mkCvInit(config),
    saving: false,
    done: false,
  }));
  const [errs, setErrs] = useState<Record<string, string>>({});

  const { tipo, paso, alquiler, compraventa, saving, done } = state;
  const primaryColor = config?.colorPrimario ?? "#8B4513";
  const color = primaryColor;
  const steps = tipo === "compraventa" ? CV_STEPS : ALQ_STEPS;
  const totalPasos = 4;

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
        }),
      });
      const json = await res.json() as { data?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al crear");
      const d = json.data!;
      dispatch({ type: "SET_DONE" });
      // Print after save
      setTimeout(() => printAlquiler(alquiler, propiedades, config, inmobiliaria), 200);
      onCreated({
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
      });
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
      setTimeout(() => printCompraventa(compraventa, config, inmobiliaria), 200);
      if (json.data) onVentaCreated?.(json.data);
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
            <Check className="w-8 h-8" style={{ color: "#8B4513" }} />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a]">Boleto generado</p>
            <p className="text-sm text-[#6a6a6a] mt-1">El documento se abrió en una nueva ventana para imprimir o guardar como PDF.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => printCompraventa(compraventa, config, inmobiliaria)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
              style={{ borderColor: "#8B4513", color: "#8B4513" }}
            >
              <Printer className="w-4 h-4" />
              Reimprimir
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#8B4513" }}>
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
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: "#8B4513" }}>
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
          {tipo === "compraventa" && paso === 1 && <CvStep1 data={compraventa} color={color} errs={errs} onChange={updCv} />}
          {tipo === "compraventa" && paso === 2 && <CvStep2 data={compraventa} color={color} errs={errs} onChange={updCv} />}
          {tipo === "compraventa" && paso === 3 && <CvStep3 data={compraventa} color={color} errs={errs} onChange={updCv} />}
          {tipo === "compraventa" && paso === 4 && <CvStep4 data={compraventa} color={color} errs={errs} onChange={updCv} />}
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
            <button
              onClick={handleNext}
              disabled={saving}
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
          </div>
        )}
      </div>
    </div>
  );
}
