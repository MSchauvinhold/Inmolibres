"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import {
  Plus, FileText, Loader2, Printer, X, AlertTriangle,
  CheckCircle, Phone, Trash2, ChevronRight, ScrollText,
  Gavel, Search, Home, DollarSign, Calendar,
} from "lucide-react";
import {
  NuevoContratoWizard,
  printCompraventa,
  type ContratoCreado,
  type ContratoVentaCreado,
  type PropiedadItem,
  type WizardConfig,
  type WizardInmobiliaria,
  type CompraventaData,
} from "./NuevoContratoWizard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contrato {
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

interface ContratoVenta {
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

interface Config extends WizardConfig {
  clausulasAdicionales: string | null;
  piePaginaContrato: string | null;
}

interface Props {
  contratos: Contrato[];
  ventas: ContratoVenta[];
  propiedades: PropiedadItem[];
  isAdmin: boolean;
  config: Config | null;
  inmobiliaria: WizardInmobiliaria | null;
}

type TipoTab = "alquiler" | "compraventa";
type FiltroAlq = "activos" | "atrasados" | "todos";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_STYLES = {
  atrasado: { border: "#EF4444", badge: "bg-red-100 text-red-700 border-red-200", label: "Pago atrasado" },
  vencido:  { border: "#9CA3AF", badge: "bg-gray-100 text-gray-500 border-gray-200", label: "Contrato vencido" },
  proximo:  { border: "#F59E0B", badge: "bg-amber-100 text-amber-700 border-amber-200", label: "Vence pronto" },
  ok:       { border: "#10B981", badge: "bg-green-100 text-green-700 border-green-200", label: "Al día" },
} as const;

const DEFAULT_CLAUSULAS = `PRIMERA — DESTINO: El inmueble será destinado exclusivamente a uso habitacional familiar, quedando prohibida su utilización para cualquier otra actividad.

SEGUNDA — SUBARRENDAMIENTO: El locatario no podrá subarrendar, ceder ni transferir este contrato sin el consentimiento expreso y por escrito del locador.

TERCERA — CONSERVACIÓN: El locatario se compromete a mantener el inmueble en perfectas condiciones de conservación e higiene, realizando las reparaciones locativas a su cargo.

CUARTA — SERVICIOS: Todos los servicios (energía eléctrica, gas, agua corriente, internet, etc.) serán abonados íntegramente por el locatario desde la fecha de inicio del contrato.

QUINTA — DEPÓSITO EN GARANTÍA: Al momento de la firma, el locatario entregará en concepto de depósito en garantía el equivalente a un (1) mes de alquiler, el cual le será devuelto al finalizar el contrato previa verificación del estado del inmueble.

SEXTA — ACTUALIZACIONES: El precio del alquiler será actualizado conforme a la variación del Índice de Contratos de Locación (ICL) publicado por el BCRA, de acuerdo con la Ley N° 27.737 y sus normas reglamentarias.

SÉPTIMA — ENTREGA: A la finalización del contrato, el locatario deberá entregar el inmueble libre de personas y bienes, en las mismas condiciones en que lo recibió, salvo el desgaste normal por el uso.

OCTAVA — DOMICILIOS ESPECIALES: Las partes constituyen domicilios especiales en los indicados en el presente instrumento, donde serán válidas todas las notificaciones judiciales y extrajudiciales.`;

type EstadoKey = keyof typeof ESTADO_STYLES;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDiasRestantes(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(fechaFin + "T00:00:00").getTime() - hoy.getTime()) / 86_400_000);
}

