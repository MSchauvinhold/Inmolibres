/**
 * contrato-pdf.ts
 * Builders HTML compartidos para el PDF de contratos.
 * Usados por: el wizard de creación (preview + print) y el CRM (detalle del contrato,
 * incluido el comprobante de cada pago registrado).
 * Un solo formato, una sola fuente de verdad.
 */

import { formatPrice, TZ_AR } from "@/lib/utils";

// ─── Tipos mínimos aceptados por los builders ─────────────────────────────────

export interface PdfConfig {
  colorPrimario?:     string | null;
  colorSecundario?:   string | null;
  razonSocial?:       string | null;
  cuit?:              string | null;
  domicilioLegal?:    string | null;
  matriculaCorredora?: string | null;
  piePaginaContrato?: string | null;
  clausulasAdicionales?: string | null;
  logoEnContrato?:    boolean | null;
  ciudad?:            string | null;
  provincia?:         string | null;
}

export interface PdfInmobiliaria {
  nombre:   string;
  logoUrl:  string | null;
  firmaUrl?: string | null;
  whatsapp: string;
  email?:   string;
}

export interface ContratoAlquilerPdf {
  id:                string;         // folio: CTR-XXXX (usar "PREV" en preview)
  inquilinoNombre:   string;
  inquilinoTel:      string;
  precioMensual:     number;
  moneda:            "ARS" | "USD";
  diaVencimientoPago: number;
  fechaInicio:       string;         // YYYY-MM-DD
  fechaFin:          string;         // YYYY-MM-DD
  ajusteActivo?:     boolean;
  ajusteIndice?:     string;
  ajusteMeses?:      number;
  tipoFirma?:        string | null;
  propiedad:         { titulo: string; direccion: string };
  /** Si se pasa, reemplaza las cláusulas del config (permite que el wizard pase las editadas) */
  clausulasOverride?: string | null;
}

