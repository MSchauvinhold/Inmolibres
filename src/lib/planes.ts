export const LIMITES_PLAN = {
  BASICO: {
    nombre: 'Básico',
    maxPropiedades: 4,
    maxFotos: 10,
    maxAgentes: 0,
    modulos: ['marketplace', 'consultas', 'notificaciones'] as const,
  },
  AVANZADO: {
    nombre: 'Avanzado',
    maxPropiedades: null as null,
    maxFotos: 15,
    maxAgentes: 2,
    modulos: [
      'marketplace',
      'propiedades',
      'clientes',
      'visitas',
      'consultas',
      'calculadoras',
      'notificaciones',
      'configuracion',
    ] as const,
  },
  PRO: {
    nombre: 'Pro',
    maxPropiedades: null as null,
    maxFotos: 15,
    maxAgentes: 3,
    modulos: [
      'marketplace',
      'propiedades',
      'clientes',
      'visitas',
      'consultas',
      'calculadoras',
      'finanzas',
      'contratos',
      'documentos',
      'contactos',
      'notificaciones',
      'configuracion',
    ] as const,
  },
} as const

export type PlanKey = keyof typeof LIMITES_PLAN

/** Devuelve el nombre comercial del plan */
export function nombrePlan(plan: string): string {
  if (plan === 'BASICO' || plan === 'AVANZADO' || plan === 'PRO') {
    return LIMITES_PLAN[plan as PlanKey].nombre
  }
  return plan
}

export function tieneAcceso(plan: PlanKey, modulo: string): boolean {
  return (LIMITES_PLAN[plan].modulos as readonly string[]).includes(modulo)
}

export function puedeAgregarPropiedad(plan: PlanKey, actual: number): boolean {
  const max = LIMITES_PLAN[plan].maxPropiedades
  if (max === null) return true
  return actual < max
}

export function puedeAgregarAgente(plan: PlanKey, actual: number): boolean {
  return actual < LIMITES_PLAN[plan].maxAgentes
}

/** Verifica si es una PlanKey válida, con fallback a AVANZADO */
export function toPlanKey(plan: string | null | undefined): PlanKey {
  if (plan === 'BASICO' || plan === 'AVANZADO' || plan === 'PRO') return plan
  return 'AVANZADO'
}

/** Rutas CRM que requieren plan PRO */
export const RUTAS_PRO = ['/finanzas', '/alquileres', '/contactos']
