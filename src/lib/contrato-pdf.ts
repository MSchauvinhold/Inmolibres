/**
 * contrato-pdf.ts
 * Builders HTML compartidos para el PDF de contratos.
 * Usados por: el wizard de creación (preview + print) y el CRM (detalle del contrato).
 * Un solo formato, una sola fuente de verdad.
 */

import { formatPrice } from "@/lib/utils";

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

// ─── Builder: Contrato de Alquiler ────────────────────────────────────────────

export function buildContratoAlquilerHtml(
  contrato:     ContratoAlquilerPdf,
  cfg:          PdfConfig | null,
  inmobiliaria: PdfInmobiliaria | null,
): string {
  const cp    = cfg?.colorPrimario     ?? "#1B4332";
  const cs    = cfg?.colorSecundario   ?? "#2C2C2C";
  const rs    = cfg?.razonSocial       ?? inmobiliaria?.nombre ?? "Inmobiliaria";
  const cuit  = cfg?.cuit              ?? "";
  const dom   = cfg?.domicilioLegal    ?? "";
  const mat   = cfg?.matriculaCorredora ?? "";
  const pie   = cfg?.piePaginaContrato
    ?? [rs, inmobiliaria?.whatsapp && `Tel: ${inmobiliaria.whatsapp}`].filter(Boolean).join(" · ");
  const hoy   = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const meses = duracionMeses(contrato.fechaInicio, contrato.fechaFin);
  const ctr   = `CTR-${contrato.id.slice(-4).toUpperCase()}`;

  // Cláusulas: override del wizard > config > default
  const clausulasRaw = contrato.clausulasOverride ?? cfg?.clausulasAdicionales ?? DEFAULT_CLAUSULAS_ALQ;
  const clausulas = clausulasRaw
    .split(/\n\n+/).filter(Boolean)
    .map((p) => `<p style="margin:0 0 8px">${p.replace(/\n/g, "<br>")}</p>`).join("");

  // Ajuste
  const ajusteLabel = contrato.ajusteActivo !== false && contrato.ajusteIndice
    ? `${contrato.ajusteIndice} · ${contrato.ajusteIndice === "IPC" ? "INDEC" : "BCRA"}`
    : "Sin ajuste";
  const ajusteSub = contrato.ajusteActivo !== false && contrato.ajusteMeses
    ? `cada ${contrato.ajusteMeses} meses`
    : "precio fijo";

  // Logo / avatar
  const logoHtml = inmobiliaria?.logoUrl
    ? `<img src="${inmobiliaria.logoUrl}" alt="${rs}" style="height:48px;width:auto;object-fit:contain;background:#fff;border-radius:8px;padding:4px;flex-shrink:0"/>`
    : `<div style="width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,${cp},${cs});display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:600;flex-shrink:0">${rs.charAt(0).toUpperCase()}</div>`;

  // Firma del locador
  const digitalFirma = contrato.tipoFirma === "DIGITAL" && inmobiliaria?.firmaUrl;
  const firmaLocadorHtml = digitalFirma
    ? `<img class="firma-img" src="${inmobiliaria!.firmaUrl}" alt="Firma">`
    : `<div class="sline"></div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Contrato — ${contrato.inquilinoNombre}</title>
<style>${buildCss(cp, cs)}.sigs{grid-template-columns:1fr 1fr}</style>
</head><body>
<div class="wm">VIGENTE</div>
<div class="page">
<div class="hband">
  <div class="hleft">${logoHtml}<div>
    <div class="aname">${rs}</div>
    ${cuit ? `<div class="ameta">CUIT ${cuit}${mat ? ` · Mat. ${mat}` : ""}</div>` : ""}
    ${dom ? `<div class="ameta" style="font-family:inherit">${dom}</div>` : ""}
  </div></div>
  <div style="text-align:right"><div class="flabel">Folio</div><div class="fnum">${ctr}</div><div class="fdate">Emitido ${hoy}</div></div>
</div>
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
    <div class="pname">${contrato.inquilinoNombre}</div>
    <div class="pdet">${contrato.inquilinoTel}</div>
  </div>
</div>
<div class="propbox">
  <div class="proplab">Inmueble objeto del contrato</div>
  <div class="propgr">
    <div><div class="ptit">${contrato.propiedad.titulo}</div><div class="padr">${contrato.propiedad.direccion}</div></div>
    <div><div class="dlabel">Duración</div><div class="dval">${meses} meses</div></div>
    <div><div class="dlabel">Día de pago</div><div class="dval">Día ${contrato.diaVencimientoPago}</div></div>
  </div>
</div>
<div class="sectit">I — Condiciones económicas</div>
<div class="cgrid">
  <div class="fch"><div class="flh">Valor inicial</div><div class="fvh">${formatPrice(contrato.precioMensual, contrato.moneda)}</div><div class="fs">${contrato.moneda} · mensual</div></div>
  <div class="fc"><div class="fl">Día de pago</div><div class="fv">${contrato.diaVencimientoPago}</div><div class="fs">de cada mes</div></div>
  <div class="fc"><div class="fl">Plazo</div><div class="fv">${meses} meses</div><div class="fs">${fmtFecha(contrato.fechaInicio)} – ${fmtFecha(contrato.fechaFin)}</div></div>
  <div class="fc"><div class="fl">Ajuste</div><div class="fv">${ajusteLabel}</div><div class="fs">${ajusteSub}</div></div>
</div>
<p class="intro">En la ciudad de <strong>Paso de los Libres, Corrientes</strong>, entre <strong>${rs}</strong>${cuit ? `, CUIT ${cuit}` : ""}${dom ? `, con domicilio en ${dom}` : ""}${mat ? `, corredor inmobiliario matrícula N° ${mat}` : ""}, en adelante el <strong>LOCADOR</strong>; y <strong>${contrato.inquilinoNombre}</strong>, tel. ${contrato.inquilinoTel}, en adelante el <strong>LOCATARIO</strong>; se celebra el presente Contrato de Locación bajo los siguientes términos y condiciones:</p>
<div class="sectit">II — Cláusulas y condiciones</div>
<div class="clauses">${clausulas}</div>
<div class="sigs">
  <div>${firmaLocadorHtml}<div class="srole">Locador / Inmobiliaria</div><div class="sname">${rs}</div>${mat ? `<div class="sname">Mat. N° ${mat}</div>` : ""}</div>
  <div><div class="sline"></div><div class="srole">Locatario</div><div class="sname">${contrato.inquilinoNombre}</div><div class="sname">Tel: ${contrato.inquilinoTel}</div></div>
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
  const cp    = cfg?.colorPrimario     ?? "#1B4332";
  const cs    = cfg?.colorSecundario   ?? "#2C2C2C";
  const rs    = cfg?.razonSocial       ?? inmobiliaria?.nombre ?? "Inmobiliaria";
  const cuit  = cfg?.cuit              ?? "";
  const dom   = cfg?.domicilioLegal    ?? "";
  const mat   = cfg?.matriculaCorredora ?? "";
  const pie   = cfg?.piePaginaContrato
    ?? [rs, inmobiliaria?.whatsapp && `Tel: ${inmobiliaria.whatsapp}`].filter(Boolean).join(" · ");
  const hoy   = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const bcv   = `BCV-${venta.id.slice(-4).toUpperCase()}`;

  const clausulaParrafos = (venta.clausulas ?? "")
    .split(/\n\n+/).filter(Boolean)
    .map((p) => `<p style="margin:0 0 8px">${p.replace(/\n/g, "<br>")}</p>`).join("");

  const logoHtml = inmobiliaria?.logoUrl
    ? `<img src="${inmobiliaria.logoUrl}" alt="${rs}" style="height:48px;width:auto;object-fit:contain;background:#fff;border-radius:8px;padding:4px;flex-shrink:0"/>`
    : `<div style="width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,${cp},${cs});display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:600;flex-shrink:0">${rs.charAt(0).toUpperCase()}</div>`;

  const digitalFirma = venta.tipoFirma === "DIGITAL" && inmobiliaria?.firmaUrl;
  const firmaCorredorHtml = digitalFirma
    ? `<img class="firma-img" src="${inmobiliaria!.firmaUrl}" alt="Firma">`
    : `<div class="sline"></div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Boleto CV — ${venta.compradorNombre}</title>
<style>${buildCss(cp, cs)}.sigs{grid-template-columns:1fr 1fr 1fr}</style>
</head><body>
<div class="wm">BOLETO</div>
<div class="page">
<div class="hband">
  <div class="hleft">${logoHtml}<div>
    <div class="aname">${rs}</div>
    ${cuit ? `<div class="ameta">CUIT ${cuit}${mat ? ` · Mat. ${mat}` : ""}</div>` : ""}
    ${dom ? `<div class="ameta" style="font-family:inherit">${dom}</div>` : ""}
  </div></div>
  <div style="text-align:right"><div class="flabel">Folio</div><div class="fnum">${bcv}</div><div class="fdate">Emitido ${hoy}</div></div>
</div>
<div class="tarea">
  <div class="tsub">Instrumento privado</div>
  <div class="ttit">Boleto de Compraventa</div>
</div>
<div class="pgrid">
  <div class="pcard" style="border-top:3px solid ${cp}">
    <div class="prole">Vendedor</div>
    <div class="pname">${venta.vendedorNombre}</div>
    <div class="pdet">DNI ${venta.vendedorDni}</div>
    ${venta.vendedorDomicilio ? `<div class="pdet" style="font-family:inherit">${venta.vendedorDomicilio}</div>` : ""}
  </div>
  <div class="pcard" style="border-top:3px solid #D4A853">
    <div class="prole">Comprador</div>
    <div class="pname">${venta.compradorNombre}</div>
    <div class="pdet">DNI ${venta.compradorDni}</div>
    ${venta.compradorDomicilio ? `<div class="pdet" style="font-family:inherit">${venta.compradorDomicilio}</div>` : ""}
  </div>
</div>
<div class="propbox">
  <div class="proplab">Inmueble objeto de la operación</div>
  <div class="ptit">${venta.propiedadDireccion}</div>
  ${venta.propiedadDescripcion ? `<div class="padr">${venta.propiedadDescripcion}</div>` : ""}
  ${venta.matriculaInmueble ? `<div style="font-size:10px;color:#7A7268;margin-top:4px;font-family:monospace">Matrícula: ${venta.matriculaInmueble}</div>` : ""}
</div>
<div class="sectit">I — Condiciones económicas</div>
<div class="cgrid">
  <div class="fch"><div class="flh">Precio de venta</div><div class="fvh">${formatPrice(venta.precioVenta, venta.moneda)}</div><div class="fs">${venta.moneda} · contado</div></div>
  <div class="fc"><div class="fl">Seña / Reserva</div><div class="fv">${venta.sena ? formatPrice(venta.sena, venta.moneda) : "—"}</div><div class="fs">al momento de firma</div></div>
  <div class="fc"><div class="fl">Forma de pago</div><div class="fv">${venta.formaPago}</div><div class="fs">acordada entre partes</div></div>
  <div class="fc"><div class="fl">Comisiones</div><div class="fv">V ${venta.comisionVendedorPct}% · C ${venta.comisionCompradorPct}%</div><div class="fs">sobre precio de venta</div></div>
</div>
${(venta.escribanoNombre || venta.fechaEscritura) ? `<div class="escrbox"><div class="fl" style="margin-bottom:6px">Escribanía</div>${venta.escribanoNombre ? `<div style="font-size:12.5px;font-weight:600;color:#221E19">${venta.escribanoNombre}${venta.escribanoRegistro ? ` · Reg. ${venta.escribanoRegistro}` : ""}</div>` : ""}${venta.fechaEscritura ? `<div style="font-size:11px;color:#7A7268;margin-top:3px">Fecha de escritura tentativa: ${fmtFechaLarga(venta.fechaEscritura)}</div>` : ""}</div>` : ""}
${clausulaParrafos ? `<div class="sectit">II — Cláusulas especiales</div><div class="clauses">${clausulaParrafos}</div>` : ""}
<div class="sigs">
  <div><div class="sline"></div><div class="srole">Vendedor</div><div class="sname">${venta.vendedorNombre}</div></div>
  <div><div class="sline"></div><div class="srole">Comprador</div><div class="sname">${venta.compradorNombre}</div></div>
  <div>${firmaCorredorHtml}<div class="srole">Corredor Inmobiliario</div><div class="sname">${rs}</div>${mat ? `<div class="sname">Mat. N° ${mat}</div>` : ""}</div>
</div>
<div class="footer"><span>${pie}</span></div>
</div></body></html>`;
}

// ─── Helper: abrir en ventana y disparar print ────────────────────────────────

export function printHtml(html: string, onBlocked?: () => void): void {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) { onBlocked?.(); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}
