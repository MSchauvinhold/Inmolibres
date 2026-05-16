import { z } from "zod";

export const propiedadSchema = z.object({
  titulo: z
    .string()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(120, "Máximo 120 caracteres"),
  tipo: z.enum(["CASA", "DEPARTAMENTO", "LOCAL", "GALPON", "TERRENO", "OFICINA"]),
  operacion: z.enum(["VENTA", "ALQUILER", "ALQUILER_TEMPORARIO"]),
  precio: z
    .number()
    .positive("El precio debe ser mayor a 0"),
  moneda: z.enum(["ARS", "USD"]).default("USD"),
  direccion: z
    .string()
    .min(5, "Ingresá la dirección completa")
    .max(200, "Máximo 200 caracteres"),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  poligonoJson: z.any().optional().nullable(),
  descripcion: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  videoUrl: z
    .string()
    .url("Ingresá una URL válida")
    .optional()
    .or(z.literal("")),
  publicada: z.boolean().default(true),
  atributos: z
    .object({
      superficieCubierta: z.number().positive().optional().nullable(),
      superficieTotal: z.number().positive().optional().nullable(),
      habitaciones: z.number().int().min(0).optional().nullable(),
      banos: z.number().int().min(0).optional().nullable(),
      garage: z.boolean().optional().nullable(),
      pileta: z.boolean().optional().nullable(),
      quincho: z.boolean().optional().nullable(),
      balcon: z.boolean().optional().nullable(),
      amueblado: z.boolean().optional().nullable(),
      cantidadPisos: z.number().int().positive().optional().nullable(),
      numeroPiso: z.number().int().min(0).optional().nullable(),
      mostrarPrecioPorM2: z.boolean().default(false),
      precioPorDia: z.number().positive().optional().nullable(),
      precioSemana: z.number().positive().optional().nullable(),
      precioQuincena: z.number().positive().optional().nullable(),
      diasMinimos: z.number().int().positive().optional().nullable(),
      diasMaximos: z.number().int().positive().optional().nullable(),
      anchoMetros: z.number().positive().optional().nullable(),
      largoMetros: z.number().positive().optional().nullable(),
      alturaInterna: z.number().positive().optional().nullable(),
      serviciosAgua: z.boolean().optional().nullable(),
      serviciosLuz: z.boolean().optional().nullable(),
      serviciosGas: z.boolean().optional().nullable(),
      serviciosCloaca: z.boolean().optional().nullable(),
      caracteristicasCustom: z.array(z.string()).optional().default([]),
    })
    .optional(),
  fotos: z
    .array(
      z.object({
        urlCloudinary: z.string().url("URL de foto inválida"),
        orden: z.number().int().min(0),
        esPortada: z.boolean().default(false),
      })
    )
    .max(15, "Máximo 15 fotos")
    .optional()
    .default([]),
});

export type PropiedadInput = z.infer<typeof propiedadSchema>;

// Refinements for conditional fields
export const propiedadFormSchema = propiedadSchema.superRefine((data, ctx) => {
  // Temporarios require daily price
  if (data.operacion === "ALQUILER_TEMPORARIO") {
    if (!data.atributos?.precioPorDia) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Para alquiler temporario, ingresá el precio por día",
        path: ["atributos", "precioPorDia"],
      });
    }
  }
});
