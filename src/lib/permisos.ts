import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Rol } from "@prisma/client";

export type PermisoFlag =
  | "verPropiedades" | "editarPropiedades"
  | "verClientes" | "editarClientes"
  | "verVisitas" | "editarVisitas"
  | "verAlquileres" | "editarAlquileres"
  | "verConsultas" | "verCalculadoras"
  | "verFinanzas" | "verDocumentos" | "verReportes" | "verTasaciones";

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
  if (await tienePermisoAgente(userId, rol, flag)) return;
  redirect(`/sin-permiso?modulo=${encodeURIComponent(moduloLabel)}`);
}

/**
 * Misma regla que `requirePermisoAgente`, pero devolviendo un valor en vez de
 * redirigir: las rutas de API no pueden usar `redirect()`, y sin este chequeo
 * gatear solo la página deja la API abierta (un AGENTE sin el permiso igual
 * puede pegarle directo al endpoint).
 */
export async function tienePermisoAgente(
  userId: string,
  rol: Rol | string,
  flag: PermisoFlag
): Promise<boolean> {
  if (rol !== "AGENTE") return true;

  const permisos = await db.permisosAgente.findUnique({ where: { usuarioId: userId } });
  if (!permisos) return true; // fail-open: agente nuevo, sin fila todavía
  return permisos[flag] !== false;
}
