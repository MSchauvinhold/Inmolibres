import { z } from "zod";

export const visitaSchema = z.object({
  propiedadId: z.string().uuid("Propiedad inválida"),
  clienteId: z.string().uuid("Cliente inválido"),
  agenteId: z.string().uuid("Agente inválido"),
  fechaHora: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: "Fecha y hora inválidas",
    })
    .refine((val) => new Date(val) > new Date(), {
      message: "La visita debe ser en el futuro",
    }),
  tipo: z.enum(["VISITA_COMPRADOR", "VISITA_VENDEDOR"]),
});

export type VisitaInput = z.infer<typeof visitaSchema>;

export const actualizarVisitaSchema = z.object({
  estado: z.enum(["PENDIENTE", "REALIZADA", "CANCELADA"]),
  notasPost: z.string().max(1000, "Máximo 1000 caracteres").optional(),
});

export type ActualizarVisitaInput = z.infer<typeof actualizarVisitaSchema>;