export interface ContratoVentaPdf {
  id:                  string;
  vendedorNombre:      string;
  vendedorDni:         string;
  vendedorDomicilio?:  string | null;
  compradorNombre:     string;
  compradorDni:        string;
  compradorDomicilio?: string | null;
  propiedadDireccion:  string;
  propiedadDescripcion?: string | null;
  matriculaInmueble?:  string | null;
  precioVenta:         number;
  moneda:              "ARS" | "USD";
  sena?:               number | null;
  comisionVendedorPct: number;
  comisionCompradorPct: number;
  formaPago:           string;
  escribanoNombre?:    string | null;
  escribanoRegistro?:  string | null;
  fechaEscritura?:     string | null;
  clausulas?:          string | null;
  tipoFirma?:          string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function duracionMeses(inicio: string, fin: string): number {
  const d1 = new Date(inicio + "T00:00:00");
  const d2 = new Date(fin    + "T00:00:00");
  return (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
}

function fmtFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtFechaLarga(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/**
 * Escapa texto libre antes de interpolarlo en el HTML del contrato.
 * Los datos salen de la config de la inmobiliaria y de los contratos cargados en
 * el CRM: sin esto, un `<script>` guardado en un nombre, una dirección o una
 * cláusula se ejecuta al abrir el preview o el PDF (XSS almacenado).
 */
function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Colores de marca: se interpolan dentro del <style>, donde escapar no alcanza.
 * Solo se acepta hex; cualquier otra cosa cae al color por defecto.
 */
function safeColor(v: string | null | undefined, fallback: string): string {
  const t = typeof v === "string" ? v.trim() : "";
  return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(t) ? t : fallback;
}

/** URL para el src de un <img>: solo http(s), ya escapada para el atributo. */
function safeUrl(v: string | null | undefined): string | null {
  const t = typeof v === "string" ? v.trim() : "";
  return /^https?:\/\//i.test(t) ? esc(t) : null;
}

/** Texto multilínea (cláusulas) → párrafos HTML, escapando cada línea. */
function parrafosHtml(texto: string): string {
  return texto
    .split(/\n\n+/).filter(Boolean)
    .map((p) => `<p style="margin:0 0 8px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const DEFAULT_CLAUSULAS_ALQ = `PRIMERA — DESTINO: El inmueble será destinado exclusivamente a uso habitacional familiar, quedando prohibida su utilización para cualquier otra actividad.

SEGUNDA — SUBARRENDAMIENTO: El locatario no podrá subarrendar, ceder ni transferir este contrato sin el consentimiento expreso y por escrito del locador.

TERCERA — CONSERVACIÓN: El locatario se compromete a mantener el inmueble en perfectas condiciones de conservación e higiene, realizando las reparaciones locativas a su cargo.

CUARTA — SERVICIOS: Todos los servicios (energía eléctrica, gas, agua corriente, internet, etc.) serán abonados íntegramente por el locatario desde la fecha de inicio del contrato.

QUINTA — DEPÓSITO EN GARANTÍA: Al momento de la firma, el locatario entregará en concepto de depósito en garantía el equivalente a un (1) mes de alquiler, el cual le será devuelto al finalizar el contrato previa verificación del estado del inmueble.

SEXTA — ACTUALIZACIONES: El precio del alquiler será actualizado conforme a la variación del Índice de Contratos de Locación (ICL) publicado por el BCRA, de acuerdo con la Ley N° 27.737 y sus normas reglamentarias.

SÉPTIMA — ENTREGA: A la finalización del contrato, el locatario deberá entregar el inmueble libre de personas y bienes, en las mismas condiciones en que lo recibió, salvo el desgaste normal por el uso.

OCTAVA — DOMICILIOS ESPECIALES: Las partes constituyen domicilios especiales en los indicados en el presente instrumento, donde serán válidas todas las notificaciones judiciales y extrajudiciales.`;

// ─── CSS compartido ───────────────────────────────────────────────────────────

function buildCss(cp: string, cs: string): string {
  return `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,"Times New Roman",serif;font-size:11.5px;line-height:1.7;color:#221E19;background:#fff}
.page{background:#fff;border-top:4px solid ${cp};padding:36px 40px 32px;position:relative}
.hband{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid #E5DED4;margin-bottom:22px}
.hleft{display:flex;gap:12px;align-items:center}
.aname{font-size:18px;font-weight:600;color:#221E19;line-height:1}
.ameta{font-size:10px;color:#7A7268;margin-top:4px;font-family:monospace}
.fnum{font-size:20px;font-weight:600;color:#221E19;margin-top:2px;font-family:monospace}
.flabel{font-size:9px;color:#B8AFA8;text-transform:uppercase;letter-spacing:.12em;font-family:monospace}
.fdate{font-size:10px;color:#7A7268;margin-top:6px}
.tarea{text-align:center;margin-bottom:24px}
.tsub{font-size:9.5px;color:${cp};text-transform:uppercase;letter-spacing:.16em;font-weight:600;font-family:monospace}
.ttit{font-size:24px;font-weight:600;color:#221E19;margin-top:8px}
.pgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.pcard{padding:11px 13px;background:#F7F4EE;border:1px solid #E5DED4;border-radius:8px}
.prole{font-size:9px;color:#B8AFA8;text-transform:uppercase;letter-spacing:.1em;font-weight:600;font-family:monospace}
.pname{font-size:13px;font-weight:600;color:#221E19;margin-top:4px}
.pdet{font-size:10px;color:#7A7268;margin-top:2px;font-family:monospace}
.propbox{background:#FDFCF9;border:1px dashed #E5DED4;border-radius:9px;padding:13px;margin-bottom:20px}
.proplab{font-size:9px;color:#B8AFA8;text-transform:uppercase;letter-spacing:.1em;font-weight:600;font-family:monospace;margin-bottom:8px}
.propgr{display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px;align-items:center}
.ptit{font-size:13.5px;font-weight:600;color:#221E19}
.padr{font-size:11px;color:#7A7268}
.dlabel{font-size:9px;color:#B8AFA8;text-transform:uppercase;font-family:monospace}
.dval{font-size:13px;font-weight:600;color:#221E19;margin-top:3px}
.sectit{font-size:12px;font-weight:600;color:#221E19;margin:0 0 10px;letter-spacing:.02em}
.cgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
.fc{padding:9px 11px;background:#F7F4EE;border:1px solid #E5DED4;border-radius:7px}
.fch{padding:9px 11px;background:#FAE8E2;border:1px solid #E0A088;border-radius:7px}
.fl{font-size:9px;color:#B8AFA8;text-transform:uppercase;letter-spacing:.08em;font-weight:600;font-family:monospace}
.flh{font-size:9px;color:${cp};text-transform:uppercase;letter-spacing:.08em;font-weight:600;font-family:monospace}
.fv{font-size:13px;font-weight:600;color:#221E19;margin-top:4px;font-family:monospace}
.fvh{font-size:13px;font-weight:600;color:${cp};margin-top:4px;font-family:monospace}
.fs{font-size:9.5px;color:#7A7268;margin-top:2px}
.intro{font-size:11px;color:#524D48;line-height:1.7;margin-bottom:16px}
.escrbox{background:#FDFCF9;border:1px solid #E5DED4;border-radius:8px;padding:10px 13px;margin-bottom:16px}
.clauses{font-size:11px;color:#524D48;line-height:1.7;columns:2;column-gap:20px;margin-bottom:24px}
.sigs{display:grid;gap:40px;padding-top:20px;border-top:1px solid #E5DED4;break-inside:avoid;page-break-inside:avoid}
.sline{height:52px;border-bottom:1px solid #221E19;margin-bottom:6px}
.srole{font-size:10.5px;font-weight:600;color:#524D48;text-align:center}
.sname{font-size:10px;color:#7A7268;text-align:center;margin-top:2px}
.firma-img{height:52px;max-width:160px;margin:0 auto 4px;display:block;object-fit:contain}
.footer{margin-top:20px;padding-top:12px;border-top:1px solid #E5DED4;display:flex;justify-content:space-between;font-size:9px;color:#B8AFA8;font-family:monospace}
.wm{position:fixed;top:60px;right:30px;transform:rotate(8deg);opacity:.04;font-size:72px;color:${cp};font-weight:700;pointer-events:none}
@media print{
  @page{
    size:A4;
    margin:10mm;
    @bottom-right{content:"Página " counter(page) " de " counter(pages);font-family:monospace;font-size:8.5px;color:#B8AFA8}
  }
  .clauses{break-inside:avoid}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// ─── Encabezado compartido (datos de la inmobiliaria + logo + folio) ─────────

function datosEmisor(cfg: PdfConfig | null, inmobiliaria: PdfInmobiliaria | null) {
  // Todo lo que sale de acá ya viene escapado: los builders lo interpolan directo.
  const rsRaw  = cfg?.razonSocial ?? inmobiliaria?.nombre ?? "Inmobiliaria";
  const pieRaw = cfg?.piePaginaContrato
    ?? [rsRaw, inmobiliaria?.whatsapp && `Tel: ${inmobiliaria.whatsapp}`].filter(Boolean).join(" · ");
  const hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ_AR });
  return {
    cp:      safeColor(cfg?.colorPrimario, "#1B4332"),
    cs:      safeColor(cfg?.colorSecundario, "#2C2C2C"),
    rs:      esc(rsRaw),
    inicial: esc(rsRaw.charAt(0).toUpperCase()),
    cuit:    esc(cfg?.cuit ?? ""),
    dom:     esc(cfg?.domicilioLegal ?? ""),
    mat:     esc(cfg?.matriculaCorredora ?? ""),
    pie:     esc(pieRaw),
    hoy,
  };
}

function buildHband(
  e: ReturnType<typeof datosEmisor>,
  inmobiliaria: PdfInmobiliaria | null,
  folioLabel: string,
  folio: string,
): string {
  const logoUrl = safeUrl(inmobiliaria?.logoUrl);
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${e.rs}" style="height:48px;width:auto;object-fit:contain;background:#fff;border-radius:8px;padding:4px;flex-shrink:0"/>`
    : `<div style="width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,${e.cp},${e.cs});display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:600;flex-shrink:0">${e.inicial}</div>`;

  return `<div class="hband">
  <div class="hleft">${logoHtml}<div>
    <div class="aname">${e.rs}</div>
    ${e.cuit ? `<div class="ameta">CUIT ${e.cuit}${e.mat ? ` · Mat. ${e.mat}` : ""}</div>` : ""}
    ${e.dom ? `<div class="ameta" style="font-family:inherit">${e.dom}</div>` : ""}
  </div></div>
  <div style="text-align:right"><div class="flabel">${folioLabel}</div><div class="fnum">${folio}</div><div class="fdate">Emitido ${e.hoy}</div></div>
</div>`;
}

// ─── Builder: Contrato de Alquiler ────────────────────────────────────────────

export function buildContratoAlquilerHtml(
  contrato:     ContratoAlquilerPdf,
  cfg:          PdfConfig | null,
  inmobiliaria: PdfInmobiliaria | null,
): string {
  const emisor = datosEmisor(cfg, inmobiliaria);
  const { cp, cs, rs, cuit, dom, mat, pie } = emisor;
  const meses = duracionMeses(contrato.fechaInicio, contrato.fechaFin);
  const ctr   = `CTR-${contrato.id.slice(-4).toUpperCase()}`;
  const lugar = esc(`${cfg?.ciudad ?? "Paso de los Libres"}, ${cfg?.provincia ?? "Corrientes"}`);

  // Texto libre del contrato: se escapa una sola vez acá y después se interpola directo.
  const inquilino  = esc(contrato.inquilinoNombre);
  const inquilinoTel = esc(contrato.inquilinoTel);
  const propTitulo = esc(contrato.propiedad.titulo);
  const propDir    = esc(contrato.propiedad.direccion);
  const moneda     = esc(contrato.moneda);

  // Cláusulas: override del wizard > config > default
  const clausulasRaw = contrato.clausulasOverride ?? cfg?.clausulasAdicionales ?? DEFAULT_CLAUSULAS_ALQ;
  const clausulas = parrafosHtml(clausulasRaw);

  // Ajuste
  const ajusteLabel = contrato.ajusteActivo !== false && contrato.ajusteIndice
    ? esc(`${contrato.ajusteIndice} · ${contrato.ajusteIndice === "IPC" ? "INDEC" : "BCRA"}`)
    : "Sin ajuste";
  const ajusteSub = contrato.ajusteActivo !== false && contrato.ajusteMeses
    ? `cada ${contrato.ajusteMeses} meses`
    : "precio fijo";

  // Firma del locador
  const firmaUrl = contrato.tipoFirma === "DIGITAL" ? safeUrl(inmobiliaria?.firmaUrl) : null;
  const firmaLocadorHtml = firmaUrl
    ? `<img class="firma-img" src="${firmaUrl}" alt="Firma">`
    : `<div class="sline"></div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Contrato — ${inquilino}</title>
<style>${buildCss(cp, cs)}.sigs{grid-template-columns:1fr 1fr}</style>
</head><body>
<div class="wm">VIGENTE</div>
<div class="page">
${buildHband(emisor, inmobiliaria, "Folio", ctr)}
<div class="tarea">
  <div class="tsub">Ley 27.551 — Régimen general</div>
  <div class="ttit">Contrato de Locación de Inmueble</div>
</div>
<div class="pgrid">
  <div class="pcard" style="border-top:3px solid ${cp}">
    <div class="prole">Locador / Inmobiliaria</div>
    <div class="pname">${rs}</div>
    ${cuit ? `<div class="pdet">CUIT ${cuit}</div>` : ""}
    ${dom ? `<div class="pdet" style="font-family:inherit">${dom}</div>` : ""}
  </div>
  <div class="pcard" style="border-top:3px solid #D4A853">
    <div class="prole">Locatario</div>
    <div class="pname">${inquilino}</div>
    <div class="pdet">${inquilinoTel}</div>
  </div>
</div>
<div class="propbox">
  <div class="proplab">Inmueble objeto del contrato</div>
  <div class="propgr">
    <div><div class="ptit">${propTitulo}</div><div class="padr">${propDir}</div></div>
    <div><div class="dlabel">Duración</div><div class="dval">${meses} meses</div></div>
    <div><div class="dlabel">Día de pago</div><div class="dval">Día ${contrato.diaVencimientoPago}</div></div>
  </div>
</div>
<div class="sectit">I — Condiciones económicas</div>
<div class="cgrid">
  <div class="fch"><div class="flh">Valor inicial</div><div class="fvh">${formatPrice(contrato.precioMensual, contrato.moneda)}</div><div class="fs">${moneda} · mensual</div></div>
  <div class="fc"><div class="fl">Día de pago</div><div class="fv">${contrato.diaVencimientoPago}</div><div class="fs">de cada mes</div></div>
  <div class="fc"><div class="fl">Plazo</div><div class="fv">${meses} meses</div><div class="fs">${fmtFecha(contrato.fechaInicio)} – ${fmtFecha(contrato.fechaFin)}</div></div>
  <div class="fc"><div class="fl">Ajuste</div><div class="fv">${ajusteLabel}</div><div class="fs">${ajusteSub}</div></div>
</div>
<p class="intro">En la ciudad de <strong>${lugar}</strong>, entre <strong>${rs}</strong>${cuit ? `, CUIT ${cuit}` : ""}${dom ? `, con domicilio en ${dom}` : ""}${mat ? `, corredor inmobiliario matrícula N° ${mat}` : ""}, en adelante el <strong>LOCADOR</strong>; y <strong>${inquilino}</strong>, tel. ${inquilinoTel}, en adelante el <strong>LOCATARIO</strong>; se celebra el presente Contrato de Locación bajo los siguientes términos y condiciones:</p>
<div class="sectit">II — Cláusulas y condiciones</div>
<div class="clauses">${clausulas}</div>
<div class="sigs">
  <div>${firmaLocadorHtml}<div class="srole">Locador / Inmobiliaria</div><div class="sname">${rs}</div>${mat ? `<div class="sname">Mat. N° ${mat}</div>` : ""}</div>
  <div><div class="sline"></div><div class="srole">Locatario</div><div class="sname">${inquilino}</div><div class="sname">Tel: ${inquilinoTel}</div></div>
</div>
<div class="footer"><span>${pie}</span></div>
</div></body></html>`;
}

// ─── Builder: Boleto de Compraventa ──────────────────────────────────────────

export function buildContratoVentaHtml(
  venta:        ContratoVentaPdf,
  cfg:          PdfConfig | null,
  inmobiliaria: PdfInmobiliaria | null,
): string {
  const emisor = datosEmisor(cfg, inmobiliaria);
  const { cp, cs, rs, mat, pie } = emisor;
  const bcv   = `BCV-${venta.id.slice(-4).toUpperCase()}`;

  // Texto libre cargado en el CRM: escapado una sola vez, acá.
  const vendedor      = esc(venta.vendedorNombre);
  const vendedorDni   = esc(venta.vendedorDni);
  const vendedorDom   = esc(venta.vendedorDomicilio);
  const comprador     = esc(venta.compradorNombre);
  const compradorDni  = esc(venta.compradorDni);
  const compradorDom  = esc(venta.compradorDomicilio);
  const propDir       = esc(venta.propiedadDireccion);
  const propDesc      = esc(venta.propiedadDescripcion);
  const matriculaInm  = esc(venta.matriculaInmueble);
  const formaPago     = esc(venta.formaPago);
  const escribano     = esc(venta.escribanoNombre);
  const escribanoReg  = esc(venta.escribanoRegistro);
  const moneda        = esc(venta.moneda);

  const clausulaParrafos = parrafosHtml(venta.clausulas ?? "");

  const firmaUrl = venta.tipoFirma === "DIGITAL" ? safeUrl(inmobiliaria?.firmaUrl) : null;
  const firmaCorredorHtml = firmaUrl
    ? `<img class="firma-img" src="${firmaUrl}" alt="Firma">`
    : `<div class="sline"></div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Boleto CV — ${comprador}</title>
<style>${buildCss(cp, cs)}.sigs{grid-template-columns:1fr 1fr 1fr}</style>
</head><body>
<div class="wm">BOLETO</div>
<div class="page">
${buildHband(emisor, inmobiliaria, "Folio", bcv)}
<div class="tarea">
  <div class="tsub">Instrumento privado</div>
  <div class="ttit">Boleto de Compraventa</div>
</div>
<div class="pgrid">
  <div class="pcard" style="border-top:3px solid ${cp}">
    <div class="prole">Vendedor</div>
    <div class="pname">${vendedor}</div>
    <div class="pdet">DNI ${vendedorDni}</div>
    ${vendedorDom ? `<div class="pdet" style="font-family:inherit">${vendedorDom}</div>` : ""}
  </div>
  <div class="pcard" style="border-top:3px solid #D4A853">
    <div class="prole">Comprador</div>
    <div class="pname">${comprador}</div>
    <div class="pdet">DNI ${compradorDni}</div>
    ${compradorDom ? `<div class="pdet" style="font-family:inherit">${compradorDom}</div>` : ""}
  </div>
</div>
<div class="propbox">
  <div class="proplab">Inmueble objeto de la operación</div>
  <div class="ptit">${propDir}</div>
  ${propDesc ? `<div class="padr">${propDesc}</div>` : ""}
  ${matriculaInm ? `<div style="font-size:10px;color:#7A7268;margin-top:4px;font-family:monospace">Matrícula: ${matriculaInm}</div>` : ""}
</div>
<div class="sectit">I — Condiciones económicas</div>
<div class="cgrid">
  <div class="fch"><div class="flh">Precio de venta</div><div class="fvh">${formatPrice(venta.precioVenta, venta.moneda)}</div><div class="fs">${moneda} · contado</div></div>
  <div class="fc"><div class="fl">Seña / Reserva</div><div class="fv">${venta.sena ? formatPrice(venta.sena, venta.moneda) : "—"}</div><div class="fs">al momento de firma</div></div>
  <div class="fc"><div class="fl">Forma de pago</div><div class="fv">${formaPago}</div><div class="fs">acordada entre partes</div></div>
  <div class="fc"><div class="fl">Comisiones</div><div class="fv">V ${venta.comisionVendedorPct}% · C ${venta.comisionCompradorPct}%</div><div class="fs">sobre precio de venta</div></div>
</div>
${(escribano || venta.fechaEscritura) ? `<div class="escrbox"><div class="fl" style="margin-bottom:6px">Escribanía</div>${escribano ? `<div style="font-size:12.5px;font-weight:600;color:#221E19">${escribano}${escribanoReg ? ` · Reg. ${escribanoReg}` : ""}</div>` : ""}${venta.fechaEscritura ? `<div style="font-size:11px;color:#7A7268;margin-top:3px">Fecha de escritura tentativa: ${fmtFechaLarga(venta.fechaEscritura)}</div>` : ""}</div>` : ""}
${clausulaParrafos ? `<div class="sectit">II — Cláusulas especiales</div><div class="clauses">${clausulaParrafos}</div>` : ""}
<div class="sigs">
  <div><div class="sline"></div><div class="srole">Vendedor</div><div class="sname">${vendedor}</div></div>
  <div><div class="sline"></div><div class="srole">Comprador</div><div class="sname">${comprador}</div></div>
  <div>${firmaCorredorHtml}<div class="srole">Corredor Inmobiliario</div><div class="sname">${rs}</div>${mat ? `<div class="sname">Mat. N° ${mat}</div>` : ""}</div>
</div>
<div class="footer"><span>${pie}</span></div>
</div></body></html>`;
}

// ─── Builder: Comprobante de pago de alquiler ────────────────────────────────

export interface PagoComprobantePdf {
  id:         string;
  concepto:   string;         // se usa como período (ej: "Pago septiembre de 2026")
  monto:      number;
  moneda:     "ARS" | "USD";
  metodoPago: string | null;
  fecha:      string;         // YYYY-MM-DD
}

export interface ContratoComprobantePdf {
  id:              string;
  inquilinoNombre: string;
  inquilinoTel:    string;
  inquilinoDni?:   string | null;  // solo si el contrato tiene un contacto inquilino con DNI
  propiedad:       { titulo: string; direccion: string };
}

/** Un documento, dos páginas idénticas: "Copia inquilino" y "Copia inmobiliaria". */
export function buildComprobantePagoHtml(
  pago:         PagoComprobantePdf,
  contrato:     ContratoComprobantePdf,
  cfg:          PdfConfig | null,
  inmobiliaria: PdfInmobiliaria | null,
): string {
  const emisor = datosEmisor(cfg, inmobiliaria);
  const { cp, cs, rs, cuit, dom, pie } = emisor;
  const rec   = `REC-${pago.id.slice(-6).toUpperCase()}`;
  const ctr   = `CTR-${contrato.id.slice(-4).toUpperCase()}`;
  const monto = formatPrice(pago.monto, pago.moneda);

  // Texto libre (inquilino, propiedad, concepto del pago): escapado una sola vez.
  const inquilino    = esc(contrato.inquilinoNombre);
  const inquilinoTel = esc(contrato.inquilinoTel);
  const inquilinoDni = esc(contrato.inquilinoDni);
  const propTitulo   = esc(contrato.propiedad.titulo);
  const propDir      = esc(contrato.propiedad.direccion);
  const concepto     = esc(pago.concepto);
  const metodoPago   = esc(pago.metodoPago) || "—";
  const moneda       = esc(pago.moneda);

  const copia = (label: string) => `<div class="page">
${buildHband(emisor, inmobiliaria, "Comprobante", rec)}
<div class="tarea">
  <div class="tsub">${label}</div>
  <div class="ttit">Comprobante de pago</div>
</div>
<div class="pgrid">
  <div class="pcard" style="border-top:3px solid #D4A853">
    <div class="prole">Recibido de (locatario)</div>
    <div class="pname">${inquilino}</div>
    ${inquilinoDni ? `<div class="pdet">DNI ${inquilinoDni}</div>` : ""}
    <div class="pdet">${inquilinoTel}</div>
  </div>
  <div class="pcard" style="border-top:3px solid ${cp}">
    <div class="prole">Recibido por</div>
    <div class="pname">${rs}</div>
    ${cuit ? `<div class="pdet">CUIT ${cuit}</div>` : ""}
    ${dom ? `<div class="pdet" style="font-family:inherit">${dom}</div>` : ""}
  </div>
</div>
<div class="propbox">
  <div class="proplab">Inmueble · Contrato ${ctr}</div>
  <div class="ptit">${propTitulo}</div><div class="padr">${propDir}</div>
</div>
<div class="cgrid">
  <div class="fch"><div class="flh">Monto</div><div class="fvh">${monto}</div><div class="fs">${moneda}</div></div>
  <div class="fc"><div class="fl">Período</div><div class="fv" style="font-family:inherit">${concepto}</div></div>
  <div class="fc"><div class="fl">Fecha de pago</div><div class="fv">${fmtFecha(pago.fecha)}</div></div>
  <div class="fc"><div class="fl">Método</div><div class="fv" style="font-family:inherit">${metodoPago}</div></div>
</div>
<p class="intro">Recibimos de <strong>${inquilino}</strong>${inquilinoDni ? `, DNI ${inquilinoDni}` : ""}, la suma de <strong>${monto}</strong> en concepto de <strong>${concepto}</strong>, correspondiente a la locación del inmueble ubicado en ${propDir}.</p>
<div class="sigs" style="grid-template-columns:1fr;max-width:260px;margin-left:auto">
  <div><div class="sline"></div><div class="srole">Firma y aclaración</div><div class="sname">${rs}</div></div>
</div>
<div class="footer"><span>${pie}</span><span>${rec}</span></div>
</div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Comprobante ${rec} — ${inquilino}</title>
<style>${buildCss(cp, cs)}.page+.page{break-before:page;page-break-before:always}</style>
</head><body>
<div class="wm">PAGADO</div>
${copia("Copia inquilino")}
${copia("Copia inmobiliaria")}
</body></html>`;
}

// ─── Helper: abrir en ventana y disparar print ────────────────────────────────

export function printHtml(html: string, onBlocked?: () => void): void {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) { onBlocked?.(); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}
