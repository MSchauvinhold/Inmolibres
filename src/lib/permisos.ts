import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Rol } from "@prisma/client";

export type PermisoFlag =
  | "verPropiedades" | "editarPropiedades"
  | "verClientes" | "editarClientes"
  | "verVisitas" | "editarVisitas"
  | "verAlquileres" | "editarAlquileres"
  | "verConsultas" | "verCalculadoras"
  | "verFinanzas" | "verDocumentos" | "verReportes";

/**
 * Corta el acceso a un módulo del CRM cuando el usuario es AGENTE y el Admin
 * no le activó el permiso correspondiente. ADMIN nunca se restringe acá — el
 * mismo criterio que ya usa el Sidebar para decidir qué mostrar.
 *
 * Sin fila en PermisosAgente (agente recién creado, antes de que el Admin abra
 * el panel de permisos) el acceso queda abierto — mismo comportamiento
 * "fail-open" que el Sidebar (`if (!permisos) return true`), para no bloquear
 * a un agente nuevo por una fila que todavía no existe.
 *
 * Esto es la mitad "permiso" del gating: la mitad "plan" la sigue resolviendo
 * cada página por separado (ver /finanzas, /alquileres, /contactos).
 */
export async function requirePermisoAgente(
  userId: string,
  rol: Rol,
  flag: PermisoFlag,
  moduloLabel: string
): Promise<void> {
  if (rol !== "AGENTE") return;

  const permisos = await db.permisosAgente.findUnique({ where: { usuarioId: userId } });
  if (permisos && permisos[flag] === false) {
    redirect(`/sin-permiso?modulo=${encodeURIComponent(moduloLabel)}`);
  }
}
