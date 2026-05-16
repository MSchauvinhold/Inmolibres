import { z } from "zod";

export const clienteSchema = z.object({
  nombre: z
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
    .optional()
    .or(z.literal("")),
  origen: z
    .enum([
      "INSTAGRAM",
      "WHATSAPP",
      "CONSULTA_LOCAL",
      "REFERIDO",
      "PORTAL",
      "OTRO",
    ])
    .default("OTRO"),
  estadoPipeline: z
    .enum([
      "NUEVO",
      "CONTACTADO",
      "VISITA_AGENDADA",
      "SEGUNDA_VISITA",
      "CERRADO",
      "PERDIDO",
    ])
    .default("NUEVO"),
  agenteId: z.string().uuid("Agente inválido").optional().or(z.literal("")),
  notas: z.string().max(1000, "Máximo 1000 caracteres").optional(),
  propiedadIds: z.array(z.string().uuid()).optional().default([]),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export const actualizarPipelineSchema = z.object({
  estadoPipeline: z.enum([
    "NUEVO",
    "CONTACTADO",
    "VISITA_AGENDADA",
    "SEGUNDA_VISITA",
    "CERRADO",
    "PERDIDO",
  ]),
  notas: z.string().max(1000).optional(),
});

export type ActualizarPipelineInput = z.infer<typeof actualizarPipelineSchema>;
