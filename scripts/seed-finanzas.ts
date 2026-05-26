import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);
  return d;
}

async function main() {
  console.log("💰 Cargando datos financieros demo...\n");

  const inmo = await prisma.inmobiliaria.findFirst({ where: { email: "demo@inmolibres.com" } });
  if (!inmo) throw new Error("Inmobiliaria demo no encontrada — ejecutá el seed primero");

  const admin = await prisma.usuario.findFirst({ where: { inmobiliariaId: inmo.id, rol: "ADMIN" } });
  const agente = await prisma.usuario.findFirst({ where: { inmobiliariaId: inmo.id, rol: "AGENTE" } });
  if (!admin || !agente) throw new Error("Usuarios demo no encontrados");

  const propiedades = await prisma.propiedad.findMany({ where: { inmobiliariaId: inmo.id }, take: 4 });
  const clientes = await prisma.cliente.findMany({ where: { inmobiliariaId: inmo.id }, take: 3 });

  // ─── Limpiar datos previos ────────────────────────────────────────────────────
  await prisma.operacionCerrada.deleteMany({ where: { inmobiliariaId: inmo.id } });
  await prisma.egresoInmobiliaria.deleteMany({ where: { inmobiliariaId: inmo.id } });
  console.log("  🗑️  Datos financieros previos eliminados");

  // ─── OPERACIONES CERRADAS (ingresos) ─────────────────────────────────────────
  const operaciones = [
    // Mes actual (mayo 2026)
    {
      agenteId: admin.id,
      tipo: "VENTA" as const,
      precioOperacion: 95000,
      moneda: "USD" as const,
      comisionVendedorPct: 3,
      comisionCompradorPct: 3,
      comisionTotal: 5700,
      comisionInmob: 3990,
      comisionAgente: 1710,
      ivaComision: 1197,
      gastos: 350,
      descripcionGastos: "Escribanía y sellados",
      notas: "Casa céntrica — comprador financió con banco",
      propiedadId: propiedades[0]?.id,
      clienteId: clientes[0]?.id,
      fechaCierre: diasAtras(4),
    },
    {
      agenteId: agente.id,
      tipo: "ALQUILER" as const,
      precioOperacion: 250000,
      moneda: "ARS" as const,
      comisionVendedorPct: 0,
      comisionCompradorPct: 8.33,
      comisionTotal: 250000,
      comisionInmob: 175000,
      comisionAgente: 75000,
      ivaComision: 52500,
      gastos: 0,
      notas: "Depto 3 ambientes — contrato 2 años",
      propiedadId: propiedades[1]?.id,
      clienteId: clientes[1]?.id,
      fechaCierre: diasAtras(10),
    },
    // Abril 2026
    {
      agenteId: admin.id,
      tipo: "VENTA" as const,
      precioOperacion: 75000,
      moneda: "USD" as const,
      comisionVendedorPct: 3,
      comisionCompradorPct: 3,
      comisionTotal: 4500,
      comisionInmob: 3150,
      comisionAgente: 1350,
      ivaComision: 945,
      gastos: 280,
      descripcionGastos: "Gastos notariales",
      notas: "Terreno Las Palmeras — pago contado",
      propiedadId: propiedades[3]?.id,
      fechaCierre: diasAtras(28),
    },
    {
      agenteId: agente.id,
      tipo: "ALQUILER" as const,
      precioOperacion: 180000,
      moneda: "ARS" as const,
      comisionVendedorPct: 0,
      comisionCompradorPct: 8.33,
      comisionTotal: 180000,
      comisionInmob: 126000,
      comisionAgente: 54000,
      ivaComision: 37800,
      gastos: 0,
      notas: "Local comercial — zona céntrica",
      propiedadId: propiedades[2]?.id,
      fechaCierre: diasAtras(35),
    },
    {
      agenteId: admin.id,
      tipo: "ALQUILER_TEMPORARIO" as const,
      precioOperacion: 85000,
      moneda: "ARS" as const,
      comisionVendedorPct: 0,
      comisionCompradorPct: 15,
      comisionTotal: 85000,
      comisionInmob: 68000,
      comisionAgente: 17000,
      ivaComision: 20400,
      gastos: 0,
      notas: "Cabañas temporada Semana Santa",
      fechaCierre: diasAtras(42),
    },
    // Marzo 2026
    {
      agenteId: agente.id,
      tipo: "VENTA" as const,
      precioOperacion: 48000,
      moneda: "USD" as const,
      comisionVendedorPct: 3,
      comisionCompradorPct: 3,
      comisionTotal: 2880,
      comisionInmob: 2016,
      comisionAgente: 864,
      ivaComision: 604.8,
      gastos: 200,
      descripcionGastos: "Planos y mensuras",
      notas: "Terreno esquina barrio Norte",
      fechaCierre: diasAtras(62),
    },
    {
      agenteId: admin.id,
      tipo: "ALQUILER" as const,
      precioOperacion: 320000,
      moneda: "ARS" as const,
      comisionVendedorPct: 0,
      comisionCompradorPct: 8.33,
      comisionTotal: 320000,
      comisionInmob: 224000,
      comisionAgente: 96000,
      ivaComision: 67200,
      gastos: 0,
      notas: "Oficinas planta baja — empresa logística",
      fechaCierre: diasAtras(70),
    },
    {
      agenteId: agente.id,
      tipo: "VENTA" as const,
      precioOperacion: 130000,
      moneda: "USD" as const,
      comisionVendedorPct: 3,
      comisionCompradorPct: 3,
      comisionTotal: 7800,
      comisionInmob: 5460,
      comisionAgente: 2340,
      ivaComision: 1638,
      gastos: 500,
      descripcionGastos: "Escribanía, ITI e impuestos",
      notas: "Casa nueva barrio residencial — 4 dormitorios",
      fechaCierre: diasAtras(78),
    },
    // Febrero 2026
    {
      agenteId: admin.id,
      tipo: "ALQUILER_TEMPORARIO" as const,
      precioOperacion: 120000,
      moneda: "ARS" as const,
      comisionVendedorPct: 0,
      comisionCompradorPct: 15,
      comisionTotal: 120000,
      comisionInmob: 96000,
      comisionAgente: 24000,
      ivaComision: 28800,
      gastos: 0,
      notas: "Casa de veraneo — temporada febrero",
      fechaCierre: diasAtras(100),
    },
    {
      agenteId: agente.id,
      tipo: "ALQUILER" as const,
      precioOperacion: 210000,
      moneda: "ARS" as const,
      comisionVendedorPct: 0,
      comisionCompradorPct: 8.33,
      comisionTotal: 210000,
      comisionInmob: 147000,
      comisionAgente: 63000,
      ivaComision: 44100,
      gastos: 0,
      notas: "Depto amoblado zona hospital",
      fechaCierre: diasAtras(108),
    },
    // Enero 2026
    {
      agenteId: admin.id,
      tipo: "VENTA" as const,
      precioOperacion: 62000,
      moneda: "USD" as const,
      comisionVendedorPct: 3,
      comisionCompradorPct: 3,
      comisionTotal: 3720,
      comisionInmob: 2604,
      comisionAgente: 1116,
      ivaComision: 781.2,
      gastos: 220,
      descripcionGastos: "Gastos notariales",
      notas: "PH en planta alta — primera operación del año",
      fechaCierre: diasAtras(138),
    },
    {
      agenteId: agente.id,
      tipo: "ALQUILER" as const,
      precioOperacion: 290000,
      moneda: "ARS" as const,
      comisionVendedorPct: 0,
      comisionCompradorPct: 8.33,
      comisionTotal: 290000,
      comisionInmob: 203000,
      comisionAgente: 87000,
      ivaComision: 60900,
      gastos: 0,
      notas: "Local gastronómico frente a plaza",
      fechaCierre: diasAtras(148),
    },
    // Diciembre 2025
    {
      agenteId: admin.id,
      tipo: "VENTA" as const,
      precioOperacion: 110000,
      moneda: "USD" as const,
      comisionVendedorPct: 3,
      comisionCompradorPct: 3,
      comisionTotal: 6600,
      comisionInmob: 4620,
      comisionAgente: 1980,
      ivaComision: 1386,
      gastos: 450,
      descripcionGastos: "Escribanía + tasación bancaria",
      notas: "Casa en barrio Golf — crédito hipotecario",
      fechaCierre: diasAtras(168),
    },
    {
      agenteId: agente.id,
      tipo: "ALQUILER_TEMPORARIO" as const,
      precioOperacion: 95000,
      moneda: "ARS" as const,
      comisionVendedorPct: 0,
      comisionCompradorPct: 15,
      comisionTotal: 95000,
      comisionInmob: 76000,
      comisionAgente: 19000,
      ivaComision: 22800,
      gastos: 0,
      notas: "Alquiler temporada fin de año",
      fechaCierre: diasAtras(175),
    },
  ];

  for (const op of operaciones) {
    const { fechaCierre, ...rest } = op;
    await prisma.operacionCerrada.create({
      data: { inmobiliariaId: inmo.id, ...rest, fechaCierre },
    });
  }
  console.log(`  ✅ ${operaciones.length} operaciones cerradas creadas`);

  // ─── EGRESOS ─────────────────────────────────────────────────────────────────
  const egresos = [
    // Mayo 2026
    { concepto: "Alquiler oficina — mayo", monto: 180000, moneda: "ARS" as const, categoria: "Alquiler oficina", fecha: diasAtras(1) },
    { concepto: "Honorarios contador", monto: 45000, moneda: "ARS" as const, categoria: "Honorarios profesionales", fecha: diasAtras(3) },
    { concepto: "Publicidad portal Zonaprop", monto: 28000, moneda: "ARS" as const, categoria: "Marketing y publicidad", fecha: diasAtras(7) },
    { concepto: "Servicio de telefonía e internet", monto: 12500, moneda: "ARS" as const, categoria: "Servicios", fecha: diasAtras(12) },
    { concepto: "Combustible vehículos", monto: 35000, moneda: "ARS" as const, categoria: "Movilidad", fecha: diasAtras(15) },
    // Abril 2026
    { concepto: "Alquiler oficina — abril", monto: 180000, moneda: "ARS" as const, categoria: "Alquiler oficina", fecha: diasAtras(33) },
    { concepto: "Comisión fotógrafo inmobiliario", monto: 18000, moneda: "ARS" as const, categoria: "Marketing y publicidad", fecha: diasAtras(36) },
    { concepto: "Material de oficina", monto: 8500, moneda: "ARS" as const, categoria: "Insumos", fecha: diasAtras(40) },
    { concepto: "Hosting y dominio anual", monto: 95, moneda: "USD" as const, categoria: "Software y tecnología", fecha: diasAtras(43) },
    { concepto: "Suscripción CRM / plataforma", monto: 45, moneda: "USD" as const, categoria: "Software y tecnología", fecha: diasAtras(45) },
    // Marzo 2026
    { concepto: "Alquiler oficina — marzo", monto: 175000, moneda: "ARS" as const, categoria: "Alquiler oficina", fecha: diasAtras(63) },
    { concepto: "Servicio de limpieza oficina", monto: 22000, moneda: "ARS" as const, categoria: "Servicios", fecha: diasAtras(68) },
    { concepto: "Publicidad redes sociales — Meta Ads", monto: 30000, moneda: "ARS" as const, categoria: "Marketing y publicidad", fecha: diasAtras(72) },
    { concepto: "Reparación aire acondicionado oficina", monto: 55000, moneda: "ARS" as const, categoria: "Mantenimiento", fecha: diasAtras(75) },
    // Febrero 2026
    { concepto: "Alquiler oficina — febrero", monto: 175000, moneda: "ARS" as const, categoria: "Alquiler oficina", fecha: diasAtras(95) },
    { concepto: "Honorarios contador", monto: 42000, moneda: "ARS" as const, categoria: "Honorarios profesionales", fecha: diasAtras(98) },
    { concepto: "Combustible vehículos", monto: 32000, moneda: "ARS" as const, categoria: "Movilidad", fecha: diasAtras(105) },
    { concepto: "Cartelería nueva propiedades", monto: 15000, moneda: "ARS" as const, categoria: "Marketing y publicidad", fecha: diasAtras(110) },
    // Enero 2026
    { concepto: "Alquiler oficina — enero", monto: 160000, moneda: "ARS" as const, categoria: "Alquiler oficina", fecha: diasAtras(130) },
    { concepto: "Seguro comercial anual", monto: 120000, moneda: "ARS" as const, categoria: "Seguros", fecha: diasAtras(135) },
    { concepto: "Publicidad portal ArgenProp", monto: 24000, moneda: "ARS" as const, categoria: "Marketing y publicidad", fecha: diasAtras(140) },
    { concepto: "Material de oficina e impresión", monto: 11000, moneda: "ARS" as const, categoria: "Insumos", fecha: diasAtras(145) },
    // Diciembre 2025
    { concepto: "Alquiler oficina — diciembre", monto: 160000, moneda: "ARS" as const, categoria: "Alquiler oficina", fecha: diasAtras(162) },
    { concepto: "Festejo fin de año equipo", monto: 85000, moneda: "ARS" as const, categoria: "Gastos de personal", fecha: diasAtras(165) },
    { concepto: "Renovación suscripción portales", monto: 35000, moneda: "ARS" as const, categoria: "Marketing y publicidad", fecha: diasAtras(170) },
    { concepto: "Servicio de telefonía e internet", monto: 10800, moneda: "ARS" as const, categoria: "Servicios", fecha: diasAtras(172) },
  ];

  for (const eg of egresos) {
    await prisma.egresoInmobiliaria.create({
      data: { inmobiliariaId: inmo.id, ...eg },
    });
  }
  console.log(`  ✅ ${egresos.length} egresos creados`);

  // ─── Resumen ─────────────────────────────────────────────────────────────────
  const totalIngresosUSD = operaciones
    .filter(o => o.moneda === "USD")
    .reduce((sum, o) => sum + o.comisionInmob, 0);
  const totalIngresosARS = operaciones
    .filter(o => o.moneda === "ARS")
    .reduce((sum, o) => sum + o.comisionInmob, 0);
  const totalEgresosARS = egresos
    .filter(e => e.moneda === "ARS")
    .reduce((sum, e) => sum + e.monto, 0);
  const totalEgresosUSD = egresos
    .filter(e => e.moneda === "USD")
    .reduce((sum, e) => sum + e.monto, 0);

  console.log("\n📊 Resumen financiero cargado:");
  console.log(`   Ingresos (comisiones inmob): USD ${totalIngresosUSD.toLocaleString()} | ARS ${totalIngresosARS.toLocaleString()}`);
  console.log(`   Egresos totales:             ARS ${totalEgresosARS.toLocaleString()} | USD ${totalEgresosUSD}`);
  console.log(`   Período: diciembre 2025 — mayo 2026\n`);
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
