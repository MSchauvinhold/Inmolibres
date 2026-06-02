"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { formatPrice, buildWhatsAppLink } from "@/lib/utils";
import {
  Plus, FileText, Loader2, Printer, X,
  Phone, Trash2, ChevronRight, ScrollText,
  Gavel, Search, Home, Calendar,
  Download, Send, Users, MessageSquare, CheckCircle2,
  Receipt, Clock, TrendingUp, ArrowLeft, Save, Check, Upload,
} from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  buildContratoAlquilerHtml,
  buildContratoVentaHtml,
  printHtml,
  duracionMeses,
  type PdfConfig,
} from "@/lib/contrato-pdf";
import { Pill } from "@/components/ui/pill";
import {
  NuevoContratoWizard,
  type ContratoCreado,
  type ContratoVentaCreado,
  type PropiedadItem,
  type WizardConfig,
  type WizardInmobiliaria,
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
  notas: string | null;
  createdAt: string;
  propiedad: { id: string; titulo: string; direccion: string };
  // Configuración de ajuste periódico
  ajusteActivo: boolean;
  ajusteIndice: string;
  ajusteMeses: number;
  ajusteDia: number;
  indiceUltimoAjuste: number | null;
  precioOriginal: number | null;
  // Administración mensual
  administracionPct: number;
  // Firma
  tipoFirma: string | null;
  contratoFirmadoUrl: string | null;
  fechaFirmado: string | null;
}

interface ContratoVenta {
  id: string;
  inmobiliariaId: string;
  propiedadDireccion: string;
  propiedadDescripcion: string | null;
  matriculaInmueble: string | null;
  vendedorNombre: string;
  vendedorDni: string;
  vendedorTel: string | null;
  vendedorDomicilio: string | null;
  vendedorEstadoCivil: string;
  vendedorConyuge: string | null;
  compradorNombre: string;
  compradorDni: string;
  compradorTel: string | null;
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
  notas: string | null;
  tipoFirma: string | null;
  createdAt: string;
}

interface PagoItem {
  id: string;
  concepto: string;
  monto: number;
  moneda: "ARS" | "USD";
  metodoPago: string | null;
  fecha: string;
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
type FiltroAlq = "al_dia" | "atrasados" | "vence_pronto" | "todos";

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

// duracionMeses viene de @/lib/contrato-pdf

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, mono }: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="il-card" style={{ padding: 16 }}>
      <p
        className="mono"
        style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        {label}
      </p>
      <p
        className={mono ? "mono" : ""}
        style={{ fontSize: 26, fontWeight: 600, color: color ?? "var(--antracita-900)", marginTop: 8, lineHeight: 1, letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 6 }}>{sub}</p>
      )}
    </div>
  );
}

// ─── StatusItem (para el status strip del detalle) ────────────────────────────

