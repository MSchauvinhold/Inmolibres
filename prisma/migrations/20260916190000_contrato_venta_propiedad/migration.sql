-- Vincula el boleto de compraventa con la propiedad del sistema elegida en el wizard (opcional).
-- Aditiva: columna nullable, filas existentes quedan en NULL. Backup previo: branch Neon backup-antes-migracion-boletos.

-- AlterTable
ALTER TABLE "contratos_venta" ADD COLUMN     "propiedad_id" TEXT;

-- CreateIndex
CREATE INDEX "idx_contratos_venta_propiedad" ON "contratos_venta"("propiedad_id");

-- AddForeignKey
ALTER TABLE "contratos_venta" ADD CONSTRAINT "contratos_venta_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
