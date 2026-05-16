import type { TipoPropiedad } from "@prisma/client";

export interface CamposTipo {
  medidas: string[];
  numericos: string[];
  servicios: boolean;
}

export const CAMPOS_POR_TIPO: Record<TipoPropiedad, CamposTipo> = {
  CASA: {
    medidas: ["superficieCubierta", "superficieTotal", "anchoMetros", "largoMetros"],
    numericos: ["habitaciones", "banos", "cantidadPisos"],
    servicios: true,
  },
  DEPARTAMENTO: {
    medidas: ["superficieCubierta"],
    numericos: ["habitaciones", "banos", "numeroPiso"],
    servicios: false,
  },
  TERRENO: {
    medidas: ["superficieTotal", "anchoMetros", "largoMetros"],
    numericos: [],
    servicios: true,
  },
  LOCAL: {
    medidas: ["superficieCubierta", "anchoMetros", "largoMetros"],
    numericos: ["cantidadPisos"],
    servicios: false,
  },
  GALPON: {
    medidas: ["superficieTotal", "anchoMetros", "largoMetros", "alturaInterna"],
    numericos: [],
    servicios: true,
  },
  OFICINA: {
    medidas: ["superficieCubierta", "anchoMetros", "largoMetros"],
    numericos: ["cantidadPisos", "numeroPiso"],
    servicios: false,
  },
};

export const CARACTERISTICAS_POR_TIPO: Record<TipoPropiedad, string[]> = {
  CASA: [
    "Cocina", "Living", "Comedor", "Living-Comedor",
    "Toilette", "Lavadero", "Despensa",
    "Patio", "Jardín", "Terraza", "Balcón",
    "Garaje", "Cochera", "Depósito", "Sótano",
    "Pileta", "Quincho", "Parrilla",
    "Aire acondicionado", "Calefacción central",
    "Gas natural", "Agua corriente", "Cloaca",
    "Portón eléctrico", "Alarma", "Rejas",
  ],
  DEPARTAMENTO: [
    "Cocina", "Living", "Comedor", "Living-Comedor",
    "Toilette", "Lavadero", "Balcón", "Terraza",
    "Cochera", "Baulera", "Depósito",
    "Pileta", "Sum/Salón de usos múltiples",
    "Gimnasio", "Portero eléctrico", "Seguridad 24hs",
    "Aire acondicionado", "Calefacción central",
    "Ascensor", "Parrilla",
  ],
  TERRENO: [
    "Cercado perimetral", "Alambrado",
    "Con planos aprobados", "Escritura lista",
    "En barrio privado", "En loteo",
    "Esquina", "Acceso pavimentado",
    "Agua corriente", "Luz eléctrica",
    "Gas natural", "Cloaca",
    "Con construcción existente",
  ],
  LOCAL: [
    "Baño", "Toilette", "Cocina/Kitchenette",
    "Depósito", "Oficina/Vestuario",
    "Vidriera", "Persiana metálica",
    "Aire acondicionado", "Calefacción",
    "Alarma", "Cámara de seguridad",
    "Acceso vehicular", "Estacionamiento propio",
    "Sobre avenida principal",
  ],
  GALPON: [
    "Portón vehicular", "Portón de gran altura",
    "Puente grúa", "Plataforma de carga",
    "Oficina incluida", "Baño incluido",
    "Piso de cemento alisado", "Piso industrial",
    "Trifásico", "Monofásico",
    "Agua corriente", "Cloaca",
    "Cerco perimetral", "Vigilancia",
    "Acceso camiones", "Zona industrial",
  ],
  OFICINA: [
    "Recepción", "Sala de reuniones",
    "Cocina/Kitchenette", "Baño privado", "Toilette",
    "Aire acondicionado", "Calefacción central",
    "Internet fibra óptica", "Cableado estructurado",
    "Seguridad 24hs", "Cámara de seguridad",
    "Cochera incluida", "Acceso para discapacitados",
    "Ascensor", "En edificio corporativo",
  ],
};
