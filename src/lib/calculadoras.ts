// ─── Calculadora de Comisiones ───────────────────────────────────────────────

export interface ResultadoComision {
  comisionVendedor: number;
  comisionComprador: number;
  subtotal: number;
  iva: number;
  total: number;
  moneda: "ARS" | "USD";
  porcentajeVendedor: number;
  porcentajeComprador: number;
}

export function calcularComision(
  precioOperacion: number,
  moneda: "ARS" | "USD",
  porcentajeVendedor: number,
  porcentajeComprador: number,
  incluyeIVA: boolean
): ResultadoComision {
  const comisionVendedor = precioOperacion * (porcentajeVendedor / 100);
  const comisionComprador = precioOperacion * (porcentajeComprador / 100);
  const subtotal = comisionVendedor + comisionComprador;
  const iva = incluyeIVA ? subtotal * 0.21 : 0;
  const total = subtotal + iva;
  return { comisionVendedor, comisionComprador, subtotal, iva, total, moneda, porcentajeVendedor, porcentajeComprador };
}

// ─── Calculadora de Escrituración ────────────────────────────────────────────

export interface ResultadoEscrituracion {
  sellos: number;
  escribano: number;
  iti: number;
  comisionInmobiliaria: number;
  totalGastos: number;
  totalConComision: number;
  precioARS: number;
  moneda: "ARS" | "USD";
  tasaCambio: number;
}

export function calcularEscrituracion(
  precioVenta: number,
  moneda: "ARS" | "USD",
  tasaCambio: number,
  aplicaITI: boolean,
  incluyeComision: boolean
): ResultadoEscrituracion {
  const precioARS = moneda === "USD" ? precioVenta * tasaCambio : precioVenta;
  const sellos = precioARS * 0.018;
  const escribano = precioARS * 0.02;
  const iti = aplicaITI ? precioARS * 0.015 : 0;
  const comisionInmobiliaria = incluyeComision ? precioARS * 0.03 : 0;
  const totalGastos = sellos + escribano + iti;
  const totalConComision = totalGastos + comisionInmobiliaria;
  return { sellos, escribano, iti, comisionInmobiliaria, totalGastos, totalConComision, precioARS, moneda, tasaCambio };
}

// ─── Calculadora de Ajuste ICL ───────────────────────────────────────────────

export interface ResultadoICL {
  alquilerActual: number;
  nuevoAlquiler: number;
  aumento: number;
  porcentajeAumento: number;
  moneda: "ARS" | "USD";
}

export function calcularAjusteICL(
  alquilerActual: number,
  moneda: "ARS" | "USD",
  indiceInicio: number,
  indiceFin: number
): ResultadoICL {
  if (indiceInicio <= 0) {
    return { alquilerActual, nuevoAlquiler: alquilerActual, aumento: 0, porcentajeAumento: 0, moneda };
  }
  const variacion = (indiceFin - indiceInicio) / indiceInicio;
  const nuevoAlquiler = alquilerActual * (1 + variacion);
  const aumento = nuevoAlquiler - alquilerActual;
  const porcentajeAumento = variacion * 100;
  return { alquilerActual, nuevoAlquiler, aumento, porcentajeAumento, moneda };
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

export function fmt(valor: number, moneda: "ARS" | "USD"): string {
  const numero = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
  return moneda === "USD" ? `US$ ${numero}` : `$ ${numero}`;
}

export function fmtNum(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}