function getEstadoKey(c: Contrato): EstadoKey {
  if (c.estadoPago === "ATRASADO") return "atrasado";
  const dias = getDiasRestantes(c.fechaFin);
  if (dias < 0) return "vencido";
  if (dias <= 30) return "proximo";
  return "ok";
}

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtFechaLarga(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function duracionMeses(inicio: string, fin: string): number {
  const d1 = new Date(inicio + "T00:00:00");
  const d2 = new Date(fin + "T00:00:00");
  return (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-4 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

// ─── ContratoCard (alquiler) ──────────────────────────────────────────────────

function ContratoCard({ contrato, onClick }: { contrato: Contrato; onClick: () => void }) {
  const key = getEstadoKey(contrato);
  const style = ESTADO_STYLES[key];
  const dias = getDiasRestantes(contrato.fechaFin);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-md transition-shadow group"
      style={{ borderLeft: `4px solid ${style.border}` }}
    >
      <div className="flex items-center">
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary truncate text-sm">{contrato.propiedad.titulo}</p>
              <p className="text-xs text-text-muted truncate">{contrato.propiedad.direccion}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${style.badge}`}>
              {style.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-wide">Inquilino</p>
              <p className="text-xs font-medium text-text-primary truncate mt-0.5">{contrato.inquilinoNombre}</p>
              <p className="text-[10px] text-text-secondary">{contrato.inquilinoTel}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-wide">Alquiler</p>
              <p className="text-sm font-price font-bold text-brand-primary mt-0.5">
                {formatPrice(contrato.precioMensual, contrato.moneda)}
              </p>
              <p className="text-[10px] text-text-muted">Día {contrato.diaVencimientoPago}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-wide">Fin contrato</p>
              <p className="text-xs font-medium text-text-primary mt-0.5">{fmtFecha(contrato.fechaFin)}</p>
              <p className={`text-[10px] font-medium ${dias < 0 ? "text-text-muted" : dias <= 30 ? "text-amber-600" : "text-emerald-600"}`}>
                {dias < 0 ? `Venció hace ${Math.abs(dias)}d` : `${dias} días`}
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 text-text-muted group-hover:text-brand-primary transition-colors shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}

// ─── ContratoVentaCard ────────────────────────────────────────────────────────

function ContratoVentaCard({ venta, onClick }: { venta: ContratoVenta; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-md transition-shadow group"
      style={{ borderLeft: "4px solid #D4A853" }}
    >
      <div className="flex items-center">
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary truncate text-sm">{venta.propiedadDireccion}</p>
              {venta.propiedadDescripcion && (
                <p className="text-xs text-text-muted truncate">{venta.propiedadDescripcion}</p>
              )}
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 bg-amber-50 text-amber-700 border-amber-200">
              Boleto CV
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-wide">Vendedor</p>
              <p className="text-xs font-medium text-text-primary truncate mt-0.5">{venta.vendedorNombre}</p>
              <p className="text-[10px] text-text-secondary truncate">{venta.vendedorDni}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-wide">Comprador</p>
              <p className="text-xs font-medium text-text-primary truncate mt-0.5">{venta.compradorNombre}</p>
              <p className="text-[10px] text-text-secondary truncate">{venta.compradorDni}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted uppercase tracking-wide">Precio</p>
              <p className="text-sm font-price font-bold mt-0.5" style={{ color: "#D4A853" }}>
                {formatPrice(venta.precioVenta, venta.moneda)}
              </p>
              {venta.fechaEscritura && (
                <p className="text-[10px] text-text-muted">Escrit. {fmtFecha(venta.fechaEscritura)}</p>
              )}
            </div>
          </div>
        </div>
        <div className="px-3 text-text-muted group-hover:text-brand-primary transition-colors shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}

// ─── ContratoDetalleSheet (alquiler) ─────────────────────────────────────────

function ContratoDetalleSheet({
  contrato, isAdmin, onClose, onEstadoChange, onDelete, onVerDocumento,
}: {
  contrato: Contrato;
  isAdmin: boolean;
  onClose: () => void;
  onEstadoChange: (id: string, estado: "AL_DIA" | "ATRASADO") => void;
  onDelete: (id: string) => void;
  onVerDocumento: () => void;
}) {
  const [updatingPago, setUpdatingPago] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dias = getDiasRestantes(contrato.fechaFin);
  const key = getEstadoKey(contrato);
  const style = ESTADO_STYLES[key];

  const togglePago = useCallback(async () => {
    const nuevo = contrato.estadoPago === "AL_DIA" ? "ATRASADO" : "AL_DIA";
    setUpdatingPago(true);
    try {
      const res = await fetch(`/api/alquileres/${contrato.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoPago: nuevo }),
      });
      if (!res.ok) throw new Error();
      onEstadoChange(contrato.id, nuevo);
      toast.success(nuevo === "AL_DIA" ? "Marcado al día" : "Marcado como atrasado");
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setUpdatingPago(false);
    }
  }, [contrato.id, contrato.estadoPago, onEstadoChange]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`¿Eliminar el contrato de ${contrato.inquilinoNombre}? La propiedad volverá a estado Disponible.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/alquileres/${contrato.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDelete(contrato.id);
      toast.success("Contrato eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }, [contrato.id, contrato.inquilinoNombre, onDelete]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm h-full bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-brand-primary shrink-0" />
              <p className="font-semibold text-text-primary truncate">{contrato.propiedad.titulo}</p>
            </div>
            <p className="text-xs text-text-muted truncate mt-0.5">{contrato.propiedad.direccion}</p>
          </div>
          <button onClick={onClose} className="ml-3 p-1.5 rounded-lg text-text-muted hover:bg-surface-raised shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${style.badge}`}>{style.label}</span>
            {dias < 0 ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                Venció hace {Math.abs(dias)} días
              </span>
            ) : (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${dias <= 30 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-surface-raised text-text-muted border-border"}`}>
                {dias} días restantes
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Inquilino</p>
            <div className="p-3 rounded-xl bg-surface-raised space-y-1.5">
              <p className="text-sm font-semibold text-text-primary">{contrato.inquilinoNombre}</p>
              <a href={`tel:${contrato.inquilinoTel}`} className="text-xs text-brand-primary hover:underline flex items-center gap-1.5">
                <Phone className="w-3 h-3" />{contrato.inquilinoTel}
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Condiciones financieras</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-surface-raised">
                <p className="text-[9px] text-text-muted uppercase tracking-wide">Alquiler mensual</p>
                <p className="font-price font-bold text-brand-primary mt-0.5">{formatPrice(contrato.precioMensual, contrato.moneda)}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised">
                <p className="text-[9px] text-text-muted uppercase tracking-wide">Vencimiento</p>
                <p className="font-semibold text-text-primary mt-0.5">Día {contrato.diaVencimientoPago}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Vigencia</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-surface-raised">
                <p className="text-[9px] text-text-muted uppercase tracking-wide">Inicio</p>
                <p className="text-xs font-medium text-text-primary mt-0.5">{fmtFecha(contrato.fechaInicio)}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised">
                <p className="text-[9px] text-text-muted uppercase tracking-wide">Fin</p>
                <p className="text-xs font-medium text-text-primary mt-0.5">{fmtFecha(contrato.fechaFin)}</p>
              </div>
            </div>
            <p className="text-xs text-text-muted text-center">Duración total: {duracionMeses(contrato.fechaInicio, contrato.fechaFin)} meses</p>
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-2 shrink-0">
          <button onClick={onVerDocumento} className="w-full btn-primary text-sm flex items-center justify-center gap-2">
            <Printer className="w-3.5 h-3.5" />Ver e imprimir contrato
          </button>
          <button onClick={togglePago} disabled={updatingPago} className="w-full btn-outline text-sm flex items-center justify-center gap-2">
            {updatingPago ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : contrato.estadoPago === "AL_DIA" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
            {contrato.estadoPago === "AL_DIA" ? "Marcar como atrasado" : "Marcar al día"}
          </button>
          {isAdmin && (
            <button onClick={handleDelete} disabled={deleting} className="w-full text-sm py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 flex items-center justify-center gap-2 transition-colors">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Eliminar contrato
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ContratoVentaDetalleSheet ────────────────────────────────────────────────

function ContratoVentaDetalleSheet({
  venta, isAdmin, config, inmobiliaria, onClose, onDelete,
}: {
  venta: ContratoVenta;
  isAdmin: boolean;
  config: Config | null;
  inmobiliaria: WizardInmobiliaria | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!confirm(`¿Eliminar el boleto de compraventa de ${venta.compradorNombre}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contratos-venta/${venta.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDelete(venta.id);
      toast.success("Boleto eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }, [venta.id, venta.compradorNombre, onDelete]);

  function handleReimprimir() {
    const cv: CompraventaData = {
      propiedadDireccion:   venta.propiedadDireccion,
      propiedadDescripcion: venta.propiedadDescripcion ?? "",
      matriculaInmueble:    venta.matriculaInmueble ?? "",
      vendedorNombre:       venta.vendedorNombre,
      vendedorDni:          venta.vendedorDni,
      vendedorDomicilio:    venta.vendedorDomicilio ?? "",
      vendedorEstadoCivil:  venta.vendedorEstadoCivil,
      vendedorConyuge:      venta.vendedorConyuge ?? "",
      compradorNombre:      venta.compradorNombre,
      compradorDni:         venta.compradorDni,
      compradorDomicilio:   venta.compradorDomicilio ?? "",
      compradorEstadoCivil: venta.compradorEstadoCivil,
      compradorConyuge:     venta.compradorConyuge ?? "",
      precioVenta:          String(venta.precioVenta),
      moneda:               venta.moneda,
      sena:                 venta.sena !== null ? String(venta.sena) : "",
      comisionVendedorPct:  String(venta.comisionVendedorPct),
      comisionCompradorPct: String(venta.comisionCompradorPct),
      formaPago:            venta.formaPago,
      escribanoNombre:      venta.escribanoNombre ?? "",
      escribanoRegistro:    venta.escribanoRegistro ?? "",
      fechaEscritura:       venta.fechaEscritura ?? "",
      clausulas:            venta.clausulas ?? "",
    };
    printCompraventa(cv, config, inmobiliaria);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm h-full bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 shrink-0" style={{ color: "#D4A853" }} />
              <p className="font-semibold text-text-primary truncate">{venta.propiedadDireccion}</p>
            </div>
            <p className="text-xs text-text-muted mt-0.5">Boleto de Compraventa · {fmtFecha(venta.createdAt.slice(0, 10))}</p>
          </div>
          <button onClick={onClose} className="ml-3 p-1.5 rounded-lg text-text-muted hover:bg-surface-raised shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Vendedor */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Vendedor</p>
            <div className="p-3 rounded-xl bg-surface-raised space-y-1">
              <p className="text-sm font-semibold text-text-primary">{venta.vendedorNombre}</p>
              <p className="text-xs text-text-secondary">DNI/CUIT: {venta.vendedorDni}</p>
              {venta.vendedorDomicilio && <p className="text-xs text-text-muted">{venta.vendedorDomicilio}</p>}
              <p className="text-xs text-text-muted capitalize">{venta.vendedorEstadoCivil}{venta.vendedorConyuge ? ` · Cónyuge: ${venta.vendedorConyuge}` : ""}</p>
            </div>
          </div>

          {/* Comprador */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Comprador</p>
            <div className="p-3 rounded-xl bg-surface-raised space-y-1">
              <p className="text-sm font-semibold text-text-primary">{venta.compradorNombre}</p>
              <p className="text-xs text-text-secondary">DNI/CUIT: {venta.compradorDni}</p>
              {venta.compradorDomicilio && <p className="text-xs text-text-muted">{venta.compradorDomicilio}</p>}
              <p className="text-xs text-text-muted capitalize">{venta.compradorEstadoCivil}{venta.compradorConyuge ? ` · Cónyuge: ${venta.compradorConyuge}` : ""}</p>
            </div>
          </div>

          {/* Condiciones */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Condiciones económicas</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-surface-raised">
                <p className="text-[9px] text-text-muted uppercase tracking-wide">Precio de venta</p>
                <p className="font-price font-bold mt-0.5" style={{ color: "#D4A853" }}>
                  {formatPrice(venta.precioVenta, venta.moneda)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised">
                <p className="text-[9px] text-text-muted uppercase tracking-wide">Forma de pago</p>
                <p className="text-xs font-medium text-text-primary mt-0.5">{venta.formaPago}</p>
              </div>
              {venta.sena !== null && venta.sena > 0 && (
                <div className="p-3 rounded-xl bg-surface-raised">
                  <p className="text-[9px] text-text-muted uppercase tracking-wide">Seña / Reserva</p>
                  <p className="text-xs font-medium text-text-primary mt-0.5">{formatPrice(venta.sena, venta.moneda)}</p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-surface-raised">
                <p className="text-[9px] text-text-muted uppercase tracking-wide">Comisiones</p>
                <p className="text-xs font-medium text-text-primary mt-0.5">
                  V: {venta.comisionVendedorPct}% · C: {venta.comisionCompradorPct}%
                </p>
              </div>
            </div>
          </div>

          {/* Escribanía */}
          {(venta.escribanoNombre || venta.fechaEscritura) && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Escribanía</p>
              <div className="p-3 rounded-xl bg-surface-raised space-y-1">
                {venta.escribanoNombre && <p className="text-xs font-medium text-text-primary">{venta.escribanoNombre}{venta.escribanoRegistro ? ` · Reg. ${venta.escribanoRegistro}` : ""}</p>}
                {venta.fechaEscritura && (
                  <p className="text-xs text-text-muted flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Escritura tentativa: {fmtFechaLarga(venta.fechaEscritura)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border space-y-2 shrink-0">
          <button onClick={handleReimprimir} className="w-full btn-primary text-sm flex items-center justify-center gap-2">
            <Printer className="w-3.5 h-3.5" />Reimprimir boleto
          </button>
          {isAdmin && (
            <button onClick={handleDelete} disabled={deleting} className="w-full text-sm py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 flex items-center justify-center gap-2 transition-colors">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Eliminar boleto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ContratoDocumentoModal ───────────────────────────────────────────────────

function ContratoDocumentoModal({
  contrato, config, inmobiliaria, onClose,
}: {
  contrato: Contrato;
  config: Config | null;
  inmobiliaria: WizardInmobiliaria | null;
  onClose: () => void;
}) {
  const colorPrimario = config?.colorPrimario ?? "#8B4513";
  const colorSecundario = config?.colorSecundario ?? "#2C2C2C";
  const razonSocial = config?.razonSocial ?? inmobiliaria?.nombre ?? "Inmobiliaria";
  const cuit = config?.cuit ?? "";
  const domicilio = config?.domicilioLegal ?? "";
  const matricula = config?.matriculaCorredora ?? "";
  const clausulas = config?.clausulasAdicionales ?? DEFAULT_CLAUSULAS;
  const pie = config?.piePaginaContrato ?? [razonSocial, inmobiliaria?.whatsapp && `Tel: ${inmobiliaria.whatsapp}`, inmobiliaria?.email].filter(Boolean).join(" · ");
  const hoyStr = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const meses = duracionMeses(contrato.fechaInicio, contrato.fechaFin);

  function handlePrint() {
    const el = document.getElementById("contrato-doc-inner");
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) { toast.error("Habilitá las ventanas emergentes para imprimir"); return; }
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Contrato — ${contrato.inquilinoNombre}</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#1a1a1a;background:#fff}
.doc-header{background:${colorPrimario};color:#fff;padding:20px 28px;display:flex;align-items:center;gap:20px}
.doc-header img{height:64px;width:auto;object-fit:contain;background:#fff;border-radius:8px;padding:6px}
.header-info h1{font-size:17px;font-weight:700;line-height:1.2}.header-info p{font-size:10px;opacity:.85;margin-top:2px}
.title-bar{background:${colorSecundario};color:#fff;text-align:center;padding:9px;font-size:13px;font-weight:700;letter-spacing:2.5px}
.body{padding:24px 28px}.intro{margin-bottom:18px;font-size:11px;line-height:1.7;color:#333}
.section{margin-bottom:16px}.section-title{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${colorPrimario};border-bottom:1.5px solid ${colorPrimario};padding-bottom:4px;margin-bottom:10px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.field .field-label{font-size:8.5px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.8px}
.field .field-val{font-weight:600;margin-top:2px;font-size:11px}.field .field-val-lg{font-weight:700;font-size:15px;color:${colorPrimario};margin-top:2px}
.clausulas{white-space:pre-wrap;font-size:10px;line-height:1.7;color:#444}
.firmas{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px}
.firma-line{height:40px;border-bottom:1px solid #aaa;margin-bottom:6px}.firma-label{font-size:9.5px;font-weight:700;text-align:center;color:#333}
.firma-sub{font-size:9px;text-align:center;color:#888;margin-top:2px}
.doc-footer{border-top:2px solid ${colorPrimario};background:#f7f7f7;padding:10px 20px;font-size:9px;color:#666;text-align:center;margin-top:16px}
@media print{@page{margin:10mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto flex flex-col items-center pt-6 pb-10 px-4">
      <div className="w-full max-w-2xl flex items-center justify-between mb-3 px-1">
        <p className="text-white text-sm font-medium">Contrato · {contrato.inquilinoNombre}</p>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-gray-800 hover:bg-gray-100 shadow transition-colors">
            <Printer className="w-3.5 h-3.5" />Imprimir / Guardar PDF
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div id="contrato-doc-inner">
          <div className="doc-header flex items-center gap-5 p-6" style={{ background: colorPrimario }}>
            {inmobiliaria?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inmobiliaria.logoUrl} alt={razonSocial} className="h-16 w-auto object-contain bg-white rounded-lg p-1.5 shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                <span className="text-white text-2xl font-bold">{razonSocial.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="text-white">
              <p className="font-bold text-xl leading-tight">{razonSocial}</p>
              {cuit && <p className="text-sm opacity-85 mt-0.5">CUIT: {cuit}</p>}
              {domicilio && <p className="text-sm opacity-80">{domicilio}</p>}
              {matricula && <p className="text-xs opacity-70 mt-0.5">Matrícula corredor N° {matricula}</p>}
            </div>
          </div>
          <div className="title-bar py-3 text-center font-bold tracking-widest text-sm text-white" style={{ background: colorSecundario }}>
            CONTRATO DE LOCACIÓN
          </div>
          <div className="body p-7 space-y-6 text-sm">
            <p className="intro text-text-secondary leading-relaxed">
              En la ciudad de Paso de los Libres, Corrientes, a los <strong>{hoyStr}</strong>, entre{" "}
              <strong>{razonSocial}</strong>{cuit ? `, CUIT ${cuit}` : ""}{domicilio ? `, con domicilio en ${domicilio}` : ""}{matricula ? `, corredor inmobiliario matrícula N° ${matricula}` : ""},
              en adelante el <strong>LOCADOR</strong>; y <strong>{contrato.inquilinoNombre}</strong>, tel. {contrato.inquilinoTel}, en adelante el <strong>LOCATARIO</strong>; se celebra el presente Contrato de Locación bajo los siguientes términos y condiciones:
            </p>
            <section className="section">
              <p className="section-title text-[10px] font-bold uppercase tracking-widest pb-1 border-b mb-3" style={{ color: colorPrimario, borderColor: colorPrimario }}>Inmueble locado</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="field"><p className="field-label text-[9px] font-bold uppercase tracking-wide text-text-muted">Propiedad</p><p className="field-val font-semibold mt-0.5">{contrato.propiedad.titulo}</p></div>
                <div className="field"><p className="field-label text-[9px] font-bold uppercase tracking-wide text-text-muted">Dirección</p><p className="field-val font-semibold mt-0.5">{contrato.propiedad.direccion}</p></div>
              </div>
            </section>
            <section className="section">
              <p className="section-title text-[10px] font-bold uppercase tracking-widest pb-1 border-b mb-3" style={{ color: colorPrimario, borderColor: colorPrimario }}>Condiciones económicas</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="field"><p className="field-label text-[9px] font-bold uppercase tracking-wide text-text-muted">Canon mensual</p><p className="field-val-lg text-lg font-bold mt-0.5" style={{ color: colorPrimario }}>{formatPrice(contrato.precioMensual, contrato.moneda)}</p></div>
                <div className="field"><p className="field-label text-[9px] font-bold uppercase tracking-wide text-text-muted">Moneda</p><p className="field-val font-semibold mt-0.5">{contrato.moneda}</p></div>
                <div className="field"><p className="field-label text-[9px] font-bold uppercase tracking-wide text-text-muted">Día de pago</p><p className="field-val font-semibold mt-0.5">Día {contrato.diaVencimientoPago} de cada mes</p></div>
              </div>
            </section>
            <section className="section">
              <p className="section-title text-[10px] font-bold uppercase tracking-widest pb-1 border-b mb-3" style={{ color: colorPrimario, borderColor: colorPrimario }}>Vigencia</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="field"><p className="field-label text-[9px] font-bold uppercase tracking-wide text-text-muted">Fecha de inicio</p><p className="field-val font-semibold mt-0.5">{fmtFechaLarga(contrato.fechaInicio)}</p></div>
                <div className="field"><p className="field-label text-[9px] font-bold uppercase tracking-wide text-text-muted">Fecha de fin</p><p className="field-val font-semibold mt-0.5">{fmtFechaLarga(contrato.fechaFin)}</p></div>
                <div className="field"><p className="field-label text-[9px] font-bold uppercase tracking-wide text-text-muted">Duración</p><p className="field-val font-semibold mt-0.5">{meses} meses</p></div>
              </div>
            </section>
            <section className="section">
              <p className="section-title text-[10px] font-bold uppercase tracking-widest pb-1 border-b mb-3" style={{ color: colorPrimario, borderColor: colorPrimario }}>Cláusulas y condiciones</p>
              <pre className="clausulas whitespace-pre-wrap text-xs leading-relaxed text-text-secondary font-sans">{clausulas}</pre>
            </section>
            <div className="firmas grid grid-cols-2 gap-16 pt-8">
              <div className="text-center"><div className="firma-line h-12 border-b border-gray-300 mb-2" /><p className="firma-label text-xs font-semibold text-text-primary">LOCADOR / INMOBILIARIA</p><p className="firma-sub text-[10px] text-text-muted">{razonSocial}</p>{matricula && <p className="firma-sub text-[10px] text-text-muted">Mat. N° {matricula}</p>}</div>
              <div className="text-center"><div className="firma-line h-12 border-b border-gray-300 mb-2" /><p className="firma-label text-xs font-semibold text-text-primary">LOCATARIO</p><p className="firma-sub text-[10px] text-text-muted">{contrato.inquilinoNombre}</p><p className="firma-sub text-[10px] text-text-muted">Tel: {contrato.inquilinoTel}</p></div>
            </div>
          </div>
          <div className="doc-footer px-7 py-3 text-[10px] text-center border-t-2" style={{ borderColor: colorPrimario, background: "#f8f8f8", color: "#666" }}>{pie}</div>
        </div>
      </div>
    </div>
  );
}

// ─── AlquileresClient (main) ──────────────────────────────────────────────────

export function AlquileresClient({
  contratos: initialContratos, ventas: initialVentas, propiedades, isAdmin, config, inmobiliaria,
}: Props) {
  const [contratos, setContratos] = useState(initialContratos);
  const [ventas, setVentas] = useState(initialVentas);

  const [tipoTab, setTipoTab] = useState<TipoTab>("alquiler");
  const [filtroAlq, setFiltroAlq] = useState<FiltroAlq>("activos");
  const [busqueda, setBusqueda] = useState("");

  const [selectedAlqId, setSelectedAlqId] = useState<string | null>(null);
  const [selectedVentaId, setSelectedVentaId] = useState<string | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  // ── Stats alquiler
  const statsAlq = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    const activos = contratos.filter((c) => c.fechaFin >= hoy);
    return {
      total: activos.length,
      atrasados: contratos.filter((c) => c.estadoPago === "ATRASADO").length,
      proximoVence: contratos.filter((c) => { const d = getDiasRestantes(c.fechaFin); return d >= 0 && d <= 30; }).length,
    };
  }, [contratos]);

  // ── Filtrado alquileres
  const filtradosAlq = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    let list = contratos;
    if (filtroAlq === "activos") list = list.filter((c) => c.fechaFin >= hoy);
    else if (filtroAlq === "atrasados") list = list.filter((c) => c.estadoPago === "ATRASADO");
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter((c) =>
        c.inquilinoNombre.toLowerCase().includes(q) ||
        c.propiedad.titulo.toLowerCase().includes(q) ||
        c.propiedad.direccion.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contratos, filtroAlq, busqueda]);

  // ── Filtrado compraventas
  const filtradosVentas = useMemo(() => {
    if (!busqueda.trim()) return ventas;
    const q = busqueda.toLowerCase();
    return ventas.filter((v) =>
      v.vendedorNombre.toLowerCase().includes(q) ||
      v.compradorNombre.toLowerCase().includes(q) ||
      v.propiedadDireccion.toLowerCase().includes(q)
    );
  }, [ventas, busqueda]);

  const selectedAlq = useMemo(() => contratos.find((c) => c.id === selectedAlqId) ?? null, [contratos, selectedAlqId]);
  const selectedVenta = useMemo(() => ventas.find((v) => v.id === selectedVentaId) ?? null, [ventas, selectedVentaId]);

  const handleEstadoChange = useCallback((id: string, estado: "AL_DIA" | "ATRASADO") => {
    setContratos((prev) => prev.map((c) => c.id === id ? { ...c, estadoPago: estado } : c));
  }, []);

  const handleDeleteAlq = useCallback((id: string) => {
    setContratos((prev) => prev.filter((c) => c.id !== id));
    setSelectedAlqId(null);
    setShowDoc(false);
  }, []);

  const handleDeleteVenta = useCallback((id: string) => {
    setVentas((prev) => prev.filter((v) => v.id !== id));
    setSelectedVentaId(null);
  }, []);

  const handleCreatedAlq = useCallback((c: ContratoCreado) => {
    setContratos((prev) => [c as Contrato, ...prev]);
    setShowNuevo(false);
    toast.success("Contrato de alquiler creado");
  }, []);

  const handleCreatedVenta = useCallback((v: ContratoVentaCreado) => {
    setVentas((prev) => [v as ContratoVenta, ...prev]);
    setShowNuevo(false);
    setTipoTab("compraventa");
    toast.success("Boleto de compraventa guardado");
  }, []);

  const TABS_ALQ: { key: FiltroAlq; label: string }[] = [
    { key: "activos",   label: `Activos (${statsAlq.total})` },
    { key: "atrasados", label: `Atrasados (${statsAlq.atrasados})` },
    { key: "todos",     label: `Todos (${contratos.length})` },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-brand-primary" />
            Contratos
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {statsAlq.total} alquiler{statsAlq.total !== 1 ? "es" : ""} activo{statsAlq.total !== 1 ? "s" : ""} · {ventas.length} boleto{ventas.length !== 1 ? "s" : ""} de compraventa
          </p>
        </div>
        <button onClick={() => setShowNuevo(true)} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />Nuevo contrato
        </button>
      </div>

      {/* Tipo tab principal */}
      <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
        <button
          onClick={() => setTipoTab("alquiler")}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: tipoTab === "alquiler" ? "var(--surface)" : "transparent",
            color: tipoTab === "alquiler" ? "var(--brand-primary)" : "var(--text-muted)",
            boxShadow: tipoTab === "alquiler" ? "var(--shadow-card)" : "none",
          }}
        >
          <Home className="w-4 h-4" />
          Alquileres ({contratos.length})
        </button>
        <button
          onClick={() => setTipoTab("compraventa")}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: tipoTab === "compraventa" ? "var(--surface)" : "transparent",
            color: tipoTab === "compraventa" ? "#D4A853" : "var(--text-muted)",
            boxShadow: tipoTab === "compraventa" ? "var(--shadow-card)" : "none",
          }}
        >
          <Gavel className="w-4 h-4" />
          Compraventas ({ventas.length})
        </button>
      </div>

      {/* Stats (solo alquileres) */}
      {tipoTab === "alquiler" && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Contratos activos" value={statsAlq.total} color="var(--brand-primary)" />
          <StatCard label="Vencen en 30 días" value={statsAlq.proximoVence} color={statsAlq.proximoVence > 0 ? "#F59E0B" : undefined} />
          <StatCard label="Pagos atrasados" value={statsAlq.atrasados} color={statsAlq.atrasados > 0 ? "#EF4444" : undefined} />
        </div>
      )}

      {/* Stats compraventas */}
      {tipoTab === "compraventa" && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Boletos registrados" value={ventas.length} color="#D4A853" />
          <StatCard
            label="Valor total"
            value={Math.round(ventas.filter(v => v.moneda === "USD").reduce((s, v) => s + v.precioVenta, 0))}
            color="var(--brand-primary)"
          />
        </div>
      )}

      {/* Sub-filtros alquileres */}
      {tipoTab === "alquiler" && (
        <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
          {TABS_ALQ.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltroAlq(key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filtroAlq === key ? "var(--surface)" : "transparent",
                color: filtroAlq === key ? "var(--brand-primary)" : "var(--text-muted)",
                boxShadow: filtroAlq === key ? "var(--shadow-card)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={tipoTab === "alquiler" ? "Buscar por inquilino o propiedad..." : "Buscar por vendedor, comprador o dirección..."}
          className="input-base pl-9 text-sm"
        />
        {busqueda && (
          <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Lista alquileres */}
      {tipoTab === "alquiler" && (
        <div className="space-y-3">
          {filtradosAlq.length === 0 ? (
            <div className="card p-10 text-center">
              <Home className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">
                {busqueda ? "Sin resultados para tu búsqueda" : filtroAlq === "atrasados" ? "No hay pagos atrasados" : filtroAlq === "activos" ? "No hay contratos activos" : "No hay contratos registrados"}
              </p>
              {(busqueda || filtroAlq !== "todos") && (
                <button onClick={() => { setBusqueda(""); setFiltroAlq("todos"); }} className="text-brand-primary text-xs mt-2 hover:underline">Ver todos</button>
              )}
            </div>
          ) : (
            filtradosAlq.map((c) => (
              <ContratoCard key={c.id} contrato={c} onClick={() => setSelectedAlqId(c.id)} />
            ))
          )}
        </div>
      )}

      {/* Lista compraventas */}
      {tipoTab === "compraventa" && (
        <div className="space-y-3">
          {filtradosVentas.length === 0 ? (
            <div className="card p-10 text-center">
              <Gavel className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">
                {busqueda ? "Sin resultados para tu búsqueda" : "No hay boletos de compraventa registrados"}
              </p>
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="text-brand-primary text-xs mt-2 hover:underline">Limpiar búsqueda</button>
              )}
              {!busqueda && (
                <button onClick={() => setShowNuevo(true)} className="text-brand-primary text-xs mt-2 hover:underline flex items-center gap-1 mx-auto">
                  <Plus className="w-3 h-3" />Crear primer boleto
                </button>
              )}
            </div>
          ) : (
            filtradosVentas.map((v) => (
              <ContratoVentaCard key={v.id} venta={v} onClick={() => setSelectedVentaId(v.id)} />
            ))
          )}
        </div>
      )}

      {/* Detalle sheet alquiler */}
      {selectedAlq && (
        <ContratoDetalleSheet
          contrato={selectedAlq}
          isAdmin={isAdmin}
          onClose={() => { setSelectedAlqId(null); setShowDoc(false); }}
          onEstadoChange={handleEstadoChange}
          onDelete={handleDeleteAlq}
          onVerDocumento={() => setShowDoc(true)}
        />
      )}

      {/* Detalle sheet compraventa */}
      {selectedVenta && (
        <ContratoVentaDetalleSheet
          venta={selectedVenta}
          isAdmin={isAdmin}
          config={config}
          inmobiliaria={inmobiliaria}
          onClose={() => setSelectedVentaId(null)}
          onDelete={handleDeleteVenta}
        />
      )}

      {/* Nuevo contrato wizard */}
      {showNuevo && (
        <NuevoContratoWizard
          propiedades={propiedades}
          config={config}
          inmobiliaria={inmobiliaria}
          onClose={() => setShowNuevo(false)}
          onCreated={handleCreatedAlq}
          onVentaCreated={handleCreatedVenta}
        />
      )}

      {/* Preview impresión alquiler */}
      {showDoc && selectedAlq && (
        <ContratoDocumentoModal
          contrato={selectedAlq}
          config={config}
          inmobiliaria={inmobiliaria}
          onClose={() => setShowDoc(false)}
        />
      )}
    </div>
  );
}
