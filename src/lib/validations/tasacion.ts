import { z } from "zod";

export const tasacionSchema = z.object({
  clienteNombre: z
    .string()
    .min(2, "Nombre demasiado corto")
    .max(100, "Máximo 100 caracteres"),
  clienteTelefono: z
    .string()
    .max(20, "Máximo 20 caracteres")
    .regex(/^[\d\s\+\-\(\)]*$/, "Solo números, espacios y +()-")
    .optional()
    .or(z.literal("")),
  direccion: z.string().min(3, "Dirección demasiado corta").max(200, "Máximo 200 caracteres"),
  tipo: z.enum(["CASA", "DEPARTAMENTO", "LOCAL", "GALPON", "TERRENO", "OFICINA"]),
  superficie: z.coerce.number().positive("Debe ser mayor a 0").optional(),
  valorEstimado: z.coerce.number().positive("Debe ser mayor a 0").optional(),
  moneda: z.enum(["ARS", "USD"]).default("USD"),
  estado: z
    .enum(["PENDIENTE", "REALIZADA", "CONVERTIDA", "DESCARTADA"])
    .default("PENDIENTE"),
  fechaTasacion: z.string().optional().or(z.literal("")),
  clienteId: z.string().optional().or(z.literal("")),
  agenteId: z.string().optional().or(z.literal("")),
  notas: z.string().max(1000, "Máximo 1000 caracteres").optional(),
});

export type TasacionInput = z.infer<typeof tasacionSchema>;

export const actualizarTasacionSchema = tasacionSchema.partial();
export type ActualizarTasacionInput = z.infer<typeof actualizarTasacionSchema>;
