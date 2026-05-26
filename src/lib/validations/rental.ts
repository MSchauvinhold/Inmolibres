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

// Actualización general de contrato de alquiler (estadoPago y/o notas)
export const actualizarContratoAlquilerSchema = z.object({
  estadoPago: z.enum(["AL_DIA", "ATRASADO"]).optional(),
  notas: z.string().max(3000, "Máximo 3000 caracteres").optional().nullable(),
});

export type ActualizarContratoAlquilerInput = z.infer<typeof actualizarContratoAlquilerSchema>;

// Actualización de contrato de venta
export const actualizarContratoVentaSchema = z.object({
  notas:        z.string().max(3000).optional().nullable(),
  vendedorTel:  z.string().max(20).optional().nullable(),
  compradorTel: z.string().max(20).optional().nullable(),
});

export type ActualizarContratoVentaInput = z.infer<typeof actualizarContratoVentaSchema>;

// Registro de pago
export const pagoRegistroSchema = z.object({
  concepto:   z.string().min(1, "Ingresá el concepto").max(120),
  monto:      z.number().positive("El monto debe ser mayor a 0"),
  moneda:     z.enum(["ARS", "USD"]).default("ARS"),
  metodoPago: z.string().max(60).optional().nullable(),
  fecha:      z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido")
    .optional(),
});

export type PagoRegistroInput = z.infer<typeof pagoRegistroSchema>;

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
