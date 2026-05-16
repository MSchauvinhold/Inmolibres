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
CREATE TYPE "tipo_notificacion" AS ENUM ('SUSCRIPCION_7_DIAS', 'SUSCRIPCION_2_DIAS', 'SUSCRIPCION_24_HORAS', 'SUSCRIPCION_VENCIDA', 'VISITA_PROXIMA', 'CONTRATO_POR_VENCER', 'PAGO_ATRASADO', 'LEAD_FRIO', 'CONSULTA_NUEVA');

-- CreateTable
CREATE TABLE "inmobiliarias" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "logo_url" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'BASE',
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedades" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "inmobiliaria_id" TEXT NOT NULL,
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
    "agente_id" TEXT NOT NULL,
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
    "inmobiliaria_id" TEXT NOT NULL,
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
    "inmobiliaria_id" TEXT NOT NULL,
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_alquiler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "propiedad_id" TEXT NOT NULL,
    "inmobiliaria_id" TEXT NOT NULL,
    "nombre_visitante" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "idx_usuarios_inmobiliaria" ON "usuarios"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_propiedades_inmobiliaria" ON "propiedades"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_propiedades_tipo_operacion" ON "propiedades"("tipo", "operacion");

-- CreateIndex
CREATE INDEX "idx_propiedades_publicada" ON "propiedades"("publicada", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "propiedades_inmobiliaria_id_slug_key" ON "propiedades"("inmobiliaria_id", "slug");

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
CREATE INDEX "idx_consultas_inmobiliaria" ON "consultas"("inmobiliaria_id");

-- CreateIndex
CREATE INDEX "idx_consultas_leida" ON "consultas"("leida");

-- CreateIndex
CREATE INDEX "idx_notificaciones_usuario_leida" ON "notificaciones"("usuario_id", "leida");

-- CreateIndex
CREATE INDEX "idx_notificaciones_created" ON "notificaciones"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_pagos_inmobiliaria" ON "pagos_suscripcion"("inmobiliaria_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

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
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contratos_alquiler" ADD CONSTRAINT "contratos_alquiler_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contratos_alquiler" ADD CONSTRAINT "contratos_alquiler_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagos_suscripcion" ADD CONSTRAINT "pagos_suscripcion_inmobiliaria_id_fkey" FOREIGN KEY ("inmobiliaria_id") REFERENCES "inmobiliarias"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
