/**
 * backfill-garantes.ts — vincula los garantes ya cargados en contratos con la
 * ficha de garante del inquilino.
 *
 * Hasta la migración `20260924230000_garante_deposito_roles` el garante que se
 * cargaba en el asistente de contratos quedaba SOLO como ContratoPersona: el
 * contacto quedaba sin rol y la ficha del inquilino seguía diciendo "sin
 * garante". Este script recorre los contratos existentes y, para cada uno con
 * inquilino + garante:
 *   1. crea (o completa) el Garante del inquilino con los datos del contacto,
 *   2. lo deja apuntando a ese contacto (`contactoGaranteId`),
 *   3. le agrega el rol GARANTE al contacto.
 *
 * Es idempotente y no borra nada. Por defecto solo muestra lo que haría:
 *   npx tsx scripts/backfill-garantes.ts           → simulación
 *   npx tsx scripts/backfill-garantes.ts --aplicar → escribe
 */
import "dotenv/config";
import { db } from "../src/lib/db";

const APLICAR = process.argv.includes("--aplicar");

async function main() {
  const contratos = await db.contratoAlquiler.findMany({
    select: {
      id: true,
      inmobiliariaId: true,
      personas: {
        select: {
          rol: true,
          contacto: {
            select: { id: true, nombre: true, dni: true, telefono: true, domicilio: true, fechaNacimiento: true, roles: true },
          },
        },
      },
    },
  });

  let tocados = 0;

  for (const c of contratos) {
    const inquilino = c.personas.find((p) => p.rol === "INQUILINO")?.contacto;
    const garante = c.personas.find((p) => p.rol === "GARANTE")?.contacto;
    if (!inquilino || !garante) continue;

    const yaExiste = await db.garante.findUnique({
      where: { contactoId: inquilino.id },
      select: { id: true, contactoGaranteId: true },
    });
    const necesitaRol = !garante.roles.includes("GARANTE");

    if (yaExiste?.contactoGaranteId === garante.id && !necesitaRol) continue;

    console.log(
      `CTR-${c.id.slice(-4).toUpperCase()}: ${inquilino.nombre} → garante ${garante.nombre}` +
      `${yaExiste ? " (ficha ya existía, se vincula)" : " (se crea la ficha)"}` +
      `${necesitaRol ? " + rol GARANTE" : ""}`
    );
    tocados++;
    if (!APLICAR) continue;

    const datos = {
      nombre: garante.nombre,
      dni: garante.dni,
      telefono: garante.telefono,
      domicilio: garante.domicilio,
      fechaNacimiento: garante.fechaNacimiento,
      contactoGaranteId: garante.id,
    };
    await db.garante.upsert({
      where: { contactoId: inquilino.id },
      create: { contactoId: inquilino.id, ...datos },
      update: datos,
    });
    if (necesitaRol) {
      await db.contacto.update({
        where: { id: garante.id },
        data: { roles: { set: [...garante.roles, "GARANTE"] } },
      });
    }
  }

  console.log(
    tocados === 0
      ? "\nNada para hacer: todos los garantes ya están vinculados."
      : `\n${tocados} contrato(s) ${APLICAR ? "actualizados" : "a actualizar (corré con --aplicar)"}.`
  );
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
