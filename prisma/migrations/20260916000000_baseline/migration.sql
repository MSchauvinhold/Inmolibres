-- Baseline 2026-09-16: reemplaza a 20260507000000_init, que había quedado desfasada
-- respecto de la base real (cambios aplicados con db push). Refleja el estado de Neon
-- después de agregar propiedad_id a tasaciones y egresos_inmobiliaria.
-- En Neon se marcó como aplicada con `prisma migrate resolve` (no se ejecutó).

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "rol" AS ENUM ('SUPERADMIN', 'ADMIN', 'AGENTE', 'PARTICULAR');

-- CreateEnum
CREATE TYPE "estado_inmobiliaria" AS ENUM ('ACTIVA', 'INACTIVA', 'PRUEBA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "tipo_propiedad" AS ENUM ('CASA', 'DEPARTAMENTO', 'LOCAL', 'GALPON', 'TERRENO', 'OFICINA');

-- CreateEnum
CREATE TYPE "tipo_operacion" AS ENUM ('VENTA', 'ALQUILER', 'ALQUILER_TEMPORARIO');

-- CreateEnum
CREATE TYPE "estado_propiedad" AS ENUM ('DISPONIBLE', 'RESERVADA', 'ALQUILADA', 'VENDIDA');

-- CreateEnum
CREATE TYPE "estado_pipeline" AS ENUM ('NUEVO', 'CONTACTADO', 'VISITA_AGENDADA', 'SEGUNDA_VISITA', 'CERRADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "origen_lead" AS ENUM ('INSTAGRAM', 'WHATSAPP', 'CONSULTA_LOCAL', 'REFERIDO', 'PORTAL', 'OTRO');

-- CreateEnum
CREATE TYPE "tipo_visita" AS ENUM ('VISITA_COMPRADOR', 'VISITA_VENDEDOR');

-- CreateEnum
CREATE TYPE "estado_visita" AS ENUM ('PENDIENTE', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "estado_pago" AS ENUM ('AL_DIA', 'ATRASADO');

-- CreateEnum
CREATE TYPE "moneda" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "tipo_notificacion" AS ENUM ('SUSCRIPCION_7_DIAS', 'SUSCRIPCION_5_DIAS', 'SUSCRIPCION_2_DIAS', 'SUSCRIPCION_24_HORAS', 'SUSCRIPCION_VENCIDA', 'SUSCRIPCION_SUSPENDIDA', 'SUSCRIPCION_RENOVADA', 'VISITA_PROXIMA', 'CONTRATO_POR_VENCER', 'PAGO_ATRASADO', 'LEAD_FRIO', 'CONSULTA_NUEVA', 'AJUSTE_ALQUILER_PENDIENTE');

-- CreateEnum
CREATE TYPE "tipo_documento" AS ENUM ('DNI_FRENTE', 'DNI_DORSO', 'RECIBO_SUELDO', 'RECIBO_SUELDO_GARANTE', 'DNI_GARANTE_FRENTE', 'DNI_GARANTE_DORSO', 'ESCRITURA_PROPIEDAD', 'PLANO_APROBADO', 'CONSTANCIA_CUIL', 'CONSTANCIA_CUIL_GARANTE', 'CONTRATO_FIRMADO', 'BOLETO_COMPRAVENTA', 'RECIBO_PAGO', 'FOTO_ESTADO_INMUEBLE', 'OTRO');

-- CreateEnum
CREATE TYPE "rol_contacto" AS ENUM ('PROPIETARIO', 'INQUILINO', 'COMPRADOR');

-- CreateEnum
CREATE TYPE "tipo_operacion_financiera" AS ENUM ('VENTA', 'ALQUILER', 'ALQUILER_TEMPORARIO');

-- CreateEnum
CREATE TYPE "estado_tasacion" AS ENUM ('PENDIENTE', 'REALIZADA', 'CONVERTIDA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "NivelLog" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "inmobiliarias" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "logo_url" TEXT,
    "firma_url" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'AVANZADO',
    "estado" "estado_inmobiliaria" NOT NULL DEFAULT 'PRUEBA',
    "fecha_vencimiento" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inmobiliarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "inmobiliaria_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "comision_personal_pct" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedades" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "inmobiliaria_id" TEXT,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" "tipo_propiedad" NOT NULL,
    "operacion" "tipo_operacion" NOT NULL,
    "precio" DECIMAL(15,2) NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'USD',
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "poligono_json" JSONB,
    "estado" "estado_propiedad" NOT NULL DEFAULT 'DISPONIBLE',
    "descripcion" TEXT,
    "video_url" TEXT,
    "publicada" BOOLEAN NOT NULL DEFAULT true,
    "agente_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propiedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedades_atributos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "propiedad_id" TEXT NOT NULL,
    "superficie_cubierta" DOUBLE PRECISION,
    "superficie_total" DOUBLE PRECISION,
    "habitaciones" INTEGER,
    "banos" INTEGER,
    "garage" BOOLEAN,
    "pileta" BOOLEAN,
    "quincho" BOOLEAN,
    "balcon" BOOLEAN,
    "amueblado" BOOLEAN,
    "cantidad_pisos" INTEGER,
    "numero_piso" INTEGER,
    "mostrar_precio_por_m2" BOOLEAN NOT NULL DEFAULT false,
    "precio_por_dia" DECIMAL(15,2),
    "precio_semana" DECIMAL(15,2),
    "precio_quincena" DECIMAL(15,2),
    "dias_minimos" INTEGER,
    "dias_maximos" INTEGER,
    "ancho_metros" DOUBLE PRECISION,
    "largo_metros" DOUBLE PRECISION,
    "altura_interna" DOUBLE PRECISION,
    "servicios_agua" BOOLEAN,
    "servicios_luz" BOOLEAN,
    "servicios_gas" BOOLEAN,
    "servicios_cloaca" BOOLEAN,
    "caracteristicas_custom" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "propiedades_atributos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_propiedades" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "propiedad_id" TEXT NOT NULL,
    "url_cloudinary" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "es_portada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fotos_propiedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "inmobiliaria_id" TEXT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "origen" "origen_lead" NOT NULL DEFAULT 'OTRO',
    "estado_pipeline" "estado_pipeline" NOT NULL DEFAULT 'NUEVO',
    "agente_id" TEXT,
    "notas" TEXT,
    "ultima_actividad" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedades_clientes" (
    "propiedad_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "propiedades_clientes_pkey" PRIMARY KEY ("propiedad_id","cliente_id")
);

-- CreateTable
CREATE TABLE "visitas" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "propiedad_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "agente_id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT,
    "fecha_hora" TIMESTAMPTZ(6) NOT NULL,
    "tipo" "tipo_visita" NOT NULL,
    "estado" "estado_visita" NOT NULL DEFAULT 'PENDIENTE',
    "notas_post" TEXT,
    "alerta_enviada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_alquiler" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "propiedad_id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "inquilino_nombre" TEXT NOT NULL,
    "inquilino_tel" TEXT NOT NULL,
    "precio_mensual" DECIMAL(15,2) NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'ARS',
    "dia_vencimiento_pago" INTEGER NOT NULL,
    "estado_pago" "estado_pago" NOT NULL DEFAULT 'AL_DIA',
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_firma" TEXT,
    "contrato_firmado_url" TEXT,
    "fecha_firmado" TIMESTAMP(3),
    "administracion_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ajuste_activo" BOOLEAN NOT NULL DEFAULT true,
    "ajuste_indice" TEXT NOT NULL DEFAULT 'ICL',
    "ajuste_meses" INTEGER NOT NULL DEFAULT 6,
    "ajuste_dia" INTEGER NOT NULL DEFAULT 14,
    "fecha_ultimo_ajuste" TIMESTAMP(3),
    "indice_ultimo_ajuste" DOUBLE PRECISION,
    "precio_original" DECIMAL(15,2),

    CONSTRAINT "contratos_alquiler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes_alquiler" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "fecha_ajuste" TIMESTAMP(3) NOT NULL,
    "precio_anterior" DECIMAL(15,2) NOT NULL,
    "precio_nuevo" DECIMAL(15,2) NOT NULL,
    "moneda" "moneda" NOT NULL,
    "indice_inicio" DOUBLE PRECISION NOT NULL,
    "indice_fin" DOUBLE PRECISION NOT NULL,
    "porcentaje_aumento" DOUBLE PRECISION NOT NULL,
    "indice_usado" TEXT NOT NULL,
    "aplicado" BOOLEAN NOT NULL DEFAULT false,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajustes_alquiler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_venta" (
    "id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "propiedad_direccion" TEXT NOT NULL,
    "propiedad_descripcion" TEXT,
    "matricula_inmueble" TEXT,
    "vendedor_nombre" TEXT NOT NULL,
    "vendedor_dni" TEXT NOT NULL,
    "vendedor_tel" TEXT,
    "vendedor_domicilio" TEXT,
    "vendedor_estado_civil" TEXT NOT NULL DEFAULT 'soltero',
    "vendedor_conyuge" TEXT,
    "comprador_nombre" TEXT NOT NULL,
    "comprador_dni" TEXT NOT NULL,
    "comprador_tel" TEXT,
    "comprador_domicilio" TEXT,
    "comprador_estado_civil" TEXT NOT NULL DEFAULT 'soltero',
    "comprador_conyuge" TEXT,
    "precio_venta" DECIMAL(15,2) NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'USD',
    "sena" DECIMAL(15,2),
    "comision_vendedor_pct" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "comision_comprador_pct" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "forma_pago" TEXT NOT NULL DEFAULT 'Contado',
    "escribano_nombre" TEXT,
    "escribano_registro" TEXT,
    "fecha_escritura" DATE,
    "clausulas" TEXT,
    "notas" TEXT,
    "tipo_firma" TEXT,
    "contrato_firmado_url" TEXT,
    "fecha_firmado" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contratos_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_registro" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "concepto" VARCHAR(120) NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'ARS',
    "metodo_pago" VARCHAR(60),
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "propiedad_id" TEXT,
    "inmobiliaria_id" TEXT,
    "nombre_visitante" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "mensaje" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'MARKETPLACE',
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" TEXT NOT NULL,
    "tipo" "tipo_notificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "referencia_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_suscripcion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "inmobiliaria_id" TEXT NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'ARS',
    "fecha_pago" DATE NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_inmobiliaria" (
    "id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "comision_vendedor_pct" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "comision_comprador_pct" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "comision_alquiler_meses" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "comision_administracion_pct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comision_agente_pct" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "comision_inmob_pct" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "iva_incluido" BOOLEAN NOT NULL DEFAULT true,
    "moneda_preferida" "moneda" NOT NULL DEFAULT 'USD',
    "color_primario" TEXT NOT NULL DEFAULT '#1B4332',
    "color_secundario" TEXT NOT NULL DEFAULT '#2C2C2C',
    "logo_en_contrato" BOOLEAN NOT NULL DEFAULT false,
    "clausulas_adicionales" TEXT,
    "pie_pagina_contrato" TEXT,
    "cuit" TEXT,
    "razon_social" TEXT,
    "domicilio_legal" TEXT,
    "matricula_corredora" TEXT,
    "ciudad" TEXT NOT NULL DEFAULT 'Paso de los Libres',
    "provincia" TEXT NOT NULL DEFAULT 'Corrientes',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "configuracion_inmobiliaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos_agente" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "ver_propiedades" BOOLEAN NOT NULL DEFAULT true,
    "editar_propiedades" BOOLEAN NOT NULL DEFAULT true,
    "ver_clientes" BOOLEAN NOT NULL DEFAULT true,
    "editar_clientes" BOOLEAN NOT NULL DEFAULT true,
    "ver_visitas" BOOLEAN NOT NULL DEFAULT true,
    "editar_visitas" BOOLEAN NOT NULL DEFAULT true,
    "ver_alquileres" BOOLEAN NOT NULL DEFAULT true,
    "editar_alquileres" BOOLEAN NOT NULL DEFAULT false,
    "ver_consultas" BOOLEAN NOT NULL DEFAULT true,
    "ver_calculadoras" BOOLEAN NOT NULL DEFAULT true,
    "ver_finanzas" BOOLEAN NOT NULL DEFAULT false,
    "ver_documentos" BOOLEAN NOT NULL DEFAULT true,
    "ver_reportes" BOOLEAN NOT NULL DEFAULT false,
    "ver_tasaciones" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "permisos_agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_cliente" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "tipo" "tipo_documento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "url_cloudinary" TEXT NOT NULL,
    "es_imagen" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operaciones_cerradas" (
    "id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "propiedad_id" TEXT,
    "cliente_id" TEXT,
    "contrato_id" TEXT,
    "agente_id" TEXT NOT NULL,
    "tipo" "tipo_operacion_financiera" NOT NULL,
    "precio_operacion" DECIMAL(15,2) NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'USD',
    "comision_vendedor_pct" DOUBLE PRECISION NOT NULL,
    "comision_comprador_pct" DOUBLE PRECISION NOT NULL,
    "comision_total" DECIMAL(15,2) NOT NULL,
    "comision_inmob" DECIMAL(15,2) NOT NULL,
    "comision_agente" DECIMAL(15,2) NOT NULL,
    "iva_comision" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gastos" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "descripcion_gastos" TEXT,
    "fecha_cierre" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,

    CONSTRAINT "operaciones_cerradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "egresos_inmobiliaria" (
    "id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'ARS',
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoria" TEXT,
    "propiedad_id" TEXT,

    CONSTRAINT "egresos_inmobiliaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indices_manuales" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indices_manuales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos" (
    "id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "roles" "rol_contacto"[],
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "fecha_nacimiento" TIMESTAMP(3),
    "domicilio" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "estado_civil" TEXT,
    "ocupacion" TEXT,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garantes" (
    "id" TEXT NOT NULL,
    "contacto_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "fecha_nacimiento" TIMESTAMP(3),
    "domicilio" TEXT,
    "telefono" TEXT,
    "relacion_con_contacto" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_contacto" (
    "id" TEXT NOT NULL,
    "contacto_id" TEXT,
    "garante_id" TEXT,
    "tipo" "tipo_documento" NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "es_imagen" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_personas" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "contacto_id" TEXT NOT NULL,
    "rol" TEXT NOT NULL,

    CONSTRAINT "contratos_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasaciones" (
    "id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "agente_id" TEXT,
    "cliente_id" TEXT,
    "propiedad_id" TEXT,
    "cliente_nombre" TEXT NOT NULL,
    "cliente_telefono" TEXT,
    "direccion" TEXT NOT NULL,
    "tipo" "tipo_propiedad" NOT NULL,
    "superficie" DOUBLE PRECISION,
    "valor_estimado" DECIMAL(15,2),
    "moneda" "moneda" NOT NULL DEFAULT 'USD',
    "estado" "estado_tasacion" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_tasacion" DATE,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "nivel" "NivelLog" NOT NULL DEFAULT 'ERROR',
    "origen" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "detalle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "idx_usuarios_inmobiliaria" ON "usuarios"("inmobiliaria_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_prt_usuario" ON "password_reset_tokens"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "propiedades_slug_key" ON "propiedades"("slug");

-- CreateIndex
CREATE INDEX "idx_propiedades_inmobiliaria" ON "propiedades"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_propiedades_tipo_operacion" ON "propiedades"("tipo", "operacion");

-- CreateIndex
CREATE INDEX "idx_propiedades_publicada" ON "propiedades"("publicada", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "propiedades_atributos_propiedad_id_key" ON "propiedades_atributos"("propiedad_id");

-- CreateIndex
CREATE INDEX "idx_fotos_propiedad" ON "fotos_propiedades"("propiedad_id");

-- CreateIndex
CREATE INDEX "idx_clientes_inmobiliaria" ON "clientes"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_clientes_pipeline" ON "clientes"("estado_pipeline");

-- CreateIndex
CREATE INDEX "idx_clientes_ultima_actividad" ON "clientes"("ultima_actividad");

-- CreateIndex
CREATE INDEX "idx_visitas_inmobiliaria" ON "visitas"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_visitas_fecha" ON "visitas"("fecha_hora");

-- CreateIndex
CREATE INDEX "idx_visitas_alerta" ON "visitas"("alerta_enviada", "estado", "fecha_hora");

-- CreateIndex
CREATE INDEX "idx_contratos_inmobiliaria" ON "contratos_alquiler"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_contratos_fecha_fin" ON "contratos_alquiler"("fecha_fin");

-- CreateIndex
CREATE INDEX "idx_ajustes_contrato" ON "ajustes_alquiler"("contrato_id");

-- CreateIndex
CREATE INDEX "idx_ajustes_fecha" ON "ajustes_alquiler"("fecha_ajuste");

-- CreateIndex
CREATE INDEX "idx_ajustes_aplicado" ON "ajustes_alquiler"("aplicado");

-- CreateIndex
CREATE INDEX "idx_contratos_venta_inmobiliaria" ON "contratos_venta"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_pagos_registro_contrato" ON "pagos_registro"("contrato_id");

-- CreateIndex
CREATE INDEX "idx_pagos_registro_inmobiliaria" ON "pagos_registro"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_consultas_inmobiliaria" ON "consultas"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_consultas_leida" ON "consultas"("leida");

-- CreateIndex
CREATE INDEX "idx_consultas_origen" ON "consultas"("origen");

-- CreateIndex
CREATE INDEX "idx_notificaciones_usuario_leida" ON "notificaciones"("usuario_id", "leida");

-- CreateIndex
CREATE INDEX "idx_notificaciones_referencia" ON "notificaciones"("referencia_id");

-- CreateIndex
CREATE INDEX "idx_notificaciones_created" ON "notificaciones"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_pagos_inmobiliaria" ON "pagos_suscripcion"("inmobiliaria_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_inmobiliaria_inmobiliaria_id_key" ON "configuracion_inmobiliaria"("inmobiliaria_id");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_agente_usuario_id_key" ON "permisos_agente"("usuario_id");

-- CreateIndex
CREATE INDEX "documentos_cliente_cliente_id_idx" ON "documentos_cliente"("cliente_id");

-- CreateIndex
CREATE INDEX "documentos_cliente_inmobiliaria_id_idx" ON "documentos_cliente"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "operaciones_cerradas_inmobiliaria_id_idx" ON "operaciones_cerradas"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "operaciones_cerradas_fecha_cierre_idx" ON "operaciones_cerradas"("fecha_cierre");

-- CreateIndex
CREATE INDEX "operaciones_cerradas_agente_id_idx" ON "operaciones_cerradas"("agente_id");

-- CreateIndex
CREATE INDEX "operaciones_cerradas_contrato_id_idx" ON "operaciones_cerradas"("contrato_id");

-- CreateIndex
CREATE INDEX "egresos_inmobiliaria_inmobiliaria_id_idx" ON "egresos_inmobiliaria"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "egresos_inmobiliaria_propiedad_id_idx" ON "egresos_inmobiliaria"("propiedad_id");

-- CreateIndex
CREATE INDEX "indices_manuales_tipo_fecha_idx" ON "indices_manuales"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "idx_contactos_inmobiliaria" ON "contactos"("inmobiliaria_id");

-- CreateIndex
CREATE UNIQUE INDEX "garantes_contacto_id_key" ON "garantes"("contacto_id");

-- CreateIndex
CREATE INDEX "documentos_contacto_contacto_id_idx" ON "documentos_contacto"("contacto_id");

-- CreateIndex
CREATE INDEX "documentos_contacto_garante_id_idx" ON "documentos_contacto"("garante_id");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_personas_contrato_id_contacto_id_rol_key" ON "contratos_personas"("contrato_id", "contacto_id", "rol");

-- CreateIndex
CREATE INDEX "idx_tasaciones_inmobiliaria" ON "tasaciones"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_tasaciones_propiedad" ON "tasaciones"("propiedad_id");

-- CreateIndex
CREATE INDEX "idx_tasaciones_estado" ON "tasaciones"("estado");

-- CreateIndex
CREATE INDEX "system_logs_origen_created_at_idx" ON "system_logs"("origen", "created_at");

-- CreateIndex
CREATE INDEX "system_logs_nivel_created_at_idx" ON "system_logs"("nivel", "created_at");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propiedades_atributos" ADD CONSTRAINT "propiedades_atributos_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fotos_propiedades" ADD CONSTRAINT "fotos_propiedades_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propiedades_clientes" ADD CONSTRAINT "propiedades_clientes_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propiedades_clientes" ADD CONSTRAINT "propiedades_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contratos_alquiler" ADD CONSTRAINT "contratos_alquiler_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contratos_alquiler" ADD CONSTRAINT "contratos_alquiler_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ajustes_alquiler" ADD CONSTRAINT "ajustes_alquiler_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos_alquiler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_venta" ADD CONSTRAINT "contratos_venta_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_registro" ADD CONSTRAINT "pagos_registro_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos_alquiler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_registro" ADD CONSTRAINT "pagos_registro_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos_suscripcion" ADD CONSTRAINT "pagos_suscripcion_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "configuracion_inmobiliaria" ADD CONSTRAINT "configuracion_inmobiliaria_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_agente" ADD CONSTRAINT "permisos_agente_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_cliente" ADD CONSTRAINT "documentos_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_cliente" ADD CONSTRAINT "documentos_cliente_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operaciones_cerradas" ADD CONSTRAINT "operaciones_cerradas_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operaciones_cerradas" ADD CONSTRAINT "operaciones_cerradas_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos_inmobiliaria" ADD CONSTRAINT "egresos_inmobiliaria_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos_inmobiliaria" ADD CONSTRAINT "egresos_inmobiliaria_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantes" ADD CONSTRAINT "garantes_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_contacto" ADD CONSTRAINT "documentos_contacto_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_contacto" ADD CONSTRAINT "documentos_contacto_garante_id_fkey" FOREIGN KEY ("garante_id") REFERENCES "garantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_personas" ADD CONSTRAINT "contratos_personas_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos_alquiler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_personas" ADD CONSTRAINT "contratos_personas_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasaciones" ADD CONSTRAINT "tasaciones_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasaciones" ADD CONSTRAINT "tasaciones_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasaciones" ADD CONSTRAINT "tasaciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasaciones" ADD CONSTRAINT "tasaciones_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Objetos fuera del modelo de Prisma (aplicados con SQL directo, presentes en Neon) ───

-- CreateCheckConstraint
ALTER TABLE "contratos_alquiler" ADD CONSTRAINT "contratos_alquiler_dia_vencimiento_pago_check" CHECK (((dia_vencimiento_pago >= 1) AND (dia_vencimiento_pago <= 31)));

-- CreateCheckConstraint: todo documento pertenece a un contacto o a un garante
ALTER TABLE "documentos_contacto" ADD CONSTRAINT "chk_doc_contacto_owner" CHECK (((contacto_id IS NOT NULL) OR (garante_id IS NOT NULL)));

-- CreateFunction
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- CreateTrigger
CREATE TRIGGER trg_inmobiliarias_updated_at BEFORE UPDATE ON public.inmobiliarias FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_propiedades_updated_at BEFORE UPDATE ON public.propiedades FOR EACH ROW EXECUTE FUNCTION set_updated_at();
