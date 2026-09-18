/**
 * clean-db.ts
 * Borra TODOS los datos de la base excepto el usuario SUPERADMIN.
 *
 * ⚠️  DESTRUCTIVO E IRREVERSIBLE. Para que no se ejecute por error contra la base
 * equivocada exige dos confirmaciones explícitas antes de tocar nada:
 *
 *   1. ALLOW_DESTRUCTIVE_DB_OPS=true  (variable de entorno dedicada)
 *   2. Escribir a mano el host de la base cuando el script lo pide (o pasarlo en
 *      CONFIRM_DB_HOST si se corre sin terminal interactiva)
 *
 * Además aborta siempre si detecta un entorno de producción (NODE_ENV/VERCEL_ENV)
 * o si el host coincide con PRODUCTION_DB_HOST.
 *
 * Ejecutar con:
 *   PowerShell: $env:ALLOW_DESTRUCTIVE_DB_OPS="true"; npx tsx scripts/clean-db.ts
 *   bash:       ALLOW_DESTRUCTIVE_DB_OPS=true npx tsx scripts/clean-db.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as readline from "node:readline/promises";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

function abort(motivo: string, ayuda?: string): never {
  console.error(`\n⛔ Abortado: ${motivo}`);
  if (ayuda) console.error(`   ${ayuda}`);
  process.exit(1);
}

/** Host y nombre de base del DATABASE_URL, para mostrarlos y compararlos. */
function targetDb(url: string): { host: string; database: string } {
  try {
    const u = new URL(url);
    return { host: u.hostname, database: u.pathname.replace(/^\//, "") || "(sin nombre)" };
  } catch {
    abort("DATABASE_URL no es una URL válida.");
  }
}

/**
 * Puerta de entrada del script: si retorna, el borrado está autorizado.
 * Cualquier chequeo que falle corta el proceso antes de abrir la conexión.
 */
async function assertDestructiveOpsAllowed(): Promise<void> {
  if (!DATABASE_URL) abort("no hay DATABASE_URL configurada.");

  // 1. Nunca en producción, sin importar el resto de las variables.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    abort(
      "esto parece un entorno de producción (NODE_ENV/VERCEL_ENV).",
      "El script solo puede correr en local contra una base de desarrollo.",
    );
  }

  // 2. Flag dedicado: imposible de activar sin querer.
  if (process.env.ALLOW_DESTRUCTIVE_DB_OPS !== "true") {
    abort(
      "falta ALLOW_DESTRUCTIVE_DB_OPS=true.",
      'PowerShell: $env:ALLOW_DESTRUCTIVE_DB_OPS="true"; npx tsx scripts/clean-db.ts',
    );
  }

  const { host, database } = targetDb(DATABASE_URL);

  // 3. Host marcado explícitamente como producción.
  const prodHost = process.env.PRODUCTION_DB_HOST?.trim();
  if (prodHost && host === prodHost) {
    abort(`el host ${host} es el de producción (PRODUCTION_DB_HOST).`);
  }

  // 4. Confirmación del host concreto. El .env local puede apuntar a la MISMA base
  //    que usa la app publicada, así que el flag solo no alcanza: hay que mirar
  //    contra qué base se está por correr y escribirla a mano.
  console.log("⚠️  Vas a BORRAR TODOS LOS DATOS (excepto el SUPERADMIN) de:");
  console.log(`      host: ${host}`);
  console.log(`      base: ${database}\n`);

  const confirmEnv = process.env.CONFIRM_DB_HOST?.trim();
  if (confirmEnv) {
    if (confirmEnv !== host) {
      abort(`CONFIRM_DB_HOST ("${confirmEnv}") no coincide con el host real ("${host}").`);
    }
    return;
  }

  if (!process.stdin.isTTY) {
    abort(
      "no hay terminal interactiva para confirmar.",
      `Volvé a correrlo con CONFIRM_DB_HOST="${host}".`,
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = (await rl.question(`Escribí el host para confirmar (${host}): `)).trim();
  rl.close();
  if (respuesta !== host) abort("el host escrito no coincide. No se borró nada.");
}

const adapter = new PrismaNeon({ connectionString: DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await assertDestructiveOpsAllowed();

  console.log("\n🧹 Limpiando base de datos...\n");

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
