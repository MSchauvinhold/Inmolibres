import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function hash(p: string) {
  return bcrypt.hash(p, 12);
}

async function main() {
  console.log("🌱 Seeding InmoLibres...");

  // ─── SUPERADMIN ──────────────────────────────────────────────────────────────
  const superadminEmail = process.env.SUPERADMIN_EMAIL ?? "admin@inmolibres.com";
  const superadminPass = process.env.SUPERADMIN_PASSWORD ?? "superadmin123";

  await prisma.usuario.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      email: superadminEmail,
      passwordHash: await hash(superadminPass),
      nombre: "SuperAdmin InmoLibres",
      rol: "SUPERADMIN",
    },
  });
  console.log(`✅ SuperAdmin: ${superadminEmail} / ${superadminPass}`);

  // ─── INMOBILIARIA DE PRUEBA ───────────────────────────────────────────────────
  let inmo = await prisma.inmobiliaria.findFirst({ where: { email: "demo@inmolibres.com" } });
  if (!inmo) {
    inmo = await prisma.inmobiliaria.create({
      data: {
        nombre: "Inmobiliaria Demo",
        whatsapp: "+543772430003",
        email: "demo@inmolibres.com",
        plan: "PRO",
        estado: "PRUEBA",
        fechaVencimiento: new Date(Date.now() + 30 * 86400_000),
      },
    });
  }

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      inmobiliariaId: inmo.id,
      email: "admin@demo.com",
      passwordHash: await hash("demo1234"),
      nombre: "Admin Demo",
      rol: "ADMIN",
    },
  });

  const agente = await prisma.usuario.upsert({
    where: { email: "agente@demo.com" },
    update: {},
    create: {
      inmobiliariaId: inmo.id,
      email: "agente@demo.com",
      passwordHash: await hash("agente123"),
      nombre: "Agente Demo",
      rol: "AGENTE",
    },
  });

  console.log("✅ Inmobiliaria Demo — admin@demo.com / demo1234");
  console.log("   Agente: agente@demo.com / agente123");

  // ─── PROPIEDADES ─────────────────────────────────────────────────────────────
  const propExistente = await prisma.propiedad.findFirst({ where: { inmobiliariaId: inmo.id } });
  if (!propExistente) {
    const propiedades = [
      {
        titulo: "Casa céntrica con pileta y quincho",
        slug: "demo-casa-centrica-pileta-quincho",
        tipo: "CASA" as const,
        operacion: "VENTA" as const,
        precio: 95000,
        moneda: "USD" as const,
        direccion: "Av. San Martín 560, Paso de los Libres",
        latitud: -29.713,
        longitud: -57.0847,
        descripcion: "Espectacular casa en barrio céntrico. 3 dormitorios en suite, living-comedor amplio, cocina equipada, quincho con parrilla y pileta climatizada. Garage para 2 autos.",
        publicada: true,
        agenteId: admin.id,
        atributos: { habitaciones: 3, banos: 3, superficieCubierta: 180, superficieTotal: 380, garage: true, pileta: true, quincho: true, balcon: false, amueblado: false },
      },
      {
        titulo: "Departamento 3 ambientes con balcón",
        slug: "demo-depto-3-amb-balcon",
        tipo: "DEPARTAMENTO" as const,
        operacion: "ALQUILER" as const,
        precio: 250000,
        moneda: "ARS" as const,
        direccion: "Calle Corrientes 310 3°A, Paso de los Libres",
        latitud: -29.7145,
        longitud: -57.0855,
        descripcion: "Departamento luminoso con amplio balcón a la calle. Dormitorio principal con walking closet, 2do dormitorio, baño completo y toilette. Cocina con lavadero. Incluye cochera.",
        publicada: true,
        agenteId: agente.id,
        atributos: { habitaciones: 2, banos: 2, superficieCubierta: 75, balcon: true, amueblado: false, numeroPiso: 3 },
      },
      {
        titulo: "Local comercial en zona céntrica",
        slug: "demo-local-comercial-centrico",
        tipo: "LOCAL" as const,
        operacion: "ALQUILER" as const,
        precio: 180000,
        moneda: "ARS" as const,
        direccion: "Calle Uruguay 195, Paso de los Libres",
        latitud: -29.712,
        longitud: -57.0838,
        descripcion: "Excelente local de 60m² en pleno centro. Frente amplio de 5m, baño completo, depósito trasero. Ideal para comercio o local gastronómico.",
        publicada: true,
        agenteId: agente.id,
        atributos: { superficieCubierta: 60, cantidadPisos: 1 },
      },
      {
        titulo: "Terreno en barrio Las Palmeras — 600m²",
        slug: "demo-terreno-las-palmeras",
        tipo: "TERRENO" as const,
        operacion: "VENTA" as const,
        precio: 18000,
        moneda: "USD" as const,
        direccion: "Barrio Las Palmeras, lote 24, Paso de los Libres",
        latitud: -29.721,
        longitud: -57.092,
        descripcion: "Terreno de 600m² en barrio privado. Escritura al día, todos los servicios en el frente (agua, luz, cloacas). Excelente oportunidad de inversión.",
        publicada: true,
        agenteId: admin.id,
        atributos: { superficieTotal: 600 },
      },
    ];

    for (const p of propiedades) {
      const { atributos, ...propData } = p;
      await prisma.propiedad.create({
        data: { ...propData, inmobiliariaId: inmo.id, atributos: { create: atributos } },
      });
    }
    console.log(`   ✅ ${propiedades.length} propiedades creadas`);
  }

  // ─── CLIENTES + VISITAS + CONSULTAS ──────────────────────────────────────────
  const clienteExistente = await prisma.cliente.findFirst({ where: { inmobiliariaId: inmo.id } });
  if (!clienteExistente) {
    const propList = await prisma.propiedad.findMany({ where: { inmobiliariaId: inmo.id }, take: 4 });

    const clientesData = [
      { nombre: "Pablo Rodríguez", telefono: "+543772501001", email: "pablo.r@gmail.com", origen: "WHATSAPP" as const, estadoPipeline: "NUEVO" as const, notas: "Busca casa con pileta, presupuesto USD 80-100k" },
      { nombre: "Ana Beatriz Solís", telefono: "+543772501002", email: "ana.solis@gmail.com", origen: "INSTAGRAM" as const, estadoPipeline: "CONTACTADO" as const, notas: "Interesada en departamentos para alquiler" },
      { nombre: "Jorge Méndez", telefono: "+543772501003", origen: "REFERIDO" as const, estadoPipeline: "VISITA_AGENDADA" as const, notas: "Lo derivó el escribano Pérez. Quiere terreno para construir." },
    ];

    const clientesCreados = [];
    for (const c of clientesData) {
      const cliente = await prisma.cliente.create({
        data: { inmobiliariaId: inmo.id, agenteId: agente.id, ...c },
      });
      clientesCreados.push(cliente);
    }

    if (propList.length > 0) {
      const now = new Date();
      await prisma.visita.createMany({
        data: [
          {
            inmobiliariaId: inmo.id,
            propiedadId: propList[0].id,
            clienteId: clientesCreados[0].id,
            agenteId: agente.id,
            fechaHora: new Date(now.getTime() + 2 * 86400_000),
            tipo: "VISITA_COMPRADOR",
            estado: "PENDIENTE",
          },
          {
            inmobiliariaId: inmo.id,
            propiedadId: propList[1].id,
            clienteId: clientesCreados[1].id,
            agenteId: agente.id,
            fechaHora: new Date(now.getTime() - 3 * 86400_000),
            tipo: "VISITA_COMPRADOR",
            estado: "REALIZADA",
            notasPost: "Muy buena impresión, están evaluando con la familia.",
          },
        ],
      });

      await prisma.consulta.createMany({
        data: [
          {
            inmobiliariaId: inmo.id,
            propiedadId: propList[0].id,
            nombreVisitante: "Sergio Almada",
            telefono: "+543772600001",
            mensaje: "Buenos días, quisiera saber si la casa todavía está disponible y si aceptan permuta.",
            leida: false,
          },
          {
            inmobiliariaId: inmo.id,
            propiedadId: propList[1].id,
            nombreVisitante: "Valeria Núñez",
            telefono: "+543772600002",
            mensaje: "Hola! Quisiera ver el departamento este fin de semana. ¿Hay disponibilidad?",
            leida: false,
          },
        ],
      });

      await prisma.contratoAlquiler.create({
        data: {
          inmobiliariaId: inmo.id,
          propiedadId: propList[1].id,
          inquilinoNombre: "Felipe Aguirre",
          inquilinoTel: "+543772700001",
          precioMensual: 250000,
          moneda: "ARS",
          diaVencimientoPago: 10,
          estadoPago: "AL_DIA",
          fechaInicio: new Date("2025-01-01"),
          fechaFin: new Date("2026-12-31"),
        },
      });
    }
    console.log("   ✅ Clientes, visitas, consultas y contrato creados");
  }

  console.log("\n🎉 Seed completado exitosamente!\n");
  console.log("════════════════════════════════════════════");
  console.log("CREDENCIALES DE ACCESO");
  console.log("════════════════════════════════════════════");
  console.log("");
  console.log("SUPERADMIN:");
  console.log(`  Email:      ${superadminEmail}`);
  console.log(`  Contraseña: ${superadminPass}`);
  console.log("  URL:        /admin");
  console.log("");
  console.log("INMOBILIARIA DEMO (EN PRUEBA - Plan PRO):");
  console.log("  Admin:      admin@demo.com / demo1234");
  console.log("  Agente:     agente@demo.com / agente123");
  console.log("  URL:        /dashboard");
  console.log("════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
