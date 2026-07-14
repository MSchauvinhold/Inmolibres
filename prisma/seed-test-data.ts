import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function hash(p: string) {
  return bcrypt.hash(p, 12);
}

const TIPOS = ["CASA", "DEPARTAMENTO", "LOCAL", "GALPON", "TERRENO", "OFICINA"] as const;
const OPERACIONES = ["VENTA", "ALQUILER", "ALQUILER_TEMPORARIO"] as const;

const BASE_LAT = -29.7139;
const BASE_LNG = -57.0847;

function jitter(base: number, range: number) {
  return base + (Math.random() * 2 - 1) * range;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

function atributosPara(tipo: (typeof TIPOS)[number]) {
  if (tipo === "TERRENO") {
    return { superficieTotal: 300 + Math.round(Math.random() * 500) };
  }
  if (tipo === "LOCAL" || tipo === "GALPON" || tipo === "OFICINA") {
    return { superficieCubierta: 40 + Math.round(Math.random() * 200) };
  }
  return {
    habitaciones: 1 + Math.floor(Math.random() * 4),
    banos: 1 + Math.floor(Math.random() * 2),
    superficieCubierta: 45 + Math.round(Math.random() * 150),
    superficieTotal: 60 + Math.round(Math.random() * 250),
    garage: Math.random() > 0.5,
    pileta: tipo === "CASA" && Math.random() > 0.6,
    balcon: tipo === "DEPARTAMENTO" && Math.random() > 0.5,
    amueblado: Math.random() > 0.7,
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("🌱 Creando datos de prueba (5 inmobiliarias, 5 particulares, propiedades)...\n");

  // ─── 5 INMOBILIARIAS ────────────────────────────────────────────────────────
  const inmobiliariasData = [
    { nombre: "Inmobiliaria Del Centro",     ciudad: "Paso de los Libres", plan: "PRO",      estado: "ACTIVA" as const },
    { nombre: "Raíces Propiedades",          ciudad: "Paso de los Libres", plan: "AVANZADO", estado: "ACTIVA" as const },
    { nombre: "Horizonte Inmobiliaria",      ciudad: "Monte Caseros",      plan: "PRO",      estado: "ACTIVA" as const },
    { nombre: "Nuevo Hogar Bienes Raíces",   ciudad: "Santo Tomé",         plan: "AVANZADO", estado: "PRUEBA" as const },
    { nombre: "Litoral Propiedades",         ciudad: "Paso de los Libres", plan: "PRO",      estado: "ACTIVA" as const },
  ];

  const inmobiliarias = [];
  for (let i = 0; i < inmobiliariasData.length; i++) {
    const d = inmobiliariasData[i];
    const email = `contacto${i + 1}@${slugify(d.nombre)}.test`;
    let inmo = await prisma.inmobiliaria.findFirst({ where: { email } });
    if (!inmo) {
      inmo = await prisma.inmobiliaria.create({
        data: {
          nombre: d.nombre,
          whatsapp: `+54377250${1000 + i}`,
          email,
          plan: d.plan,
          estado: d.estado,
          fechaVencimiento: new Date(Date.now() + 60 * 86400_000),
        },
      });
    }
    inmobiliarias.push({ ...inmo, ciudad: d.ciudad });

    const adminEmail = `admin${i + 1}@${slugify(d.nombre)}.test`;
    const admin = await prisma.usuario.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        inmobiliariaId: inmo.id,
        email: adminEmail,
        passwordHash: await hash("Prueba1234"),
        nombre: `Admin ${d.nombre}`,
        rol: "ADMIN",
      },
    });

    const agenteEmail = `agente${i + 1}@${slugify(d.nombre)}.test`;
    const agente = await prisma.usuario.upsert({
      where: { email: agenteEmail },
      update: {},
      create: {
        inmobiliariaId: inmo.id,
        email: agenteEmail,
        passwordHash: await hash("Prueba1234"),
        nombre: `Agente ${d.nombre}`,
        rol: "AGENTE",
      },
    });

    console.log(`✅ ${d.nombre} — admin: ${adminEmail} / Prueba1234 · agente: ${agenteEmail} / Prueba1234`);

    // 6 propiedades por inmobiliaria
    const yaTiene = await prisma.propiedad.count({ where: { inmobiliariaId: inmo.id } });
    if (yaTiene === 0) {
      for (let j = 0; j < 6; j++) {
        const tipo = pick(TIPOS, j);
        const operacion = pick(OPERACIONES, j);
        const moneda = operacion === "VENTA" ? "USD" : "ARS";
        const precio = operacion === "VENTA" ? 15000 + Math.round(Math.random() * 120000) : 80000 + Math.round(Math.random() * 300000);
        const titulo = `${tipo === "CASA" ? "Casa" : tipo === "DEPARTAMENTO" ? "Departamento" : tipo === "LOCAL" ? "Local" : tipo === "GALPON" ? "Galpón" : tipo === "TERRENO" ? "Terreno" : "Oficina"} en ${d.ciudad} — ${d.nombre} #${j + 1}`;
        const slug = `${slugify(d.nombre)}-${slugify(tipo)}-${i}-${j}`;
        const { atributos: attrs } = { atributos: atributosPara(tipo) };

        await prisma.propiedad.create({
          data: {
            inmobiliariaId: inmo.id,
            titulo,
            slug,
            tipo,
            operacion,
            precio,
            moneda,
            direccion: `Calle de prueba ${100 + j}, ${d.ciudad}`,
            latitud: jitter(BASE_LAT, 0.05),
            longitud: jitter(BASE_LNG, 0.05),
            descripcion: `Propiedad de prueba generada para testing de filtros. ${titulo}.`,
            publicada: true,
            agenteId: j % 2 === 0 ? admin.id : agente.id,
            atributos: { create: attrs },
          },
        });
      }
      console.log(`   ✅ 6 propiedades creadas para ${d.nombre}`);
    }
  }

  // ─── 5 PARTICULARES ─────────────────────────────────────────────────────────
  const particularesData = [
    { nombre: "Marta Gómez",     ciudad: "Paso de los Libres" },
    { nombre: "Ricardo Ferreyra",ciudad: "Paso de los Libres" },
    { nombre: "Lucía Benítez",   ciudad: "Monte Caseros" },
    { nombre: "Diego Acosta",    ciudad: "Santo Tomé" },
    { nombre: "Carla Ibáñez",    ciudad: "Paso de los Libres" },
  ];

  for (let i = 0; i < particularesData.length; i++) {
    const d = particularesData[i];
    const email = `particular${i + 1}@${slugify(d.nombre)}.test`;
    const particular = await prisma.usuario.upsert({
      where: { email },
      update: {},
      create: {
        inmobiliariaId: null,
        email,
        passwordHash: await hash("Prueba1234"),
        nombre: d.nombre,
        rol: "PARTICULAR",
      },
    });

    console.log(`✅ Particular: ${d.nombre} — ${email} / Prueba1234`);

    const yaTiene = await prisma.propiedad.count({ where: { agenteId: particular.id } });
    if (yaTiene === 0) {
      for (let j = 0; j < 2; j++) {
        const tipo = pick(TIPOS, i + j);
        const operacion = pick(OPERACIONES, i + j);
        const moneda = operacion === "VENTA" ? "USD" : "ARS";
        const precio = operacion === "VENTA" ? 10000 + Math.round(Math.random() * 60000) : 60000 + Math.round(Math.random() * 150000);
        const titulo = `${tipo === "CASA" ? "Casa" : tipo === "DEPARTAMENTO" ? "Departamento" : tipo === "LOCAL" ? "Local" : tipo === "GALPON" ? "Galpón" : tipo === "TERRENO" ? "Terreno" : "Oficina"} particular en ${d.ciudad} #${j + 1}`;
        const slug = `particular-${slugify(d.nombre)}-${j}`;

        await prisma.propiedad.create({
          data: {
            inmobiliariaId: null,
            titulo,
            slug,
            tipo,
            operacion,
            precio,
            moneda,
            direccion: `Calle particular ${200 + j}, ${d.ciudad}`,
            latitud: jitter(BASE_LAT, 0.06),
            longitud: jitter(BASE_LNG, 0.06),
            descripcion: `Propiedad de prueba de dueño particular. ${titulo}.`,
            publicada: true,
            agenteId: particular.id,
            atributos: { create: atributosPara(tipo) },
          },
        });
      }
      console.log(`   ✅ 2 propiedades creadas para ${d.nombre}`);
    }
  }

  console.log("\n🎉 Datos de prueba creados. Todas las contraseñas: Prueba1234\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
