-- Roles GARANTE/PROVEEDOR en contactos, deposito en garantia del contrato,
-- vinculo garante<->contacto y la columna de visita de tasacion que quedo pendiente.
-- Todo aditivo: ninguna columna se borra ni se reescribe.

-- AlterEnum (PostgreSQL 12+ admite varios ADD VALUE en la misma transaccion
-- mientras no se usen los valores nuevos dentro de ella; Neon corre PG 16)
ALTER TYPE "rol_contacto" ADD VALUE 'GARANTE';
ALTER TYPE "rol_contacto" ADD VALUE 'PROVEEDOR';

-- AlterTable
ALTER TABLE "contratos_alquiler" ADD COLUMN     "deposito" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "garantes" ADD COLUMN     "contacto_garante_id" TEXT;

-- AlterTable
ALTER TABLE "tasaciones" ADD COLUMN     "visita_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "garantes_contacto_garante_id_idx" ON "garantes"("contacto_garante_id");

-- AddForeignKey
ALTER TABLE "garantes" ADD CONSTRAINT "garantes_contacto_garante_id_fkey" FOREIGN KEY ("contacto_garante_id") REFERENCES "contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
