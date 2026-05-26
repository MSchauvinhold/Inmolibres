import type {
  Inmobiliaria,
  Usuario,
  Propiedad,
  PropiedadAtributos,
  FotoPropiedad,
  Cliente,
  Visita,
  ContratoAlquiler,
  Consulta,
  Notificacion,
  PagoSuscripcion,
  Rol,
  EstadoInmobiliaria,
  TipoPropiedad,
  TipoOperacion,
  EstadoPropiedad,
  EstadoPipeline,
  OrigenLead,
  TipoVisita,
  EstadoVisita,
  EstadoPago,
  Moneda,
  TipoNotificacion,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type {
  Inmobiliaria,
  Usuario,
  Propiedad,
  PropiedadAtributos,
  FotoPropiedad,
  Cliente,
  Visita,
  ContratoAlquiler,
  Consulta,
  Notificacion,
  PagoSuscripcion,
  Rol,
  EstadoInmobiliaria,
  TipoPropiedad,
  TipoOperacion,
  EstadoPropiedad,
  EstadoPipeline,
  OrigenLead,
  TipoVisita,
  EstadoVisita,
  EstadoPago,
  Moneda,
  TipoNotificacion,
};

// ─── Extended / Composed Types ────────────────────────────────────────────────

export type PropiedadConRelaciones = Propiedad & {
  atributos: PropiedadAtributos | null;
  fotos: FotoPropiedad[];
  inmobiliaria: Pick<Inmobiliaria, "id" | "nombre" | "logoUrl" | "whatsapp">;
  agente: Pick<Usuario, "id" | "nombre" | "email">;
};

export type PropiedadCard = Pick<
  Propiedad,
  | "id"
  | "titulo"
  | "slug"
  | "tipo"
  | "operacion"
  | "precio"
  | "moneda"
  | "direccion"
  | "latitud"
  | "longitud"
  | "estado"
  | "publicada"
  | "inmobiliariaId"
> & {
  fotos: Pick<FotoPropiedad, "urlCloudinary" | "esPortada">[];
  atributos: Pick<
    PropiedadAtributos,
    | "superficieCubierta"
    | "superficieTotal"
    | "habitaciones"
    | "banos"
    | "garage"
    | "pileta"
    | "amueblado"
    | "mostrarPrecioPorM2"
  > | null;
  inmobiliaria: Pick<Inmobiliaria, "id" | "nombre" | "logoUrl" | "whatsapp">;
};

export type ClienteConRelaciones = Cliente & {
  agente: Pick<Usuario, "id" | "nombre"> | null;
  propiedades: Array<{
    propiedad: Pick<Propiedad, "id" | "titulo" | "slug" | "tipo" | "operacion">;
  }>;
  visitas: Pick<Visita, "id" | "fechaHora" | "estado">[];
};

export type VisitaConRelaciones = Visita & {
  propiedad: Pick<Propiedad, "id" | "titulo" | "slug" | "direccion">;
  cliente: Pick<Cliente, "id" | "nombre" | "telefono">;
  agente: Pick<Usuario, "id" | "nombre">;
};

export type ContratoConPropiedad = ContratoAlquiler & {
  propiedad: Pick<Propiedad, "id" | "titulo" | "slug" | "direccion">;
};

export type ConsultaConPropiedad = Consulta & {
  propiedad: Pick<
    Propiedad,
    "id" | "titulo" | "slug" | "tipo" | "operacion" | "inmobiliariaId"
  >;
};

export type NotificacionConUsuario = Notificacion & {
  usuario: Pick<Usuario, "id" | "nombre" | "email">;
};

export type InmobiliariaConStats = Inmobiliaria & {
  _count: {
    propiedades: number;
    usuarios: number;
    clientes: number;
  };
};

// ─── Auth / Session Types ─────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  inmobiliariaId: string | null;
  inmobiliariaEstado: EstadoInmobiliaria | null;
  inmobiliariaNombre: string | null;
  plan: string | null;
};

// ─── API Response Types ───────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type PropiedadFiltros = {
  tipo?: TipoPropiedad;
  operacion?: TipoOperacion;
  estado?: EstadoPropiedad;
  inmobiliariaId?: string;
  precioMin?: number;
  precioMax?: number;
  moneda?: Moneda;
  habitaciones?: number;
  garage?: boolean;
  pileta?: boolean;
  amueblado?: boolean;
  publicada?: boolean;
  page?: number;
  pageSize?: number;
};

export type ClienteFiltros = {
  estadoPipeline?: EstadoPipeline;
  agenteId?: string;
  origen?: OrigenLead;
  page?: number;
  pageSize?: number;
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export type DashboardStats = {
  propiedadesActivas: number;
  leadsNuevosSemana: number;
  visitasHoy: number;
  consultasSinLeer: number;
};

export type SuperAdminStats = {
  inmobiliariasActivas: number;
  inmobiliariasPrueba: number;
  inmobiliariasSuspendidas: number;
  totalPropiedades: number;
};

// ─── Marketplace Map Types ────────────────────────────────────────────────────

export type MapMarker = {
  id: string;
  latitud: number;
  longitud: number;
  tipo: TipoPropiedad;
  operacion: TipoOperacion;
  titulo: string;
  precio: number;
  moneda: Moneda;
  slug: string;
  inmobiliariaId: string;
  inmobiliariaNombre: string;
  whatsapp: string;
  fotoPortada: string | null;
  poligonoJson: unknown | null;
};

// ─── Form Types ───────────────────────────────────────────────────────────────

export type PropiedadFormData = {
  titulo: string;
  tipo: TipoPropiedad;
  operacion: TipoOperacion;
  precio: number;
  moneda: Moneda;
  direccion: string;
  latitud?: number;
  longitud?: number;
  descripcion?: string;
  videoUrl?: string;
  publicada: boolean;
  atributos: {
    superficieCubierta?: number;
    superficieTotal?: number;
    habitaciones?: number;
    banos?: number;
    garage?: boolean;
    pileta?: boolean;
    quincho?: boolean;
    balcon?: boolean;
    amueblado?: boolean;
    cantidadPisos?: number;
    numeroPiso?: number;
    mostrarPrecioPorM2?: boolean;
    precioPorDia?: number;
    precioSemana?: number;
    precioQuincena?: number;
    diasMinimos?: number;
    diasMaximos?: number;
  };
  fotos: {
    urlCloudinary: string;
    orden: number;
    esPortada: boolean;
  }[];
};

export type ClienteFormData = {
  nombre: string;
  telefono: string;
  email?: string;
  origen: OrigenLead;
  estadoPipeline?: EstadoPipeline;
  agenteId?: string;
  notas?: string;
  propiedadIds?: string[];
};

export type VisitaFormData = {
  propiedadId: string;
  clienteId: string;
  agenteId: string;
  fechaHora: string;
  tipo: TipoVisita;
};

export type ContratoFormData = {
  propiedadId: string;
  inquilinoNombre: string;
  inquilinoTel: string;
  precioMensual: number;
  moneda: Moneda;
  diaVencimientoPago: number;
  fechaInicio: string;
  fechaFin: string;
};

export type ConsultaFormData = {
  propiedadId: string;
  nombreVisitante: string;
  telefono: string;
  mensaje: string;
};
