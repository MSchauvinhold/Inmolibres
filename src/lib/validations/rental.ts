import { z } from "zod";

export const contratoSchema = z.object({
  propiedadId: z.string().uuid("Propiedad inválida"),
  inquilinoNombre: z
    .string()
    .min(2, "Nombre demasiado corto")
    .max(100, "Máximo 100 caracteres"),
  inquilinoTel: z
    .string()
    .min(8, "Teléfono inválido")
    .max(20, "Máximo 20 caracteres"),
  precioMensual: z
    .number()
    .positive("Debe ser mayor a 0"),
  moneda: z.enum(["ARS", "USD"]).default("ARS"),
  diaVencimientoPago: z
    .number()
    .int()
    .min(1, "Mínimo día 1")
    .max(28, "Máximo día 28"),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida"),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de fin inválida"),
}).refine(
  (data) => new Date(data.fechaFin) > new Date(data.fechaInicio),
  {
    message: "La fecha de fin debe ser posterior a la de inicio",
    path: ["fechaFin"],
  }
);

export type ContratoInput = z.infer<typeof contratoSchema>;

export const actualizarPagoSchema = z.object({
  estadoPago: z.enum(["AL_DIA", "ATRASADO"]),
});

export type ActualizarPagoInput = z.infer<typeof actualizarPagoSchema>;

export const consultaPublicaSchema = z.object({
  propiedadId: z.string().uuid("Propiedad inválida"),
  nombreVisitante: z
    .string()
    .min(2, "Nombre demasiado corto")
    .max(100, "Máximo 100 caracteres"),
  telefono: z
    .string()
    .min(8, "Teléfono inválido")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[\d\s\+\-\(\)]+$/, "Solo números, espacios y +()-"),
  email: z
    .string()
    .email("Email inválido")
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  mensaje: z
    .string()
    .min(10, "El mensaje es demasiado corto")
    .max(500, "Máximo 500 caracteres"),
});

export type ConsultaPublicaInput = z.infer<typeof consultaPublicaSchema>;
