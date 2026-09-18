import { z } from "zod";

/**
 * Validación de la configuración de contratos/PDF de cada inmobiliaria.
 *
 * Estos campos terminan interpolados en el HTML del contrato y del comprobante
 * (ver `lib/contrato-pdf.ts`). Ahí se escapan, pero además se validan en la entrada:
 * los colores se usan dentro de un <style> (donde escapar no alcanza) y el texto
 * libre no tiene ningún motivo legítimo para traer marcado HTML.
 */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Texto libre de contratos: sin `<` ni `>`, para que no entre marcado. */
const textoLibre = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label}: máximo ${max} caracteres`)
    .refine((v) => !/[<>]/.test(v), `${label}: no se permiten los caracteres < ni >`);

const textoLibreOpcional = (max: number, label: string) =>
  textoLibre(max, label).nullable().optional();

const pct = (label: string) =>
  z
    .number({ message: `${label}: ingresá un número` })
    .min(0, `${label}: no puede ser negativo`)
    .max(100, `${label}: máximo 100`);

export const configuracionSchema = z
  .object({
    comisionVendedorPct: pct("Comisión vendedor"),
    comisionCompradorPct: pct("Comisión comprador"),
    comisionAdministracionPct: pct("Comisión administración"),
    comisionAgentePct: pct("Comisión agente"),
    comisionInmobPct: pct("Comisión inmobiliaria"),
    comisionAlquilerMeses: z
      .number({ message: "Comisión alquiler: ingresá un número" })
      .min(0, "Comisión alquiler: no puede ser negativa")
      .max(24, "Comisión alquiler: máximo 24 meses"),

    ivaIncluido: z.boolean(),
    logoEnContrato: z.boolean(),
    monedaPreferida: z.enum(["ARS", "USD"]),

    colorPrimario: z.string().regex(HEX, "Color primario: usá un hex como #C1694F"),
    colorSecundario: z.string().regex(HEX, "Color secundario: usá un hex como #221E19"),

    clausulasAdicionales: textoLibreOpcional(20000, "Cláusulas adicionales"),
    piePaginaContrato: textoLibreOpcional(300, "Pie de página"),

    cuit: textoLibreOpcional(20, "CUIT"),
    razonSocial: textoLibreOpcional(150, "Razón social"),
    domicilioLegal: textoLibreOpcional(200, "Domicilio legal"),
    matriculaCorredora: textoLibreOpcional(50, "Matrícula"),

    ciudad: textoLibre(100, "Ciudad"),
    provincia: textoLibre(100, "Provincia"),
  })
  // El cliente manda patches parciales (un campo por vez), no la config completa.
  .partial();

export type ConfiguracionInput = z.infer<typeof configuracionSchema>;

/** URL de la firma digital: solo http(s), que es lo único que se puede renderizar. */
export const firmaSchema = z.object({
  firmaUrl: z
    .string()
    .trim()
    .max(500, "URL demasiado larga")
    .regex(/^https?:\/\/[^\s<>"']+$/i, "URL de firma inválida"),
});

export type FirmaInput = z.infer<typeof firmaSchema>;
