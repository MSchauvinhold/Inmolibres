/**
 * clean-db.ts
 * Borra TODOS los datos de la base excepto el usuario SUPERADMIN.
 * Ejecutar con: npx tsx scripts/clean-db.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Limpiando base de datos...\n");

  // 1. Tablas hoja (sin dependencias hacia arriba)
  const contratoPersona  = await prisma.contratoPersona.deleteMany();
  console.log(`  ✓ ContratoPersona:       ${contratoPersona.count}`);

  const garante          = await prisma.garante.deleteMany();
  console.log(`  ✓ Garante:               ${garante.count}`);

  const docContacto      = await prisma.documentoContacto.deleteMany();
  console.log(`  ✓ DocumentoContacto:     ${docContacto.count}`);

  const docCliente       = await prisma.documentoCliente.deleteMany();
  console.log(`  ✓ DocumentoCliente:      ${docCliente.count}`);

  const operaciones      = await prisma.operacionCerrada.deleteMany();
  console.log(`  ✓ OperacionCerrada:      ${operaciones.count}`);

  const egresos          = await prisma.egresoInmobiliaria.deleteMany();
  console.log(`  ✓ EgresoInmobiliaria:    ${egresos.count}`);

  const notificaciones   = await prisma.notificacion.deleteMany();
  console.log(`  ✓ Notificacion:          ${notificaciones.count}`);

  const pagos            = await prisma.pagoSuscripcion.deleteMany();
  console.log(`  ✓ PagoSuscripcion:       ${pagos.count}`);

  const config           = await prisma.configuracionInmobiliaria.deleteMany();
  console.log(`  ✓ ConfigInmobiliaria:    ${config.count}`);

  const permisos         = await prisma.permisosAgente.deleteMany();
  console.log(`  ✓ PermisosAgente:        ${permisos.count}`);

  const consultas        = await prisma.consulta.deleteMany();
  console.log(`  ✓ Consulta:              ${consultas.count}`);

  // 2. Contratos (dependen de Propiedad + Cliente + Contacto)
  const contratosAlq     = await prisma.contratoAlquiler.deleteMany();
  console.log(`  ✓ ContratoAlquiler:      ${contratosAlq.count}`);

  const contratosVta     = await prisma.contratoVenta.deleteMany();
  console.log(`  ✓ ContratoVenta:         ${contratosVta.count}`);

  // 3. Visitas
  const visitas          = await prisma.visita.deleteMany();
  console.log(`  ✓ Visita:                ${visitas.count}`);

  // 4. PropiedadCliente (tabla pivot)
  const propCliente      = await prisma.propiedadCliente.deleteMany();
  console.log(`  ✓ PropiedadCliente:      ${propCliente.count}`);

  // 5. Clientes + Contactos
  const clientes         = await prisma.cliente.deleteMany();
  console.log(`  ✓ Cliente:               ${clientes.count}`);

  const contactos        = await prisma.contacto.deleteMany();
  console.log(`  ✓ Contacto:              ${contactos.count}`);

  // 6. Fotos + Atributos de propiedades
  const fotos            = await prisma.fotoPropiedad.deleteMany();
  console.log(`  ✓ FotoPropiedad:         ${fotos.count}`);

  const atributos        = await prisma.propiedadAtributos.deleteMany();
  console.log(`  ✓ PropiedadAtributos:    ${atributos.count}`);

  // 7. Propiedades
  const propiedades      = await prisma.propiedad.deleteMany();
  console.log(`  ✓ Propiedad:             ${propiedades.count}`);

  // 8. Usuarios no-superadmin
  const usuarios         = await prisma.usuario.deleteMany({
    where: { rol: { not: "SUPERADMIN" } },
  });
  console.log(`  ✓ Usuario (no-super):    ${usuarios.count}`);

  // 9. Inmobiliarias (todas)
  const inmobiliarias    = await prisma.inmobiliaria.deleteMany();
  console.log(`  ✓ Inmobiliaria:          ${inmobiliarias.count}`);

  // Verificación final
  const superadmin = await prisma.usuario.findFirst({
    where: { rol: "SUPERADMIN" },
    select: { email: true, nombre: true },
  });

  console.log("\n✅ Limpieza completa.");
  if (superadmin) {
    console.log(`\n👤 Superadmin conservado: ${superadmin.nombre} (${superadmin.email})`);
  } else {
    console.log("\n⚠️  ATENCIÓN: No se encontró usuario SUPERADMIN.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
