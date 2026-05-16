const STORAGE_KEY = "inmolibres_kai_memoria";

export type KaiMemoria = {
  nombreUsuario?: string;
  ultimaBusqueda?: {
    operacion?: string;
    tipo?: string;
    dormitorios?: string;
  };
  visitasCount: number;
  ultimaVisita?: string;
};

export function cargarMemoria(): KaiMemoria {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as KaiMemoria) : { visitasCount: 0 };
  } catch {
    return { visitasCount: 0 };
  }
}

export function guardarMemoria(memoria: KaiMemoria): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoria));
  } catch {
    // ignore quota errors
  }
}

export function registrarVisita(): KaiMemoria {
  const memoria = cargarMemoria();
  const actualizada: KaiMemoria = {
    ...memoria,
    visitasCount: memoria.visitasCount + 1,
    ultimaVisita: new Date().toISOString(),
  };
  guardarMemoria(actualizada);
  return actualizada;
}

export function getSaludo(memoria: KaiMemoria): string {
  if (memoria.visitasCount <= 1) {
    return "¡Hola! Soy Kai 🐾 ¿Te puedo ayudar a encontrar tu próxima propiedad?";
  }
  if (memoria.visitasCount <= 5) {
    const tipo = memoria.ultimaBusqueda?.tipo;
    return `¡Hola de nuevo! 🐾 ¿Seguís buscando${tipo ? ` ${tipo.toLowerCase()}` : ""}?`;
  }
  return "¡Bienvenido de vuelta! 🐾 ¿En qué te puedo ayudar hoy?";
}