function StatusItem({ label, value, tone, mono, small }: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
  mono?: boolean;
  small?: boolean;
}) {
  const fg = tone === "success" ? "var(--success-500)"
    : tone === "warning"  ? "var(--warning-500)"
    : tone === "danger"   ? "var(--danger-500)"
    : "var(--antracita-900)";
  return (
    <div style={{ padding: "14px 18px", borderRight: "1px solid var(--border)" }}>
      <div className="mono" style={{ fontSize: 9.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </div>
      <div className={mono ? "mono" : "display"} style={{ fontSize: small ? 12.5 : 14, fontWeight: 600, color: fg, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

// ─── ContratoCard (alquiler) ──────────────────────────────────────────────────

function ContratoCard({ contrato, onClick }: { contrato: Contrato; onClick: () => void }) {
  const key = getEstadoKey(contrato);
  const style = ESTADO_STYLES[key];
  const dias = getDiasRestantes(contrato.fechaFin);
  const borderColor =
    key === "ok" ? "var(--success-500, #22C55E)"
    : key === "atrasado" ? "var(--danger-500, #EF4444)"
    : key === "proximo" ? "var(--warning-500, #F59E0B)"
    : "var(--antracita-300)";

  return (
    <button
      onClick={onClick}
      className="il-card w-full text-left"
      style={{ padding: 0, overflow: "hidden", borderLeft: `4px solid ${borderColor}` }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.4fr 1fr 1.2fr auto",
          gap: 24,
          padding: "18px 22px",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--antracita-900)" }}>
            {contrato.propiedad.titulo}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 3 }}>
            {contrato.propiedad.direccion}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Inquilino
          </div>
          <div style={{ fontSize: 13, color: "var(--antracita-900)", fontWeight: 500, marginTop: 2 }}>
            {contrato.inquilinoNombre}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--antracita-500)" }}>
            {contrato.inquilinoTel}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Alquiler · Día {contrato.diaVencimientoPago}
          </div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--antracita-900)", marginTop: 2 }}>
            {formatPrice(contrato.precioMensual, contrato.moneda)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Fin contrato
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <span className="mono" style={{ fontSize: 13.5, color: "var(--antracita-900)", fontWeight: 500 }}>
              {fmtFecha(contrato.fechaFin)}
            </span>
            <span style={{ fontSize: 11, color: "var(--antracita-500)" }}>
              · <span className="mono">{dias < 0 ? `−${Math.abs(dias)}` : dias}</span>d
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 22,
              padding: "0 9px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              background: key === "ok" ? "var(--success-100, #DCFCE7)"
                : key === "atrasado" ? "var(--danger-100, #FEE2E2)"
                : "var(--warning-100, #FEF3C7)",
              color: key === "ok" ? "var(--success-500)"
                : key === "atrasado" ? "var(--danger-500)"
                : "var(--warning-500)",
            }}
          >
            {style.label}
          </span>
          {contrato.contratoFirmadoUrl && (
            <span title="Contrato firmado subido" style={{ display: "inline-flex", alignItems: "center", width: 20, height: 20, borderRadius: 999, background: "var(--success-100, #DCFCE7)", justifyContent: "center", flexShrink: 0 }}>
              <CheckCircle2 size={11} style={{ color: "var(--success-600, #16a34a)" }} />
            </span>
          )}
          <ChevronRight size={16} style={{ color: "var(--antracita-300)", flexShrink: 0 }} />
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
      className="il-card w-full text-left"
      style={{ padding: 0, overflow: "hidden", borderLeft: "4px solid var(--dorado-500, #C9A55C)" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.4fr 1fr auto",
          gap: 24,
          padding: "18px 22px",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--antracita-900)" }}>
            {venta.propiedadDireccion}
          </div>
          {venta.propiedadDescripcion && (
            <div style={{ fontSize: 11.5, color: "var(--antracita-500)", marginTop: 3 }}>
              {venta.propiedadDescripcion}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Vendedor
          </div>
          <div style={{ fontSize: 13, color: "var(--antracita-900)", fontWeight: 500, marginTop: 2 }}>
            {venta.vendedorNombre}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--antracita-500)" }}>{venta.vendedorDni}</div>
          <div style={{ fontSize: 10.5, color: "var(--antracita-300)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Comprador
          </div>
          <div style={{ fontSize: 13, color: "var(--antracita-900)", fontWeight: 500 }}>
            {venta.compradorNombre}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--antracita-500)" }}>{venta.compradorDni}</div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Precio venta
          </div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--antracita-900)", marginTop: 2 }}>
            {formatPrice(venta.precioVenta, venta.moneda)}
          </div>
          {venta.fechaEscritura && (
            <div style={{ fontSize: 10.5, color: "var(--antracita-500)", marginTop: 3 }}>
              Escrit. {fmtFecha(venta.fechaEscritura)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 22,
              padding: "0 9px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              background: "var(--warning-100, #FEF3C7)",
              color: "var(--warning-500, #F59E0B)",
            }}
          >
            Boleto CV
          </span>
          <ChevronRight size={16} style={{ color: "var(--antracita-300)", flexShrink: 0 }} />
        </div>

      </div>
    </button>
  );
}

// ─── DocumentoPreview (preview embebido en el detalle modal) ─────────────────

// ─── DocumentoFirmadoPreview — muestra el contrato firmado subido ─────────────

function DocumentoFirmadoPreview({ url, fecha }: { url: string; fecha: string | null }) {
  const isPdf = url.toLowerCase().includes(".pdf") || url.includes("/raw/upload/") || url.includes("pdf");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--success-50, #f0fdf4)", border: "1px solid var(--success-200, #bbf7d0)", borderRadius: 10 }}>
        <CheckCircle2 size={14} style={{ color: "var(--success-600, #16a34a)", flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--success-700, #15803d)" }}>
            Contrato firmado
          </span>
          {fecha && (
            <span style={{ fontSize: 11, color: "var(--success-600)", marginLeft: 6 }}>
              · subido el {new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="il-btn il-btn--ghost"
          style={{ marginLeft: "auto", fontSize: 11, height: 28, gap: 4, textDecoration: "none" }}
        >
          <Download size={12} /> Descargar
        </a>
      </div>

      {/* Preview */}
      {isPdf ? (
        <iframe
          src={url}
          title="Contrato firmado"
          style={{ width: "100%", height: 600, border: "none", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Contrato firmado"
          style={{ width: "100%", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", objectFit: "contain", maxHeight: 700 }}
        />
      )}
    </div>
  );
}

// ─── DocumentoPreview — preview generado (cuando aún no hay firmado) ──────────

function DocumentoPreview({
  contrato, config, inmobiliaria, onPrint,
}: {
  contrato: Contrato;
  config: Config | null;
  inmobiliaria: WizardInmobiliaria | null;
  onPrint: () => void;
}) {
  const colorPrimario   = config?.colorPrimario   ?? "#1B4332";
  const colorSecundario = config?.colorSecundario  ?? "#2C2C2C";
  const razonSocial     = config?.razonSocial ?? inmobiliaria?.nombre ?? "Inmobiliaria";
  const cuit            = config?.cuit ?? "";
  const domicilio       = config?.domicilioLegal ?? "";
  const matricula       = config?.matriculaCorredora ?? "";
  const pie             = config?.piePaginaContrato ?? [razonSocial, inmobiliaria?.whatsapp && `Tel: ${inmobiliaria.whatsapp}`].filter(Boolean).join(" · ");
  const hoyStr          = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const meses           = duracionMeses(contrato.fechaInicio, contrato.fechaFin);
  const ctr             = `CTR-${contrato.id.slice(-4).toUpperCase()}`;

  return (
    <div>
      {/* Dark toolbar */}
      <div style={{
        background: "var(--antracita-900)", borderRadius: "10px 10px 0 0",
        padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--crema-300)", letterSpacing: "0.04em" }}>
          {ctr}_alquiler_{contrato.propiedad.titulo.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}.pdf
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onPrint}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "var(--crema-100)", fontSize: 11, cursor: "pointer" }}
          >
            <Printer size={11} /> Imprimir
          </button>
          <button
            onClick={onPrint}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "var(--crema-100)", fontSize: 11, cursor: "pointer" }}
          >
            <Download size={11} /> Descargar
          </button>
        </div>
      </div>

      {/* Document page */}
      <div style={{
        background: "#fff", borderRadius: "0 0 10px 10px",
        padding: "36px 40px 32px",
        boxShadow: "var(--shadow-lg, 0 8px 32px rgba(58,35,18,0.12))",
        borderTop: `4px solid ${colorPrimario}`,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}>
        {/* Header band */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, borderBottom: "1px solid var(--border)", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {inmobiliaria?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inmobiliaria.logoUrl} alt={razonSocial} style={{ height: 48, width: "auto", objectFit: "contain", background: "#fff", borderRadius: 8, padding: 4 }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 10, background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 600, flexShrink: 0 }}>
                {razonSocial.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="display" style={{ fontSize: 18, fontWeight: 600, color: "var(--antracita-900)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {razonSocial}
              </div>
              {cuit && <div className="mono" style={{ fontSize: 10, color: "var(--antracita-500)", marginTop: 4, letterSpacing: "0.04em" }}>CUIT {cuit}{matricula ? ` · Mat. ${matricula}` : ""}</div>}
              {domicilio && <div style={{ fontSize: 10.5, color: "var(--antracita-500)", marginTop: 2 }}>{domicilio}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Folio</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--antracita-900)", marginTop: 2 }}>{ctr}</div>
            <div style={{ fontSize: 10, color: "var(--antracita-500)", marginTop: 6 }}>Emitido {hoyStr}</div>
          </div>
        </div>

        {/* Doc title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="mono" style={{ fontSize: 9.5, color: colorPrimario, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 600 }}>
            Ley 27.551 — Régimen general
          </div>
          <h2 className="display" style={{ fontSize: 24, margin: "8px 0 0", color: "var(--antracita-900)" }}>
            Contrato de Locación de Inmueble
          </h2>
        </div>

        {/* Parties */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { role: "Locador / Inmobiliaria", name: razonSocial, detail: cuit ? `CUIT ${cuit}` : domicilio, tone: colorPrimario },
            { role: "Locatario",              name: contrato.inquilinoNombre, detail: contrato.inquilinoTel, tone: "var(--accent, #D4A853)" },
          ].map((p) => (
            <div key={p.role} style={{ padding: "11px 13px", background: "var(--crema-100)", border: "1px solid var(--border)", borderTop: `3px solid ${p.tone}`, borderRadius: 8 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{p.role}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginTop: 4 }}>{p.name}</div>
              {p.detail && <div className="mono" style={{ fontSize: 10, color: "var(--antracita-500)", marginTop: 2 }}>{p.detail}</div>}
            </div>
          ))}
        </div>

        {/* Property */}
        <div style={{ background: "var(--crema-50)", border: "1px dashed var(--border)", borderRadius: 9, padding: 13, marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>Inmueble objeto del contrato</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--antracita-900)" }}>{contrato.propiedad.titulo}</div>
              <div style={{ fontSize: 11, color: "var(--antracita-500)" }}>{contrato.propiedad.direccion}</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase" }}>Duración</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginTop: 3 }}>{meses} meses</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase" }}>Día de pago</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginTop: 3 }}>Día {contrato.diaVencimientoPago}</div>
            </div>
          </div>
        </div>

        {/* Economic conditions */}
        <div style={{ marginBottom: 4 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--antracita-900)", margin: "0 0 10px", letterSpacing: "0.02em" }}>I — Condiciones económicas</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { l: "Valor inicial",   v: formatPrice(contrato.precioMensual, contrato.moneda), s: `${contrato.moneda} · mensual`, terra: true },
              { l: "Día de pago",    v: String(contrato.diaVencimientoPago), s: "de cada mes" },
              { l: "Plazo",          v: `${meses} meses`, s: `${fmtFecha(contrato.fechaInicio)} – ${fmtFecha(contrato.fechaFin)}` },
              { l: "Ajuste",         v: contrato.ajusteActivo ? `${contrato.ajusteIndice} · ${contrato.ajusteIndice === "ICL" ? "BCRA" : "INDEC"}` : "Sin ajuste", s: contrato.ajusteActivo ? `cada ${contrato.ajusteMeses} meses` : "precio fijo" },
              ...(contrato.administracionPct > 0 ? [{
                l: "Administración",
                v: formatPrice(contrato.precioMensual * contrato.administracionPct / 100, contrato.moneda),
                s: `${contrato.administracionPct}% · por mes`,
              }] : []),
            ].map((f) => (
              <div key={f.l} style={{ padding: "9px 11px", background: f.terra ? "var(--terracota-100, #FAE8E2)" : "var(--crema-100)", border: f.terra ? "1px solid var(--terracota-300, #E0A088)" : "1px solid var(--border)", borderRadius: 7 }}>
                <div className="mono" style={{ fontSize: 9, color: f.terra ? colorPrimario : "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{f.l}</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: f.terra ? colorPrimario : "var(--antracita-900)", marginTop: 4 }}>{f.v}</div>
                <div style={{ fontSize: 9.5, color: "var(--antracita-500)", marginTop: 2 }}>{f.s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Intro text */}
        <p style={{ fontSize: 11, color: "var(--antracita-700)", lineHeight: 1.7, marginBottom: 16 }}>
          En la ciudad de <strong>Paso de los Libres, Corrientes</strong>, entre <strong>{razonSocial}</strong>{cuit ? `, CUIT ${cuit}` : ""}, y <strong>{contrato.inquilinoNombre}</strong>, tel. {contrato.inquilinoTel}, se celebra el presente Contrato de Locación bajo los términos y condiciones que se detallan:
        </p>

        {/* Clauses preview */}
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--antracita-900)", margin: "0 0 8px", letterSpacing: "0.02em" }}>II — Cláusulas (extracto)</h3>
        <div style={{ fontSize: 11, color: "var(--antracita-700)", lineHeight: 1.7, columns: 2, columnGap: 20, marginBottom: 24 }}>
          <p style={{ margin: "0 0 8px" }}><strong>1ª — Destino.</strong> El inmueble se destinará exclusivamente a uso habitacional familiar del Locatario y su grupo conviviente. Queda expresamente prohibida la sublocación.</p>
          <p style={{ margin: "0 0 8px" }}><strong>2ª — Plazo.</strong> El plazo de locación es de {meses} meses contados desde el {fmtFechaLarga(contrato.fechaInicio)} hasta el {fmtFechaLarga(contrato.fechaFin)}, conforme al art. 1198 CCyCN.</p>
          <p style={{ margin: "0 0 8px" }}><strong>3ª — Precio.</strong> Las partes acuerdan un precio mensual de <strong>{formatPrice(contrato.precioMensual, contrato.moneda)}</strong>, pagadero del 1° al {contrato.diaVencimientoPago}° día de cada mes.</p>
          <p style={{ margin: "0 0 8px", color: "var(--antracita-400)", fontStyle: "italic" }}>… continúa en las páginas 2 a 4</p>
        </div>

        {/* Signatures */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          {[
            { r: "Locador / Inmobiliaria", n: razonSocial, firmable: true },
            { r: "Locatario",              n: contrato.inquilinoNombre, firmable: false },
          ].map((s) => {
            const mostrarFirma = s.firmable && contrato.tipoFirma === "DIGITAL" && inmobiliaria?.firmaUrl;
            return (
              <div key={s.r} style={{ textAlign: "center" }}>
                {mostrarFirma ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inmobiliaria!.firmaUrl!}
                    alt="Firma"
                    style={{ height: 52, maxWidth: 160, objectFit: "contain", margin: "0 auto 6px", display: "block" }}
                  />
                ) : (
                  <div style={{ height: 52, borderBottom: "1px solid var(--antracita-700)", marginBottom: 6 }} />
                )}
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--antracita-700)" }}>{s.r}</div>
                <div style={{ fontSize: 10, color: "var(--antracita-500)", marginTop: 2 }}>{s.n}</div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 9, color: "var(--antracita-300)", fontFamily: "var(--font-mono)" }}>
          {pie}
        </div>

        {/* Watermark */}
        <div style={{ position: "absolute", top: 60, right: 30, transform: "rotate(8deg)", opacity: 0.04, fontFamily: "var(--font-display)", fontSize: 72, color: colorPrimario, pointerEvents: "none", fontWeight: 700 }}>
          VIGENTE
        </div>
      </div>
    </div>
  );
}

// ─── NotasEditor ──────────────────────────────────────────────────────────────

function NotasEditor({
  contratoId,
  tipo,
  initialNotas,
}: {
  contratoId: string;
  tipo: "alquiler" | "venta";
  initialNotas: string | null;
}) {
  const [notas, setNotas] = useState(initialNotas ?? "");
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [saved, setSaved]     = useState(false);

  const url =
    tipo === "alquiler"
      ? `/api/alquileres/${contratoId}`
      : `/api/contratos-venta/${contratoId}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas }),
      });
      if (!res.ok) throw new Error();
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Notas guardadas");
    } catch {
      toast.error("Error al guardar notas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>
            Notas internas
          </h3>
          <p style={{ fontSize: 11.5, color: "var(--antracita-400)", marginTop: 3 }}>
            Solo visibles para tu inmobiliaria · no aparecen en documentos ni contratos
          </p>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="il-btn il-btn--primary"
            style={{ height: 32, fontSize: 12, gap: 5, flexShrink: 0 }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
            {saving ? "Guardando…" : saved ? "Guardado" : "Guardar"}
          </button>
        )}
      </div>

      <textarea
        value={notas}
        onChange={(e) => { setNotas(e.target.value); setDirty(true); setSaved(false); }}
        rows={10}
        placeholder="Anotaciones internas sobre el contrato, condiciones especiales pactadas, observaciones sobre el inquilino/parte…"
        style={{
          width: "100%", padding: "10px 12px",
          border: `1px solid ${dirty ? "var(--terracota-300)" : "var(--border)"}`,
          borderRadius: 10,
          background: dirty ? "var(--terracota-50)" : "var(--crema-50)",
          fontSize: 13, fontFamily: "var(--font-body)", color: "var(--antracita-700)",
          outline: "none", resize: "vertical", lineHeight: 1.7,
          transition: "border-color 150ms, background 150ms",
        }}
      />

      {dirty && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="il-btn il-btn--primary"
            style={{ height: 36, fontSize: 13, gap: 6 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Guardando…" : "Guardar notas"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AjustesTab (configuración + historial de ajustes de un contrato) ───────────

const INP = "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors focus:ring-2";
const INP_STYLE = { borderColor: "#D4D0CB", background: "#FAFAF8", color: "#1a1a1a" };

function AjustesTab({ contrato, onSaved }: {
  contrato: Contrato;
  onSaved?: (cfg: { ajusteActivo: boolean; ajusteIndice: "ICL" | "IPC"; ajusteMeses: number; ajusteDia: number; administracionPct: number }) => void;
}) {
  const [ajusteActivo, setAjusteActivo] = useState(contrato.ajusteActivo);
  const [ajusteIndice, setAjusteIndice] = useState<"ICL" | "IPC">(
    (contrato.ajusteIndice === "IPC" ? "IPC" : "ICL") as "ICL" | "IPC"
  );
  const [ajusteMeses, setAjusteMeses] = useState(contrato.ajusteMeses ?? 6);
  const [ajusteDia, setAjusteDia] = useState(contrato.ajusteDia ?? 14);
  const [administracionPct, setAdministracionPct] = useState(contrato.administracionPct ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    ajusteActivo !== contrato.ajusteActivo ||
    ajusteIndice !== contrato.ajusteIndice ||
    ajusteMeses  !== contrato.ajusteMeses  ||
    ajusteDia    !== contrato.ajusteDia     ||
    administracionPct !== contrato.administracionPct;

  async function guardar() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/alquileres/${contrato.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ajusteActivo, ajusteIndice, ajusteMeses, ajusteDia, administracionPct }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      toast.success("Configuración guardada");
      // Notificar al padre para que actualice su estado local (status strip, etc.)
      onSaved?.({ ajusteActivo, ajusteIndice, ajusteMeses, ajusteDia, administracionPct });
    } catch {
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  // Calcular próximo ajuste estimado
  const proximoEstimado = ajusteActivo && contrato.fechaInicio ? (() => {
    const d = new Date(contrato.fechaInicio.slice(0, 10) + "T00:00:00");
    d.setMonth(d.getMonth() + ajusteMeses);
    const maxDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(ajusteDia, maxDia));
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  })() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Config de ajuste ── */}
      <div>
        <h3 className="display" style={{ fontSize: 17, margin: "0 0 16px", color: "var(--antracita-900)" }}>
          Configuración de ajuste
        </h3>

        {/* Toggle activo */}
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 16 }}>
          <div
            style={{
              position: "relative", width: 40, height: 20, borderRadius: 99,
              background: ajusteActivo ? "#1B4332" : "#D4D0CB",
              transition: "background 0.2s", cursor: "pointer", flexShrink: 0,
            }}
            onClick={() => setAjusteActivo(!ajusteActivo)}
          >
            <div style={{
              position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%",
              background: "white", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
              transform: ajusteActivo ? "translateX(22px)" : "translateX(2px)",
              transition: "transform 0.2s",
            }} />
          </div>
          <span style={{ fontSize: 14, color: "var(--antracita-700)", fontWeight: 500 }}>
            Ajuste automático de precio activo
          </span>
        </label>

        {ajusteActivo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, background: "#F7F5F2", border: "1px solid #E8E5E0", borderRadius: 12 }}>

            {/* Selector de índice */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-400)", marginBottom: 8 }}>
                Índice de actualización
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["ICL", "IPC"] as const).map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAjusteIndice(idx)}
                    style={{
                      borderRadius: 10, padding: "10px 12px", textAlign: "left",
                      border: `2px solid ${ajusteIndice === idx ? "#1B4332" : "#D4D0CB"}`,
                      background: ajusteIndice === idx ? "#1B433210" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: ajusteIndice === idx ? "#1B4332" : "#3a3a3a" }}>
                      {idx === "ICL" ? "ICL — BCRA" : "IPC — INDEC"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#7a7a7a", marginTop: 2, lineHeight: 1.4 }}>
                      {idx === "ICL"
                        ? "Índice de Contratos de Locación. Obligatorio por Ley 27.737."
                        : "Índice de Precios al Consumidor."}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Frecuencia + día */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-400)", marginBottom: 6 }}>
                  Frecuencia
                </div>
                <select
                  className={INP}
                  style={INP_STYLE}
                  value={ajusteMeses}
                  onChange={(e) => setAjusteMeses(Number(e.target.value))}
                >
                  <option value={1}>Cada 1 mes</option>
                  <option value={2}>Cada 2 meses</option>
                  <option value={3}>Cada 3 meses</option>
                  <option value={6}>Cada 6 meses</option>
                  <option value={12}>Cada 12 meses</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--antracita-400)", marginBottom: 6 }}>
                  Día del mes
                </div>
                <input
                  type="number" min={1} max={28}
                  className={INP}
                  style={INP_STYLE}
                  value={ajusteDia}
                  onChange={(e) => setAjusteDia(Math.max(1, Math.min(28, Number(e.target.value))))}
                />
              </div>
            </div>

            {/* Próximo ajuste estimado */}
            {proximoEstimado && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "#1B433210", border: "1px solid #1B433230", borderRadius: 8 }}>
                <Calendar size={14} style={{ color: "#1B4332", marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1B4332" }}>Próximo ajuste estimado</div>
                  <div style={{ fontSize: 12, color: "#3a5a3a", marginTop: 2 }}>
                    {proximoEstimado} — el sistema lo notificará para confirmación.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!ajusteActivo && (
          <p style={{ fontSize: 13, color: "var(--antracita-400)" }}>
            El precio se mantiene fijo durante toda la vigencia del contrato.
          </p>
        )}

        {/* Administración mensual */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
          <h3 className="display" style={{ fontSize: 15, margin: "0 0 4px", color: "var(--antracita-900)" }}>
            Administración mensual
          </h3>
          <p style={{ fontSize: 12, color: "var(--antracita-400)", marginBottom: 12 }}>
            % del alquiler que cobrás de honorarios cada mes. 0 = no cobrás administración.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 140 }}>
              <input
                type="number" min={0} max={100} step={0.5}
                className={INP}
                style={INP_STYLE}
                value={administracionPct}
                onChange={(e) => setAdministracionPct(Math.max(0, Math.min(100, Number(e.target.value))))}
              />
            </div>
            {administracionPct > 0 && (
              <div style={{ padding: "8px 14px", background: "rgba(212,168,83,0.1)", border: "1px solid rgba(212,168,83,0.35)", borderRadius: 8 }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--dorado-700, #8a5c00)" }}>
                  {formatPrice(contrato.precioMensual * administracionPct / 100, contrato.moneda)}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "var(--antracita-400)" }}> / mes</span>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--antracita-400)" }}>
                  {administracionPct}% de {formatPrice(contrato.precioMensual, contrato.moneda)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botón guardar */}
        {dirty && (
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button
              className="il-btn il-btn--primary"
              style={{ height: 36, fontSize: 13, gap: 6 }}
              onClick={guardar}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saving ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        )}

        {/* Índice base registrado */}
        {contrato.indiceUltimoAjuste != null && (
          <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--antracita-400)" }}>
            Índice base registrado al inicio: <strong>{contrato.indiceUltimoAjuste.toFixed(4)}</strong>
            {contrato.precioOriginal != null && (
              <> · Precio original: <strong>{formatPrice(contrato.precioOriginal, contrato.moneda)}</strong></>
            )}
          </div>
        )}
      </div>

      {/* ── Historial ── */}
      <div>
        <AjustesHistorial contratoId={contrato.id} />
      </div>
    </div>
  );
}

// ─── AdministracionPanel — registrar el cobro de administración del mes ────────

function AdministracionPanel({ contrato }: { contrato: Contrato }) {
  const [registrando, setRegistrando] = useState(false);
  const [registrado, setRegistrado] = useState(false);

  const fee = contrato.precioMensual * contrato.administracionPct / 100;
  const mesActual = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  async function registrar() {
    setRegistrando(true);
    try {
      const res = await fetch(`/api/alquileres/${contrato.id}/administracion`, { method: "POST" });
      const json = await res.json() as { ok?: boolean; monto?: number; mes?: string; error?: string };
      if (res.status === 409) {
        setRegistrado(true);
        toast.info(json.error ?? "Ya registrada este mes");
        return;
      }
      if (!res.ok) throw new Error(json.error);
      setRegistrado(true);
      toast.success(`Administración de ${json.mes ?? mesActual} registrada: ${formatPrice(json.monto ?? fee, contrato.moneda)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar");
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="il-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>Administración</h3>
        <span className="mono" style={{ fontSize: 11, color: "var(--dorado-700, #8a5c00)", fontWeight: 600 }}>{contrato.administracionPct}%</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 12px", background: "rgba(212,168,83,0.1)", borderRadius: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--antracita-500)", textTransform: "capitalize" }}>{mesActual}</span>
        <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--dorado-700, #8a5c00)" }}>{formatPrice(fee, contrato.moneda)}</span>
      </div>

      <button
        onClick={registrar}
        disabled={registrando || registrado}
        className="il-btn il-btn--ghost"
        style={{ width: "100%", justifyContent: "center", fontSize: 12, gap: 6, height: 36 }}
      >
        {registrando ? <Loader2 size={13} className="animate-spin" />
          : registrado ? <Check size={13} />
          : <Receipt size={13} />}
        {registrando ? "Registrando…" : registrado ? "Registrada este mes" : "Registrar cobro del mes"}
      </button>
      <p style={{ fontSize: 10, color: "var(--antracita-300)", marginTop: 8, textAlign: "center" }}>
        Suma este ingreso a Finanzas. 1 vez por mes.
      </p>
    </div>
  );
}

// ─── ContratoFirmadoPanel ─────────────────────────────────────────────────────

function ContratoFirmadoPanel({
  contrato,
  onUpdated,
}: {
  contrato: Contrato;
  onUpdated: (url: string, fecha: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(
        file,
        `contratos-firmados/${contrato.inmobiliariaId}`,
        setProgress
      );
      const fecha = new Date().toISOString();
      const res = await fetch(`/api/alquileres/${contrato.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contratoFirmadoUrl: result.secure_url, fechaFirmado: fecha }),
      });
      if (!res.ok) throw new Error();
      onUpdated(result.secure_url, fecha);
      toast.success("Contrato firmado subido correctamente");
    } catch {
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const yaFirmado = !!contrato.contratoFirmadoUrl;

  return (
    <div className="il-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>Contrato firmado</h3>
        {yaFirmado && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--success-600, #16a34a)", display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={13} /> Subido
          </span>
        )}
      </div>

      {contrato.tipoFirma === "DIGITAL" && !yaFirmado && (
        <div style={{ fontSize: 12, color: "var(--antracita-500)", padding: "10px 12px", background: "var(--crema-100)", borderRadius: 8 }}>
          ✍️ Contrato con firma digital incluida
        </div>
      )}

      {yaFirmado ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a
            href={contrato.contratoFirmadoUrl!}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--terracota-600)", fontWeight: 600, textDecoration: "none" }}
          >
            <Download size={13} /> Ver / descargar contrato
          </a>
          {contrato.fechaFirmado && (
            <p style={{ fontSize: 11, color: "var(--antracita-400)" }}>
              Subido el {new Date(contrato.fechaFirmado).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ fontSize: 11, color: "var(--antracita-500)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Reemplazar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="il-btn il-btn--ghost"
          style={{ width: "100%", justifyContent: "center", fontSize: 12, gap: 6, height: 36 }}
        >
          {uploading ? (
            <><Loader2 size={13} className="animate-spin" /> Subiendo… {progress}%</>
          ) : (
            <><Upload size={13} /> Subir contrato firmado</>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFile}
      />
      <p style={{ fontSize: 10, color: "var(--antracita-300)", marginTop: 8 }}>PDF, JPG o PNG · máx. 15 MB</p>
    </div>
  );
}

// ─── AjustesHistorial (historial de ajustes aplicados de un contrato) ──────────

interface AjusteHist {
  id: string;
  fechaAjuste: string;
  precioAnterior: number;
  precioNuevo: number;
  moneda: "ARS" | "USD";
  porcentajeAumento: number;
  indiceUsado: string;
  aplicado: boolean;
}

function AjustesHistorial({ contratoId }: { contratoId: string }) {
  const [ajustes, setAjustes] = useState<AjusteHist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const res = await fetch(`/api/alquileres/ajustes?contratoId=${contratoId}`);
        if (res.ok && !cancel) setAjustes((await res.json()).data ?? []);
      } catch { /* ignore */ }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [contratoId]);

  const aplicados = ajustes.filter((a) => a.aplicado);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--terracota-500)" }} /></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>Historial de ajustes</h3>

      {aplicados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "28px 16px", color: "var(--antracita-300)" }}>
          <TrendingUp className="w-8 h-8" style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <p style={{ fontSize: 13 }}>Todavía no se aplicó ningún ajuste a este contrato.</p>
          <p style={{ fontSize: 11.5, marginTop: 4 }}>Cuando el sistema detecte un ajuste pendiente, aparecerá en la sección «Ajustes pendientes» del listado.</p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--crema-100)" }}>
              {["Fecha", "Anterior", "Nuevo", "Variación", "Índice"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-jetbrains-mono, monospace)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aplicados.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: i < aplicados.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td style={{ padding: "10px 12px", color: "var(--antracita-700)" }}>
                  {new Date(a.fechaAjuste).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="mono" style={{ padding: "10px 12px", color: "var(--antracita-500)" }}>{formatPrice(a.precioAnterior, a.moneda)}</td>
                <td className="mono" style={{ padding: "10px 12px", fontWeight: 600, color: "var(--antracita-900)" }}>{formatPrice(a.precioNuevo, a.moneda)}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "var(--terracota-100, #FCEAE4)", color: "var(--terracota-700, #8C3D27)" }}>
                    +{a.porcentajeAumento.toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--antracita-500)" }}>{a.indiceUsado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── PagosHistorial ────────────────────────────────────────────────────────────

function PagosHistorial({
  contratoId,
  defaultMonto,
  defaultMoneda,
}: {
  contratoId: string;
  defaultMonto: number;
  defaultMoneda: "ARS" | "USD";
}) {
  const mesLabel = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const [pagos, setPagos]     = useState<PagoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    concepto:   `Pago ${mesLabel}`,
    monto:      String(defaultMonto),
    moneda:     defaultMoneda,
    metodoPago: "",
    fecha:      new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetch(`/api/alquileres/${contratoId}/pagos`)
      .then((r) => r.json())
      .then((d) => setPagos(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contratoId]);

  const handleAdd = async () => {
    if (!form.concepto.trim() || !form.monto) {
      toast.error("Completá concepto y monto");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/alquileres/${contratoId}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepto:   form.concepto.trim(),
          monto:      Number(form.monto),
          moneda:     form.moneda,
          metodoPago: form.metodoPago || null,
          fecha:      form.fecha,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setPagos((prev) => [data.data, ...prev]);
      setShowForm(false);
      setForm((f) => ({ ...f, concepto: `Pago ${mesLabel}`, metodoPago: "" }));
      toast.success("Pago registrado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pagoId: string) => {
    if (!confirm("¿Eliminar este registro de pago?")) return;
    try {
      const res = await fetch(`/api/alquileres/${contratoId}/pagos/${pagoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPagos((prev) => prev.filter((p) => p.id !== pagoId));
      toast.success("Registro eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--antracita-300)" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>
          Historial de pagos
          {pagos.length > 0 && (
            <span className="mono" style={{ fontSize: 12, color: "var(--antracita-400)", fontWeight: 400, marginLeft: 8 }}>
              {pagos.length} registros
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="il-btn il-btn--primary"
          style={{ height: 32, fontSize: 12, gap: 5 }}
        >
          <Plus size={13} /> Registrar pago
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div style={{ padding: 16, background: "var(--crema-50)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11, color: "var(--antracita-400)", fontWeight: 600, display: "block", marginBottom: 4 }}>Concepto *</label>
              <input
                value={form.concepto}
                onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
                placeholder="Ej: Pago enero 2025"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--antracita-400)", fontWeight: 600, display: "block", marginBottom: 4 }}>Monto *</label>
              <input
                type="number"
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-mono)", background: "#fff", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--antracita-400)", fontWeight: 600, display: "block", marginBottom: 4 }}>Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value as "ARS" | "USD" }))}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none" }}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--antracita-400)", fontWeight: 600, display: "block", marginBottom: 4 }}>Método de pago</label>
              <input
                value={form.metodoPago}
                onChange={(e) => setForm((f) => ({ ...f, metodoPago: e.target.value }))}
                placeholder="Efectivo, transferencia…"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--antracita-400)", fontWeight: 600, display: "block", marginBottom: 4 }}>Fecha de pago</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} className="il-btn il-btn--ghost" style={{ height: 32, fontSize: 12 }}>Cancelar</button>
            <button onClick={handleAdd} disabled={saving} className="il-btn il-btn--primary" style={{ height: 32, fontSize: 12, gap: 5 }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {saving ? "Guardando…" : "Confirmar"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {pagos.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--antracita-400)", fontSize: 13 }}>
          <Receipt size={28} style={{ margin: "0 auto 10px", color: "var(--antracita-200)" }} />
          <p>Sin pagos registrados</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Usá el botón «Registrar pago» para llevar el historial.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pagos.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: "var(--crema-50)",
                border: "1px solid var(--border)", borderRadius: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginBottom: 2 }}>{p.concepto}</div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--antracita-400)" }}>
                  <span className="mono">{new Date(p.fecha + "T00:00:00").toLocaleDateString("es-AR")}</span>
                  {p.metodoPago && <span>· {p.metodoPago}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--success-500)" }}>
                  {formatPrice(p.monto, p.moneda)}
                </span>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--antracita-300)", display: "flex", opacity: 0.7 }}
                  title="Eliminar registro"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ContratoDetalleModal (full-page overlay) ─────────────────────────────────

function ContratoDetalleModal({
  contrato, config, inmobiliaria, isAdmin, onClose, onEstadoChange, onDelete,
}: {
  contrato: Contrato;
  config: Config | null;
  inmobiliaria: WizardInmobiliaria | null;
  isAdmin: boolean;
  onClose: () => void;
  onEstadoChange: (id: string, estado: "AL_DIA" | "ATRASADO") => void;
  onDelete: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<"documento" | "pagos" | "ajustes" | "partes" | "clausulas" | "notas">("documento");
  const [updatingPago, setUpdatingPago] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  // Estado local de firma — se actualiza al subir el contrato firmado
  const [firmaState, setFirmaState] = useState({
    contratoFirmadoUrl: contrato.contratoFirmadoUrl,
    fechaFirmado: contrato.fechaFirmado,
  });

  // Estado local de ajuste — se actualiza cuando AjustesTab guarda sin cerrar el modal
  const [ajusteState, setAjusteState] = useState({
    ajusteActivo: contrato.ajusteActivo,
    ajusteIndice: contrato.ajusteIndice as "ICL" | "IPC",
    ajusteMeses:  contrato.ajusteMeses,
    ajusteDia:    contrato.ajusteDia,
    administracionPct: contrato.administracionPct,
  });

  // Contrato "vivo": unión de la prop original + cambios de ajuste y firma guardados en esta sesión
  const contratoVivo = { ...contrato, ...ajusteState, ...firmaState };

  const ctr  = `CTR-${contrato.id.slice(-4).toUpperCase()}`;
  const key  = getEstadoKey(contrato);
  const dias = getDiasRestantes(contrato.fechaFin);
  const duracion = duracionMeses(contrato.fechaInicio, contrato.fechaFin);

  // Próximo pago (siguiente ocurrencia del día de vencimiento)
  const proximoPago = (() => {
    const hoy = new Date();
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), contrato.diaVencimientoPago);
    if (d < hoy) d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  })();

  // Timeline
  const inicio = new Date(contrato.fechaInicio + "T00:00:00");
  const fin    = new Date(contrato.fechaFin    + "T00:00:00");
  const hoyDate = new Date(); hoyDate.setHours(0, 0, 0, 0);
  const transcurrido = Math.max(0, Math.ceil((hoyDate.getTime() - inicio.getTime()) / 86400000));
  const totalDias    = Math.ceil((fin.getTime() - inicio.getTime()) / 86400000);
  const pct          = Math.min(100, Math.max(0, Math.round((transcurrido / totalDias) * 100)));

  const estadoLabel = key === "ok" ? "Al día" : key === "atrasado" ? "Pago atrasado" : key === "proximo" ? "Vence pronto" : "Vencido";
  const estadoTone  = (key === "ok" ? "success" : key === "atrasado" ? "danger" : "warning") as "success" | "warning" | "danger";

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
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }, [contrato.id, contrato.inquilinoNombre, onDelete]);

  const SUB_TABS = [
    { id: "documento", label: "Documento",      Icon: FileText },
    { id: "pagos",     label: "Pagos",           Icon: Receipt },
    { id: "ajustes",   label: "Ajustes",         Icon: TrendingUp },
    { id: "partes",    label: "Partes",          Icon: Users, n: 2 },
    { id: "clausulas", label: "Cláusulas",       Icon: ScrollText },
    { id: "notas",     label: "Notas internas",  Icon: MessageSquare },
  ] as const;

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        style={{ background: "rgba(20,17,14,0.6)", backdropFilter: "blur(4px)" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 60px" }}>

          {/* Close row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 12, cursor: "pointer" }}
            >
              <ArrowLeft size={13} /> Volver a contratos
            </button>
          </div>

          {/* Main card */}
          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 64px rgba(20,17,14,0.3)" }}>

            {/* Breadcrumb */}
            <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--antracita-400)", background: "var(--crema-50)" }}>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terracota-500)", fontSize: 12, padding: 0 }}>Contratos</button>
              <span>/</span>
              <span>Alquileres</span>
              <span>/</span>
              <span className="mono" style={{ color: "var(--antracita-700)", fontWeight: 600 }}>{ctr}</span>
            </div>

            {/* Header */}
            <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  Contrato de alquiler · {ctr}
                </p>
                <h2 className="display" style={{ fontSize: 26, margin: 0, color: "var(--antracita-900)", lineHeight: 1.1 }}>
                  {contrato.propiedad.titulo}
                </h2>
                <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 5 }}>
                  {contrato.propiedad.direccion} · {duracion} meses · vigente desde {fmtFecha(contrato.fechaInicio)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowPrint(true)}
                  className="il-btn il-btn--ghost"
                  style={{ height: 36, fontSize: 13, gap: 6 }}
                >
                  <Download size={13} /> Descargar PDF
                </button>
                <a
                  href={`https://wa.me/${contrato.inquilinoTel.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${contrato.inquilinoNombre}, te enviamos el contrato del inmueble ${contrato.propiedad.titulo}.`)}`}
                  target="_blank" rel="noreferrer"
                  className="il-btn il-btn--ghost"
                  style={{ height: 36, fontSize: 13, gap: 6, textDecoration: "none", color: "var(--antracita-700)", display: "inline-flex", alignItems: "center" }}
                >
                  <Send size={13} /> Enviar al inquilino
                </a>
                {contratoVivo.contratoFirmadoUrl && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--success-600, #16a34a)", padding: "6px 10px", background: "var(--success-50, #f0fdf4)", borderRadius: 8, border: "1px solid var(--success-200, #bbf7d0)" }}>
                    <CheckCircle2 size={12} /> Contrato firmado subido
                  </span>
                )}
              </div>
            </div>

            {/* Status strip */}
            <div style={{ margin: "0 24px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <StatusItem label="Estado"         value={estadoLabel}               tone={estadoTone} />
              <StatusItem label="Mes corriente"  value={`Día ${contrato.diaVencimientoPago}`} mono />
              <StatusItem label="Próximo pago"   value={proximoPago}               mono />
              <StatusItem label="Próximo ajuste" value={contratoVivo.ajusteActivo ? `${contratoVivo.ajusteIndice} · c/${contratoVivo.ajusteMeses}m` : "Sin ajuste"} mono small />
              <StatusItem label="Fin contrato"   value={fmtFecha(contrato.fechaFin)} mono />
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center" }}>
                <Pill tone={estadoTone} style={{ fontSize: 11, height: 24, whiteSpace: "nowrap" }}>
                  {dias > 0 ? `${dias}d restantes` : `Vencido ${Math.abs(dias)}d`}
                </Pill>
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", paddingLeft: 24 }}>
              {SUB_TABS.map(({ id, label, Icon, ...rest }) => {
                const n = "n" in rest ? (rest as { n: number }).n : null;
                const active = subTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSubTab(id)}
                    style={{
                      padding: "11px 18px", background: "transparent", border: "none",
                      borderBottom: active ? "2px solid var(--terracota-500)" : "2px solid transparent",
                      marginBottom: -1, fontSize: 13, fontWeight: active ? 600 : 500,
                      color: active ? "var(--antracita-900)" : "var(--antracita-500)",
                      cursor: "pointer", display: "inline-flex", gap: 7, alignItems: "center",
                    }}
                  >
                    <Icon size={13} style={{ color: active ? "var(--terracota-500)" : "var(--antracita-300)" }} />
                    {label}
                    {n && <span className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)" }}>{n}</span>}
                  </button>
                );
              })}
            </div>

            {/* Two-column content */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr" }}>

              {/* Left: document */}
              <div style={{ borderRight: "1px solid var(--border)", padding: "22px 24px", position: "relative" }}>
                {subTab === "documento" && (
                  contratoVivo.contratoFirmadoUrl
                    ? <DocumentoFirmadoPreview url={contratoVivo.contratoFirmadoUrl} fecha={contratoVivo.fechaFirmado} />
                    : <DocumentoPreview contrato={contratoVivo} config={config} inmobiliaria={inmobiliaria} onPrint={() => setShowPrint(true)} />
                )}
                {subTab === "pagos" && (
                  <PagosHistorial
                    contratoId={contrato.id}
                    defaultMonto={contrato.precioMensual}
                    defaultMoneda={contrato.moneda}
                  />
                )}
                {subTab === "ajustes" && (
                  <AjustesTab contrato={contratoVivo} onSaved={setAjusteState} />
                )}
                {subTab === "partes" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>Partes del contrato</h3>
                    {[
                      { rol: "Locatario",  nombre: contrato.inquilinoNombre, tel: contrato.inquilinoTel },
                    ].map((p) => (
                      <div key={p.rol} className="il-card" style={{ padding: 14 }}>
                        <div className="mono" style={{ fontSize: 9.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.rol}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--antracita-900)", marginTop: 4 }}>{p.nombre}</div>
                        <a href={`tel:${p.tel}`} style={{ fontSize: 12, color: "var(--terracota-500)", display: "flex", gap: 5, alignItems: "center", marginTop: 4, textDecoration: "none" }}>
                          <Phone size={11} /> {p.tel}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                {subTab === "clausulas" && (
                  <div>
                    <h3 className="display" style={{ fontSize: 17, margin: "0 0 14px", color: "var(--antracita-900)" }}>Cláusulas</h3>
                    <pre style={{ fontSize: 12, color: "var(--antracita-700)", lineHeight: 1.7, fontFamily: "Georgia, 'Times New Roman', serif", whiteSpace: "pre-wrap" }}>
                      {config?.clausulasAdicionales ?? DEFAULT_CLAUSULAS}
                    </pre>
                  </div>
                )}
                {subTab === "notas" && (
                  <NotasEditor
                    contratoId={contrato.id}
                    tipo="alquiler"
                    initialNotas={contrato.notas}
                  />
                )}
              </div>

              {/* Right: Sidebar */}
              <div style={{ padding: "22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Quick actions */}
                <div className="il-card" style={{ padding: 18 }}>
                  <h3 className="display" style={{ fontSize: 16, margin: "0 0 14px", color: "var(--antracita-900)" }}>Acciones</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {([
                      { Icon: Send, l: "Enviar al inquilino", action: () => { window.open(buildWhatsAppLink(contrato.inquilinoTel, `Hola ${contrato.inquilinoNombre}, te enviamos información sobre el contrato del inmueble ${contrato.propiedad.titulo}.`), "_blank"); } },
                      { Icon: updatingPago ? Loader2 : Clock, l: updatingPago ? "Guardando…" : contrato.estadoPago === "AL_DIA" ? "Marcar atrasado" : "Marcar al día", action: togglePago, disabled: updatingPago },
                      { Icon: Trash2,  l: "Rescindir",          action: handleDelete, danger: true, disabled: deleting },
                    ] as { Icon: React.ElementType; l: string; action: () => void; danger?: boolean; disabled?: boolean }[]).map(({ Icon, l, action, danger, disabled }) => (
                      <button
                        key={l}
                        onClick={action}
                        disabled={disabled}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                          padding: "12px 8px", background: danger ? "var(--danger-50, #FEF2F2)" : "var(--crema-100)",
                          border: `1px solid ${danger ? "var(--danger-200, #FECACA)" : "var(--border)"}`,
                          borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.6 : 1, fontFamily: "var(--font-body)",
                        }}
                      >
                        <Icon size={16} style={{ color: danger ? "var(--danger-500)" : "var(--terracota-600)" }} />
                        <span style={{ fontSize: 11, color: danger ? "var(--danger-600)" : "var(--antracita-700)", fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className="il-card" style={{ padding: 18 }}>
                  <h3 className="display" style={{ fontSize: 16, margin: "0 0 14px", color: "var(--antracita-900)" }}>Línea de tiempo</h3>
                  {/* Track container — altura fija para que los labels no se corten */}
                  <div style={{ position: "relative", height: 80, background: "var(--crema-100)", borderRadius: 10, padding: "0 14px" }}>
                    {/* Track (riel) */}
                    <div style={{ position: "absolute", left: 14, right: 14, top: 32, height: 4, background: "var(--crema-300)", borderRadius: 999 }} />
                    {/* Progress fill */}
                    <div style={{ position: "absolute", left: 14, top: 32, width: `${pct}%`, maxWidth: "calc(100% - 28px)", height: 4, background: "var(--terracota-500)", borderRadius: 999, transition: "width 0.6s ease" }} />
                    {/* Markers: Inicio y Fin siempre; Hoy solo si no solapa con ninguno */}
                    {((): { p: number; l: string; d: string; current?: boolean; done?: boolean }[] => {
                      type M = { p: number; l: string; d: string; current?: boolean; done?: boolean };
                      const hoyLabel = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
                      const base: M[] = [
                        { p: 0,   l: "Inicio", d: fmtFecha(contrato.fechaInicio), done: true },
                        { p: 100, l: "Fin",    d: fmtFecha(contrato.fechaFin),    done: dias < 0 },
                      ];
                      // Mostrar "Hoy" solo si está suficientemente lejos de Inicio (>5%) y de Fin (<95%)
                      if (pct > 5 && pct < 95) {
                        base.splice(1, 0, { p: pct, l: "Hoy", d: hoyLabel, current: true });
                      }
                      return base;
                    })().map((m, i) => (
                      <div key={i} style={{
                        position: "absolute",
                        // Inicio: alineado a la izquierda; Fin: compensar ancho del label; Hoy: centrado
                        left: m.p === 0
                          ? "14px"
                          : m.p === 100
                            ? "calc(100% - 14px)"
                            : `calc(${m.p}% + 14px)`,
                        top: 22,
                        transform: m.p === 0 ? "none" : m.p === 100 ? "translateX(-100%)" : "translateX(-50%)",
                      }}>
                        <div style={{
                          width: 12, height: 12, borderRadius: 999,
                          background: m.current ? "var(--terracota-500)" : m.done ? "var(--success-500, #22C55E)" : "var(--crema-300)",
                          border: "2px solid #fff",
                          boxShadow: "0 0 0 1.5px var(--border)",
                          margin: m.p === 100 ? "0 0 0 auto" : "0",
                        }} />
                        <div style={{ marginTop: 5, fontSize: 9, color: m.current ? "var(--terracota-600)" : "var(--antracita-400)", fontWeight: m.current ? 700 : 500, whiteSpace: "nowrap", textAlign: m.p === 100 ? "right" : "left" }}>
                          <div className="mono" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.l}</div>
                          <div className="mono" style={{ fontSize: 9, color: "var(--antracita-600)" }}>{m.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--antracita-500)" }}>
                    <span>Transcurrido: <strong className="mono" style={{ color: "var(--antracita-900)" }}>{transcurrido}d</strong></span>
                    <span>Restante: <strong className="mono" style={{ color: dias > 0 ? "var(--terracota-600)" : "var(--danger-500)" }}>{Math.abs(dias)}d</strong></span>
                  </div>
                </div>

                {/* Payment status */}
                <div className="il-card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>Pagos</h3>
                  </div>
                  {/* Current month status */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px",
                    background: contrato.estadoPago === "AL_DIA" ? "var(--success-100, #DCFCE7)" : "var(--danger-100, #FEE2E2)",
                    borderRadius: 8, marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 12, color: contrato.estadoPago === "AL_DIA" ? "var(--success-500)" : "var(--danger-500)", fontWeight: 600 }}>
                      {new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })} ·{" "}
                      {contrato.estadoPago === "AL_DIA" ? "Al día" : "Atrasado"}
                    </span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: contrato.estadoPago === "AL_DIA" ? "var(--success-500)" : "var(--danger-500)" }}>
                      {formatPrice(contrato.precioMensual, contrato.moneda)}
                    </span>
                  </div>
                  {/* Proximo */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--antracita-500)", padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                    <span>Próximo vencimiento</span>
                    <span className="mono" style={{ fontWeight: 600, color: "var(--antracita-700)" }}>{proximoPago}</span>
                  </div>
                </div>

                {/* Administración mensual */}
                {contratoVivo.administracionPct > 0 && (
                  <AdministracionPanel contrato={contratoVivo} />
                )}

                {/* Contrato firmado */}
                <ContratoFirmadoPanel
                  contrato={contratoVivo}
                  onUpdated={(url, fecha) => setFirmaState({ contratoFirmadoUrl: url, fechaFirmado: fecha })}
                />

                {/* Config note */}
                <div className="il-card" style={{ padding: 14, background: "rgba(212,168,83,0.08)", border: "1px solid rgba(212,168,83,0.25)", display: "flex", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--dorado-400, #D4A853)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TrendingUp size={13} color="#fff" />
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--dorado-700, #8a5c00)", lineHeight: 1.45 }}>
                    Logo, colores y cláusulas se toman de <strong>Configuración → Branding</strong>. Cambiá una vez, aplica a todos los contratos.
                  </div>
                </div>

                {/* Admin actions */}
                {isAdmin && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "10px", border: "1px solid var(--danger-200, #FECACA)",
                      borderRadius: 8, background: "none", color: "var(--danger-500)",
                      fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)",
                    }}
                  >
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Eliminar contrato
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print modal overlay */}
      {showPrint && (
        <ContratoDocumentoModal
          contrato={contrato}
          config={config}
          inmobiliaria={inmobiliaria}
          onClose={() => setShowPrint(false)}
        />
      )}
    </>
  );
}

// ─── DocumentoVentaPreview ────────────────────────────────────────────────────

function DocumentoVentaPreview({
  venta, config, inmobiliaria, onPrint,
}: {
  venta: ContratoVenta;
  config: Config | null;
  inmobiliaria: WizardInmobiliaria | null;
  onPrint: () => void;
}) {
  const colorPrimario   = config?.colorPrimario   ?? "#1B4332";
  const colorSecundario = config?.colorSecundario  ?? "#2C2C2C";
  const razonSocial     = config?.razonSocial ?? inmobiliaria?.nombre ?? "Inmobiliaria";
  const cuit            = config?.cuit ?? "";
  const domicilio       = config?.domicilioLegal ?? "";
  const matricula       = config?.matriculaCorredora ?? "";
  const pie             = config?.piePaginaContrato ?? [razonSocial, inmobiliaria?.whatsapp && `Tel: ${inmobiliaria.whatsapp}`].filter(Boolean).join(" · ");
  const hoyStr          = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const bcv             = `BCV-${venta.id.slice(-4).toUpperCase()}`;

  const parties = [
    { role: "Vendedor", name: venta.vendedorNombre, detail: `DNI ${venta.vendedorDni}`, tone: colorPrimario },
    { role: "Comprador", name: venta.compradorNombre, detail: `DNI ${venta.compradorDni}`, tone: "var(--accent, #D4A853)" },
  ];

  return (
    <div>
      {/* Dark toolbar */}
      <div style={{ background: "var(--antracita-900)", borderRadius: "10px 10px 0 0", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--crema-300)", letterSpacing: "0.04em" }}>
          {bcv}_compraventa_{venta.propiedadDireccion.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}.pdf
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ Icon: Printer, l: "Imprimir" }, { Icon: Download, l: "Descargar" }].map(({ Icon, l }) => (
            <button key={l} onClick={onPrint} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "var(--crema-100)", fontSize: 11, cursor: "pointer" }}>
              <Icon size={11} /> {l}
            </button>
          ))}
        </div>
      </div>

      {/* Document page */}
      <div style={{ background: "#fff", borderRadius: "0 0 10px 10px", padding: "36px 40px 32px", boxShadow: "var(--shadow-lg, 0 8px 32px rgba(58,35,18,0.12))", borderTop: `4px solid ${colorPrimario}`, fontFamily: "Georgia, 'Times New Roman', serif", position: "relative" }}>

        {/* Header band */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, borderBottom: "1px solid var(--border)", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {inmobiliaria?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inmobiliaria.logoUrl} alt={razonSocial} style={{ height: 48, width: "auto", objectFit: "contain", background: "#fff", borderRadius: 8, padding: 4 }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 10, background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 600, flexShrink: 0 }}>
                {razonSocial.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="display" style={{ fontSize: 18, fontWeight: 600, color: "var(--antracita-900)", lineHeight: 1 }}>{razonSocial}</div>
              {cuit && <div className="mono" style={{ fontSize: 10, color: "var(--antracita-500)", marginTop: 4 }}>CUIT {cuit}{matricula ? ` · Mat. ${matricula}` : ""}</div>}
              {domicilio && <div style={{ fontSize: 10.5, color: "var(--antracita-500)", marginTop: 2 }}>{domicilio}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Folio</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--antracita-900)", marginTop: 2 }}>{bcv}</div>
            <div style={{ fontSize: 10, color: "var(--antracita-500)", marginTop: 6 }}>Emitido {hoyStr}</div>
          </div>
        </div>

        {/* Doc title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="mono" style={{ fontSize: 9.5, color: colorPrimario, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 600 }}>Instrumento privado</div>
          <h2 className="display" style={{ fontSize: 24, margin: "8px 0 0", color: "var(--antracita-900)" }}>Boleto de Compraventa</h2>
        </div>

        {/* Parties */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {parties.map((p) => (
            <div key={p.role} style={{ padding: "11px 13px", background: "var(--crema-100)", border: "1px solid var(--border)", borderTop: `3px solid ${p.tone}`, borderRadius: 8 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{p.role}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginTop: 4 }}>{p.name}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--antracita-500)", marginTop: 2 }}>{p.detail}</div>
            </div>
          ))}
        </div>

        {/* Property */}
        <div style={{ background: "var(--crema-50)", border: "1px dashed var(--border)", borderRadius: 9, padding: 13, marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>Inmueble objeto de la operación</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--antracita-900)" }}>{venta.propiedadDireccion}</div>
          {venta.propiedadDescripcion && <div style={{ fontSize: 11, color: "var(--antracita-500)", marginTop: 2 }}>{venta.propiedadDescripcion}</div>}
          {venta.matriculaInmueble && <div className="mono" style={{ fontSize: 10, color: "var(--antracita-400)", marginTop: 4 }}>Matrícula: {venta.matriculaInmueble}</div>}
        </div>

        {/* Economic conditions */}
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--antracita-900)", margin: "0 0 10px", letterSpacing: "0.02em" }}>I — Condiciones económicas</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { l: "Precio de venta", v: formatPrice(venta.precioVenta, venta.moneda), s: `${venta.moneda} · contado`, terra: true },
            { l: "Seña / Reserva",  v: venta.sena ? formatPrice(venta.sena, venta.moneda) : "—", s: "al momento de firma" },
            { l: "Forma de pago",   v: venta.formaPago, s: "acordada entre partes" },
            { l: "Comisiones",      v: `V ${venta.comisionVendedorPct}% · C ${venta.comisionCompradorPct}%`, s: "sobre precio de venta" },
          ].map((f) => (
            <div key={f.l} style={{ padding: "9px 11px", background: f.terra ? "var(--terracota-100, #FAE8E2)" : "var(--crema-100)", border: f.terra ? "1px solid var(--terracota-300, #E0A088)" : "1px solid var(--border)", borderRadius: 7 }}>
              <div className="mono" style={{ fontSize: 9, color: f.terra ? colorPrimario : "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{f.l}</div>
              <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: f.terra ? colorPrimario : "var(--antracita-900)", marginTop: 4, wordBreak: "break-word" }}>{f.v}</div>
              <div style={{ fontSize: 9.5, color: "var(--antracita-500)", marginTop: 2 }}>{f.s}</div>
            </div>
          ))}
        </div>

        {/* Escribanía */}
        {(venta.escribanoNombre || venta.fechaEscritura) && (
          <div style={{ background: "var(--crema-50)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 13px", marginBottom: 16 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 6 }}>Escribanía</div>
            {venta.escribanoNombre && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--antracita-900)" }}>{venta.escribanoNombre}{venta.escribanoRegistro ? ` · Reg. ${venta.escribanoRegistro}` : ""}</div>}
            {venta.fechaEscritura && <div style={{ fontSize: 11, color: "var(--antracita-500)", marginTop: 3 }}>Fecha de escritura tentativa: {fmtFechaLarga(venta.fechaEscritura)}</div>}
          </div>
        )}

        {/* Clauses (if custom) */}
        {venta.clausulas && (
          <>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--antracita-900)", margin: "0 0 8px", letterSpacing: "0.02em" }}>II — Cláusulas especiales</h3>
            <div style={{ fontSize: 11, color: "var(--antracita-700)", lineHeight: 1.7, columns: 2, columnGap: 20, marginBottom: 24 }}>
              {venta.clausulas.split(/\n\n+/).filter(Boolean).map((p, i) => (
                <p key={i} style={{ margin: "0 0 8px" }}>{p}</p>
              ))}
            </div>
          </>
        )}

        {/* Signatures — 3 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          {[
            { r: "Vendedor",              n: venta.vendedorNombre,  firmable: false },
            { r: "Comprador",             n: venta.compradorNombre, firmable: false },
            { r: "Corredor Inmobiliario", n: razonSocial,           firmable: true },
          ].map((s) => {
            const mostrarFirma = s.firmable && venta.tipoFirma === "DIGITAL" && inmobiliaria?.firmaUrl;
            return (
              <div key={s.r} style={{ textAlign: "center" }}>
                {mostrarFirma ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inmobiliaria!.firmaUrl!}
                    alt="Firma"
                    style={{ height: 52, maxWidth: 150, objectFit: "contain", margin: "0 auto 6px", display: "block" }}
                  />
                ) : (
                  <div style={{ height: 52, borderBottom: "1px solid var(--antracita-700)", marginBottom: 6 }} />
                )}
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--antracita-700)" }}>{s.r}</div>
                <div style={{ fontSize: 10, color: "var(--antracita-500)", marginTop: 2 }}>{s.n}</div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 9, color: "var(--antracita-300)", fontFamily: "var(--font-mono)" }}>
          {pie}
        </div>

        {/* Watermark */}
        <div style={{ position: "absolute", top: 60, right: 30, transform: "rotate(8deg)", opacity: 0.04, fontFamily: "var(--font-display)", fontSize: 72, color: colorPrimario, pointerEvents: "none", fontWeight: 700 }}>
          BOLETO
        </div>
      </div>
    </div>
  );
}

// ─── ContratoVentaDetalleModal (full-page overlay) ────────────────────────────

function ContratoVentaDetalleModal({
  venta, config, inmobiliaria, isAdmin, onClose, onDelete,
}: {
  venta: ContratoVenta;
  config: Config | null;
  inmobiliaria: WizardInmobiliaria | null;
  isAdmin: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<"documento" | "partes" | "condiciones" | "notas">("documento");
  const [deleting, setDeleting] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const bcv = `BCV-${venta.id.slice(-4).toUpperCase()}`;

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

  function handlePrint() {
    const html = buildContratoVentaHtml(
      { ...venta, clausulas: venta.clausulas ?? "" },
      config as PdfConfig | null,
      inmobiliaria,
    );
    printHtml(html, () => toast.error("Habilitá las ventanas emergentes para imprimir"));
  }

  const SUB_TABS = [
    { id: "documento",   label: "Documento",   Icon: FileText },
    { id: "partes",      label: "Partes",       Icon: Users,    n: 2 },
    { id: "condiciones", label: "Condiciones",  Icon: Receipt },
    { id: "notas",       label: "Notas",        Icon: MessageSquare },
  ] as const;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "rgba(20,17,14,0.6)", backdropFilter: "blur(4px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 60px" }}>

          {/* Close row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 12, cursor: "pointer" }}>
              <ArrowLeft size={13} /> Volver a contratos
            </button>
          </div>

          {/* Main card */}
          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 64px rgba(20,17,14,0.3)" }}>

            {/* Breadcrumb */}
            <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--antracita-400)", background: "var(--crema-50)" }}>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terracota-500)", fontSize: 12, padding: 0 }}>Contratos</button>
              <span>/</span><span>Compraventas</span><span>/</span>
              <span className="mono" style={{ color: "var(--antracita-700)", fontWeight: 600 }}>{bcv}</span>
            </div>

            {/* Header */}
            <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  Boleto de compraventa · {bcv}
                </p>
                <h2 className="display" style={{ fontSize: 26, margin: 0, color: "var(--antracita-900)", lineHeight: 1.1 }}>
                  {venta.propiedadDireccion}
                </h2>
                <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 5 }}>
                  {venta.compradorNombre} · {venta.vendedorNombre} · {fmtFecha(venta.createdAt.slice(0, 10))}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                <button onClick={() => setShowPrint(true)} className="il-btn il-btn--ghost" style={{ height: 36, fontSize: 13, gap: 6 }}>
                  <Download size={13} /> Descargar PDF
                </button>
                {venta.vendedorTel ? (
                  <a
                    href={buildWhatsAppLink(venta.vendedorTel!, `Hola ${venta.vendedorNombre}, te enviamos el boleto de compraventa de ${venta.propiedadDireccion}.`)}
                    target="_blank" rel="noreferrer"
                    className="il-btn il-btn--ghost"
                    style={{ height: 36, fontSize: 13, gap: 6, textDecoration: "none", color: "var(--antracita-700)", display: "inline-flex", alignItems: "center" }}
                  >
                    <Send size={13} /> Enviar al vendedor
                  </a>
                ) : (
                  <button
                    disabled
                    className="il-btn il-btn--ghost"
                    style={{ height: 36, fontSize: 13, gap: 6, opacity: 0.4, cursor: "not-allowed" }}
                    title="Sin número de teléfono registrado"
                  >
                    <Send size={13} /> Enviar al vendedor
                  </button>
                )}
              </div>
            </div>

            {/* Status strip */}
            <div style={{ margin: "0 24px 20px", display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <StatusItem label="Tipo"         value="Boleto CV" />
              <StatusItem label="Precio"       value={formatPrice(venta.precioVenta, venta.moneda)} mono />
              <StatusItem label="Seña"         value={venta.sena ? formatPrice(venta.sena, venta.moneda) : "—"} mono />
              <StatusItem label="Escritura"    value={venta.fechaEscritura ? fmtFecha(venta.fechaEscritura) : "A definir"} mono small />
              <StatusItem label="Registrado"   value={fmtFecha(venta.createdAt.slice(0, 10))} mono />
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center" }}>
                <Pill tone="warning" style={{ fontSize: 11, height: 24, whiteSpace: "nowrap" }}>Boleto CV</Pill>
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", paddingLeft: 24 }}>
              {SUB_TABS.map(({ id, label, Icon, ...rest }) => {
                const n = "n" in rest ? (rest as { n: number }).n : null;
                const active = subTab === id;
                return (
                  <button key={id} onClick={() => setSubTab(id)} style={{ padding: "11px 18px", background: "transparent", border: "none", borderBottom: active ? "2px solid var(--terracota-500)" : "2px solid transparent", marginBottom: -1, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "var(--antracita-900)" : "var(--antracita-500)", cursor: "pointer", display: "inline-flex", gap: 7, alignItems: "center" }}>
                    <Icon size={13} style={{ color: active ? "var(--terracota-500)" : "var(--antracita-300)" }} />
                    {label}
                    {n && <span className="mono" style={{ fontSize: 10.5, color: "var(--antracita-300)" }}>{n}</span>}
                  </button>
                );
              })}
            </div>

            {/* Two-column content */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr" }}>

              {/* Left */}
              <div style={{ borderRight: "1px solid var(--border)", padding: "22px 24px", position: "relative" }}>
                {subTab === "documento" && (
                  <DocumentoVentaPreview venta={venta} config={config} inmobiliaria={inmobiliaria} onPrint={() => setShowPrint(true)} />
                )}
                {subTab === "partes" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>Partes del contrato</h3>
                    {[
                      { rol: "Vendedor",  nombre: venta.vendedorNombre,  dni: venta.vendedorDni,  dom: venta.vendedorDomicilio,  ec: venta.vendedorEstadoCivil,  conyuge: venta.vendedorConyuge },
                      { rol: "Comprador", nombre: venta.compradorNombre, dni: venta.compradorDni, dom: venta.compradorDomicilio, ec: venta.compradorEstadoCivil, conyuge: venta.compradorConyuge },
                    ].map((p) => (
                      <div key={p.rol} className="il-card" style={{ padding: 14 }}>
                        <div className="mono" style={{ fontSize: 9.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.rol}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--antracita-900)", marginTop: 4 }}>{p.nombre}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--antracita-500)", marginTop: 2 }}>DNI/CUIT: {p.dni}</div>
                        {p.dom && <div style={{ fontSize: 11, color: "var(--antracita-500)", marginTop: 2 }}>{p.dom}</div>}
                        <div style={{ fontSize: 11, color: "var(--antracita-400)", marginTop: 2, textTransform: "capitalize" }}>{p.ec}{p.conyuge ? ` · Cónyuge: ${p.conyuge}` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
                {subTab === "condiciones" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <h3 className="display" style={{ fontSize: 17, margin: 0, color: "var(--antracita-900)" }}>Condiciones económicas</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        { l: "Precio de venta", v: formatPrice(venta.precioVenta, venta.moneda) },
                        { l: "Forma de pago",   v: venta.formaPago },
                        { l: "Seña / Reserva",  v: venta.sena ? formatPrice(venta.sena, venta.moneda) : "No se pactó" },
                        { l: "Comisión vendedor", v: `${venta.comisionVendedorPct}%` },
                        { l: "Comisión comprador", v: `${venta.comisionCompradorPct}%` },
                        ...(venta.escribanoNombre ? [{ l: "Escribano", v: venta.escribanoNombre }] : []),
                        ...(venta.fechaEscritura ? [{ l: "Escritura", v: fmtFechaLarga(venta.fechaEscritura) }] : []),
                      ].map(({ l, v }) => (
                        <div key={l} className="il-card" style={{ padding: "10px 12px" }}>
                          <div className="mono" style={{ fontSize: 9.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginTop: 4 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {subTab === "notas" && (
                  <NotasEditor
                    contratoId={venta.id}
                    tipo="venta"
                    initialNotas={venta.notas}
                  />
                )}
              </div>

              {/* Right: Sidebar */}
              <div style={{ padding: "22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Quick actions */}
                <div className="il-card" style={{ padding: 18 }}>
                  <h3 className="display" style={{ fontSize: 16, margin: "0 0 14px", color: "var(--antracita-900)" }}>Acciones</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {([
                      { Icon: Printer, l: "Reimprimir",        action: () => setShowPrint(true) },
                      { Icon: Send,    l: "Enviar al vendedor", action: () => { const link = buildWhatsAppLink(venta.vendedorTel ?? "", `Hola ${venta.vendedorNombre}, te enviamos el boleto de compraventa de ${venta.propiedadDireccion}.`); window.open(link, "_blank"); }, disabled: !venta.vendedorTel },
                      { Icon: Trash2,  l: "Eliminar",           action: handleDelete, danger: true, disabled: deleting },
                    ] as { Icon: React.ElementType; l: string; action: () => void; danger?: boolean; disabled?: boolean }[]).map(({ Icon, l, action, danger, disabled }) => (
                      <button key={l} onClick={action} disabled={disabled}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", background: danger ? "var(--danger-50, #FEF2F2)" : "var(--crema-100)", border: `1px solid ${danger ? "var(--danger-200, #FECACA)" : "var(--border)"}`, borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, fontFamily: "var(--font-body)" }}>
                        <Icon size={16} style={{ color: danger ? "var(--danger-500)" : "var(--terracota-600)" }} />
                        <span style={{ fontSize: 11, color: danger ? "var(--danger-600)" : "var(--antracita-700)", fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Partes resumen */}
                <div className="il-card" style={{ padding: 18 }}>
                  <h3 className="display" style={{ fontSize: 16, margin: "0 0 14px", color: "var(--antracita-900)" }}>Partes</h3>
                  {[
                    { rol: "Vendedor", nombre: venta.vendedorNombre, dni: venta.vendedorDni },
                    { rol: "Comprador", nombre: venta.compradorNombre, dni: venta.compradorDni },
                  ].map((p) => (
                    <div key={p.rol} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--border)" }}>
                      <div className="mono" style={{ fontSize: 9.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.rol}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginTop: 3 }}>{p.nombre}</div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--antracita-500)" }}>DNI {p.dni}</div>
                    </div>
                  ))}
                  <div style={{ paddingTop: 4 }}>
                    <div className="mono" style={{ fontSize: 9.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Corredor</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)", marginTop: 3 }}>{config?.razonSocial ?? inmobiliaria?.nombre}</div>
                  </div>
                </div>

                {/* Precio highlight */}
                <div className="il-card" style={{ padding: 18, background: "rgba(212,168,83,0.06)", border: "1px solid rgba(212,168,83,0.25)" }}>
                  <div className="mono" style={{ fontSize: 9.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Precio pactado</div>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: "#C9A55C", lineHeight: 1 }}>{formatPrice(venta.precioVenta, venta.moneda)}</div>
                  {venta.sena != null && venta.sena > 0 && (
                    <div style={{ fontSize: 11, color: "var(--antracita-500)", marginTop: 6 }}>
                      Seña: <span className="mono" style={{ fontWeight: 600 }}>{formatPrice(venta.sena, venta.moneda)}</span>
                    </div>
                  )}
                </div>

                {/* Escribanía (if present) */}
                {(venta.escribanoNombre || venta.fechaEscritura) && (
                  <div className="il-card" style={{ padding: 14 }}>
                    <div className="mono" style={{ fontSize: 9.5, color: "var(--antracita-300)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Escribanía</div>
                    {venta.escribanoNombre && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900)" }}>{venta.escribanoNombre}</div>}
                    {venta.escribanoRegistro && <div className="mono" style={{ fontSize: 11, color: "var(--antracita-500)" }}>Reg. {venta.escribanoRegistro}</div>}
                    {venta.fechaEscritura && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11, color: "var(--antracita-500)" }}>
                        <Calendar size={11} />{fmtFechaLarga(venta.fechaEscritura)}
                      </div>
                    )}
                  </div>
                )}

                {/* Admin delete */}
                {isAdmin && (
                  <button onClick={handleDelete} disabled={deleting}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", border: "1px solid var(--danger-200, #FECACA)", borderRadius: 8, background: "none", color: "var(--danger-500)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Eliminar boleto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print overlay */}
      {showPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto flex flex-col items-center pt-6 pb-10 px-4">
          <div className="w-full max-w-2xl flex items-center justify-between mb-3 px-1">
            <p className="text-white text-sm font-medium">Boleto CV · {venta.compradorNombre}</p>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#221E19", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
                <Printer size={14} /> Imprimir / Guardar PDF
              </button>
              <button onClick={() => setShowPrint(false)} style={{ padding: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", cursor: "pointer", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div style={{ width: "100%", maxWidth: 700 }}>
            <DocumentoVentaPreview venta={venta} config={config} inmobiliaria={inmobiliaria} onPrint={handlePrint} />
          </div>
        </div>
      )}
    </>
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
  const clausulas = config?.clausulasAdicionales ?? DEFAULT_CLAUSULAS;

  function handlePrint() {
    const html = buildContratoAlquilerHtml(
      { ...contrato, clausulasOverride: clausulas },
      config as PdfConfig | null,
      inmobiliaria,
    );
    printHtml(html, () => toast.error("Habilitá las ventanas emergentes para imprimir"));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto flex flex-col items-center pt-6 pb-10 px-4">
      <div className="w-full max-w-2xl flex items-center justify-between mb-3 px-1">
        <p className="text-white text-sm font-medium">Contrato · {contrato.inquilinoNombre}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#221E19", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
          >
            <Printer size={14} /> Imprimir / Guardar PDF
          </button>
          <button
            onClick={onClose}
            style={{ padding: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", cursor: "pointer", display: "flex" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 700 }}>
        <DocumentoPreview contrato={contrato} config={config} inmobiliaria={inmobiliaria} onPrint={handlePrint} />
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
  const [filtroAlq, setFiltroAlq] = useState<FiltroAlq>("al_dia");
  const [busqueda, setBusqueda] = useState("");

  const [selectedAlqId, setSelectedAlqId] = useState<string | null>(null);
  const [selectedVentaId, setSelectedVentaId] = useState<string | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);

  // ── Stats alquiler
  const statsAlq = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    const activos = contratos.filter((c) => c.fechaFin >= hoy);
    const alDia = activos.filter((c) => c.estadoPago === "AL_DIA");
    const atrasados = contratos.filter((c) => c.estadoPago === "ATRASADO");
    const vencePronto = activos.filter((c) => { const d = getDiasRestantes(c.fechaFin); return d >= 0 && d <= 30; });
    const totalMensualARS = activos.reduce((s, c) => s + (c.moneda === "ARS" ? c.precioMensual : 0), 0);
    return {
      total: activos.length,
      alDia: alDia.length,
      atrasados: atrasados.length,
      vencePronto: vencePronto.length,
      totalMensualARS,
    };
  }, [contratos]);

  // ── Filtrado alquileres
  const filtradosAlq = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    let list = contratos;
    if (filtroAlq === "al_dia") list = list.filter((c) => c.fechaFin >= hoy && c.estadoPago === "AL_DIA");
    else if (filtroAlq === "atrasados") list = list.filter((c) => c.estadoPago === "ATRASADO");
    else if (filtroAlq === "vence_pronto") list = list.filter((c) => { const d = getDiasRestantes(c.fechaFin); return d >= 0 && d <= 30; });
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
    { key: "al_dia",       label: `Al día (${statsAlq.alDia})` },
    { key: "atrasados",    label: `Atrasados (${statsAlq.atrasados})` },
    { key: "vence_pronto", label: `Vencen pronto (${statsAlq.vencePronto})` },
    { key: "todos",        label: `Todos (${contratos.length})` },
  ];

  return (
    <div className="w-full max-w-[1060px] mx-auto" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p
            className="mono"
            style={{ fontSize: 11, color: "var(--antracita-300)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}
          >
            Módulo · Legal
          </p>
          <h1
            className="display"
            style={{ fontSize: 26, color: "var(--antracita-900)", margin: 0 }}
          >
            Contratos
          </h1>
          <p style={{ fontSize: 12, color: "var(--antracita-400)", marginTop: 2 }}>
            {statsAlq.total} alquiler{statsAlq.total !== 1 ? "es" : ""} activo{statsAlq.total !== 1 ? "s" : ""} · {ventas.length} boleto{ventas.length !== 1 ? "s" : ""} de compraventa
          </p>
        </div>
        <button
          onClick={() => setShowNuevo(true)}
          className="il-btn il-btn--primary"
          style={{ height: 36, fontSize: 13, gap: 6 }}
        >
          <Plus size={14} color="#fff" />Nuevo contrato
        </button>
      </div>

      {/* ── MajorTabs alquiler / compraventa ── */}
      <div
        style={{
          display: "inline-flex",
          background: "var(--crema-100, #F0E9DC)",
          borderRadius: 12,
          padding: 4,
          border: "1px solid var(--border)",
          gap: 4,
        }}
      >
        <button
          onClick={() => setTipoTab("alquiler")}
          style={{
            display: "inline-flex",
            gap: 10,
            alignItems: "center",
            padding: "10px 18px",
            borderRadius: 8,
            background: tipoTab === "alquiler" ? "#fff" : "transparent",
            border: tipoTab === "alquiler" ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: tipoTab === "alquiler" ? "0 1px 4px rgba(58,35,18,0.08)" : "none",
            color: tipoTab === "alquiler" ? "var(--antracita-900)" : "var(--antracita-500)",
            fontSize: 13,
            fontWeight: tipoTab === "alquiler" ? 600 : 500,
            cursor: "pointer",
          }}
        >
          <Home size={14} style={{ color: tipoTab === "alquiler" ? "var(--terracota-500)" : "var(--antracita-300)" }} />
          Alquileres
          <span className="mono" style={{ fontSize: 11, color: "var(--antracita-300)", fontWeight: 500 }}>
            {contratos.length}
          </span>
        </button>
        <button
          onClick={() => setTipoTab("compraventa")}
          style={{
            display: "inline-flex",
            gap: 10,
            alignItems: "center",
            padding: "10px 18px",
            borderRadius: 8,
            background: tipoTab === "compraventa" ? "#fff" : "transparent",
            border: tipoTab === "compraventa" ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: tipoTab === "compraventa" ? "0 1px 4px rgba(58,35,18,0.08)" : "none",
            color: tipoTab === "compraventa" ? "var(--antracita-900)" : "var(--antracita-500)",
            fontSize: 13,
            fontWeight: tipoTab === "compraventa" ? 600 : 500,
            cursor: "pointer",
          }}
        >
          <Gavel size={14} style={{ color: tipoTab === "compraventa" ? "var(--terracota-500)" : "var(--antracita-300)" }} />
          Compraventas
          <span className="mono" style={{ fontSize: 11, color: "var(--antracita-300)", fontWeight: 500 }}>
            {ventas.length}
          </span>
        </button>
      </div>

      {/* Stats (solo alquileres) */}
      {tipoTab === "alquiler" && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Contratos activos" value={statsAlq.total} color="var(--brand-primary)" />
          <StatCard label="Al día" value={statsAlq.alDia} color="var(--success-500)" />
          <StatCard label="Vencen en 30 días" value={statsAlq.vencePronto} color={statsAlq.vencePronto > 0 ? "#F59E0B" : undefined} />
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

      {/* ── Sub-filtros alquileres (underline tabs) ── */}
      {tipoTab === "alquiler" && (
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
          {TABS_ALQ.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltroAlq(key)}
              style={{
                padding: "10px 18px",
                background: "transparent",
                border: "none",
                borderBottom: filtroAlq === key ? "2px solid var(--terracota-500)" : "2px solid transparent",
                marginBottom: -1,
                fontSize: 13,
                fontWeight: 500,
                color: filtroAlq === key ? "var(--antracita-900)" : "var(--antracita-500)",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {/* Buscador inline */}
          <div style={{ paddingBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--antracita-300)", pointerEvents: "none" }} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por inquilino o propiedad…"
                style={{
                  padding: "7px 12px 7px 30px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: "var(--antracita-700)",
                  width: 280,
                  outline: "none",
                  background: "#fff",
                }}
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--antracita-300)" }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Buscador compraventas */}
      {tipoTab === "compraventa" && (
        <div style={{ position: "relative", maxWidth: 360 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--antracita-300)", pointerEvents: "none" }} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por vendedor, comprador o dirección…"
            style={{
              padding: "7px 12px 7px 30px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12.5,
              color: "var(--antracita-700)",
              width: "100%",
              outline: "none",
              background: "#fff",
            }}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--antracita-300)" }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Lista alquileres */}
      {tipoTab === "alquiler" && (
        <div className="space-y-3">
          {filtradosAlq.length === 0 ? (
            <div className="il-card" style={{ padding: "48px 20px", textAlign: "center" }}>
              <Home size={36} style={{ color: "var(--antracita-300)", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--antracita-400)", fontSize: 13 }}>
                {busqueda ? "Sin resultados para tu búsqueda" : filtroAlq === "atrasados" ? "No hay pagos atrasados" : filtroAlq === "al_dia" ? "No hay contratos al día" : filtroAlq === "vence_pronto" ? "Ningún contrato vence en los próximos 30 días" : "No hay contratos registrados"}
              </p>
              {(busqueda || filtroAlq !== "todos") && (
                <button onClick={() => { setBusqueda(""); setFiltroAlq("todos"); }} style={{ color: "var(--terracota-500)", fontSize: 12, marginTop: 8, background: "none", border: "none", cursor: "pointer" }}>Ver todos</button>
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
            <div className="il-card" style={{ padding: "48px 20px", textAlign: "center" }}>
              <Gavel size={36} style={{ color: "var(--antracita-300)", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--antracita-400)", fontSize: 13 }}>
                {busqueda ? "Sin resultados para tu búsqueda" : "No hay boletos de compraventa registrados"}
              </p>
              {busqueda && (
                <button onClick={() => setBusqueda("")} style={{ color: "var(--terracota-500)", fontSize: 12, marginTop: 8, background: "none", border: "none", cursor: "pointer" }}>Limpiar búsqueda</button>
              )}
              {!busqueda && (
                <button onClick={() => setShowNuevo(true)} style={{ color: "var(--terracota-500)", fontSize: 12, marginTop: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: "8px auto 0" }}>
                  <Plus size={12} />Crear primer boleto
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

      {/* Detalle alquiler */}
      {selectedAlq && (
        <ContratoDetalleModal
          contrato={selectedAlq}
          config={config}
          inmobiliaria={inmobiliaria}
          isAdmin={isAdmin}
          onClose={() => setSelectedAlqId(null)}
          onEstadoChange={handleEstadoChange}
          onDelete={handleDeleteAlq}
        />
      )}

      {/* Detalle compraventa */}
      {selectedVenta && (
        <ContratoVentaDetalleModal
          venta={selectedVenta}
          config={config}
          inmobiliaria={inmobiliaria}
          isAdmin={isAdmin}
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

    </div>
  );
}
