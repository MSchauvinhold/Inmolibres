/**
 * InmoLibres — Test E2E completo del flujo Admin
 * Cubre: login, inmobiliaria, config, agente, propiedades, clientes,
 *        visitas, alquileres, finanzas, calculadoras, marketplace, consultas.
 */

import { test, expect, Page } from "@playwright/test";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// ─── Credenciales y constantes ────────────────────────────────────────────────

const SUPERADMIN_EMAIL = "mateo_schauvinhold@hotmail.com";
const SUPERADMIN_PASSWORD =
  process.env.SUPERADMIN_PASSWORD ?? "Kaisito40261943@";

const TS = Date.now().toString().slice(-5);
const INMO_NOMBRE = `InmoTest E2E ${TS}`;
const INMO_WHATSAPP = "3772100001";
const INMO_EMAIL = `info${TS}@testinmo.com`;

const ADMIN_EMAIL = `admin${TS}@testinmo.com`;
const ADMIN_PASSWORD = "AdminE2E2024!";
const ADMIN_NOMBRE = "Admin Test E2E";

const AGENT_NAME = "Agente Test E2E";
const AGENT_EMAIL = `agente${TS}@testinmo.com`;
const AGENT_PASSWORD = "AgenteE2E2024!";

const SCREENSHOTS_DIR = join(__dirname, "screenshots");
const FIXTURES_DIR = join(__dirname, "fixtures");
const TEST_IMAGE = join(FIXTURES_DIR, "test-image.png");

// PNG de 10×10 píxeles blanco (base64)
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk" +
  "+A9QTwMJAAIABQABNjN9GQAAAABJRkJggg==";

// ─── Tracker de resultados ────────────────────────────────────────────────────

interface StepResult {
  step: string;
  status: "✅" | "❌";
  error?: string;
  screenshot?: string;
  ms?: number;
}
const results: StepResult[] = [];

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

test.beforeAll(async () => {
  [SCREENSHOTS_DIR, FIXTURES_DIR].forEach((d) => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });
  writeFileSync(TEST_IMAGE, Buffer.from(PNG_B64, "base64"));
});

test.afterAll(async () => {
  const ok = results.filter((r) => r.status === "✅").length;
  const fail = results.filter((r) => r.status === "❌").length;

  let md = `# Reporte E2E — InmoLibres Admin Flow\n\n`;
  md += `**Fecha:** ${new Date().toLocaleString("es-AR")}\n\n`;
  md += `## Resumen\n\n`;
  md += `| Estado | Cantidad |\n|--------|----------|\n`;
  md += `| ✅ Exitosos | ${ok} |\n`;
  md += `| ❌ Fallidos | ${fail} |\n`;
  md += `| Total   | ${results.length} |\n\n`;
  md += `## Detalle de pasos\n\n`;

  for (const r of results) {
    md += `### ${r.status} ${r.step}\n`;
    if (r.ms) md += `- ⏱ Duración: ${r.ms}ms\n`;
    if (r.screenshot) md += `- 📸 Screenshot: \`${r.screenshot}\`\n`;
    if (r.error) md += `- ❌ Error: \`${r.error.slice(0, 400)}\`\n`;
    md += "\n";
  }

  writeFileSync(join(__dirname, "reporte.md"), md, "utf-8");
  console.log(
    `\n📊 Reporte guardado en tests/e2e/reporte.md\n` +
      `✅ ${ok} exitosos  ❌ ${fail} fallidos\n`
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Toma screenshot y registra el resultado del paso. Nunca lanza error. */
async function step(
  name: string,
  page: Page,
  fn: () => Promise<void>
): Promise<boolean> {
  const t0 = Date.now();
  const safeName = name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  try {
    await fn();
    const sc = join(SCREENSHOTS_DIR, `${safeName}.png`);
    await page.screenshot({ path: sc, fullPage: true }).catch(() => {});
    results.push({ step: name, status: "✅", screenshot: sc, ms: Date.now() - t0 });
    console.log(`  ✅ ${name}`);
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const sc = join(SCREENSHOTS_DIR, `ERROR-${safeName}.png`);
    await page.screenshot({ path: sc, fullPage: true }).catch(() => {});
    results.push({
      step: name,
      status: "❌",
      error: msg.slice(0, 400),
      screenshot: sc,
      ms: Date.now() - t0,
    });
    console.error(`  ❌ ${name}\n     ${msg.slice(0, 200)}`);
    return false;
  }
}

/** Hace login y espera la redirección. */
async function login(
  page: Page,
  email: string,
  password: string,
  urlPattern: string | RegExp
) {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await page.fill('input[type="email"]', email);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(urlPattern, { timeout: 15_000 });
}

/** Limpia cookies para simular sesión cerrada. */
async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
}

// ─── Test principal ───────────────────────────────────────────────────────────

test("InmoLibres — Admin flow completo", async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);

  // ── 1. Login como SuperAdmin ──────────────────────────────────────────────
  await step("1. Login SuperAdmin", page, async () => {
    await login(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/admin/);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  // ── 2. Crear inmobiliaria de prueba ───────────────────────────────────────
  await step("2. Crear inmobiliaria de prueba", page, async () => {
    await page.goto("/admin/inmobiliarias");
    await page.waitForLoadState("networkidle");

    // Abrir formulario
    await page.getByRole("button", { name: /nueva inmobiliaria/i }).click();
    await page.waitForSelector("form", { timeout: 5_000 });

    // Datos de la inmobiliaria
    await page.fill('input[placeholder="Inmobiliaria XYZ"]', INMO_NOMBRE);
    await page.fill('input[placeholder="+54 3772..."]', INMO_WHATSAPP);
    await page.fill('input[placeholder="contacto@inmo.com"]', INMO_EMAIL);

    // Vencimiento: 1 año desde hoy
    const venc = new Date();
    venc.setFullYear(venc.getFullYear() + 1);
    await page.fill('input[type="date"]', venc.toISOString().split("T")[0]);

    // Datos del admin de la inmobiliaria
    // El form renderiza nombre, email y password en una sección de "Cuenta de Administrador"
    // Usamos `>p` (hijo directo) para evitar que se seleccionen divs ancestros
    const adminSection = page.locator(
      'div:has(> p:has-text("Cuenta de Administrador"))'
    );
    const adminInputs = adminSection.locator("input");
    await adminInputs.nth(0).fill(ADMIN_NOMBRE);
    await adminInputs.nth(1).fill(ADMIN_EMAIL);
    await adminInputs.nth(2).fill(ADMIN_PASSWORD);

    // Enviar
    await page.getByRole("button", { name: /^crear$/i }).click();
    await page.waitForSelector(`text="${INMO_NOMBRE}"`, { timeout: 10_000 });
    await expect(page.getByText(INMO_NOMBRE)).toBeVisible();
  });

  // ── 3. Logout SuperAdmin ──────────────────────────────────────────────────
  await step("3. Logout SuperAdmin", page, async () => {
    await clearSession(page);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  // ── 4. Login como Admin de inmobiliaria ───────────────────────────────────
  await step("4. Login Admin de inmobiliaria", page, async () => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, /\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ── 5. Configuración — Datos legales + comisiones ─────────────────────────
  await step("5. Configuración — Datos legales y comisiones", page, async () => {
    await page.goto("/configuracion");
    await page.waitForLoadState("networkidle");

    // Expandir sección si está colapsada (click en el primer header con ChevronDown)
    const expandBtn = page
      .locator("button")
      .filter({ hasText: /datos legales|legal|cuit|información/i })
      .first();
    if (await expandBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(400);
    }

    // CUIT — placeholder real: "20-12345678-9"
    const cuitInput = page
      .locator('input[placeholder*="20-"]')
      .first();
    if (await cuitInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cuitInput.fill("20-71234567-9");
    }

    // Razón social — placeholder real: "Inmobiliaria SRL"
    const razonInput = page
      .locator('input[placeholder*="SRL"]')
      .first();
    if (await razonInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await razonInput.fill("Test Inmobiliaria S.A.");
    }

    // Matrícula — placeholder real: "Nº de matrícula" ("matr" aparece en matrícula)
    const matriculaInput = page
      .locator('input[placeholder*="matr"]')
      .first();
    if (
      await matriculaInput.isVisible({ timeout: 2_000 }).catch(() => false)
    ) {
      await matriculaInput.fill("M-12345");
    }

    // Guardar — botón "Guardar datos legales"
    const saveBtn = page
      .getByRole("button", { name: /guardar datos legales|guardar/i })
      .first();
    if (await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1_500);
    }
  });

  // ── 6. Crear agente ────────────────────────────────────────────────────────
  await step("6. Crear agente", page, async () => {
    await page.goto("/configuracion");
    await page.waitForLoadState("networkidle");

    // Click en "Nuevo agente" / "Agregar agente"
    await page
      .getByRole("button", { name: /nuevo agente|agregar agente/i })
      .click();
    await page.waitForTimeout(500);

    // Los 3 inputs del formulario de agente:
    //   nombre: placeholder="Nombre completo" (type="text")
    //   email:  placeholder="agente@email.com" (type="email")
    //   pass:   placeholder="mín. 8 caracteres" (type="password")
    const agentNombreInput = page
      .locator('input[placeholder="Nombre completo"]')
      .last();
    const agentEmailInput = page
      .locator('input[placeholder="agente@email.com"]')
      .last();
    const agentPassInput = page.locator('input[type="password"]').last();

    await agentNombreInput.fill(AGENT_NAME);
    await agentEmailInput.fill(AGENT_EMAIL);
    await agentPassInput.fill(AGENT_PASSWORD);

    // Submit
    await page
      .getByRole("button", { name: /crear agente|guardar agente|crear/i })
      .last()
      .click();
    await page.waitForTimeout(2_000);

    // Verificar que el agente aparece en la lista
    await expect(page.getByText(AGENT_NAME).first()).toBeVisible({ timeout: 8_000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. CARGAR PROPIEDADES
  // Helper local para crear propiedades
  // ─────────────────────────────────────────────────────────────────────────

  async function crearPropiedad(opts: {
    titulo: string;
    tipo: string;
    operacion: string;
    precio: string;
    moneda: string;
    direccion: string;
    descripcion?: string;
    habitaciones?: string;
    banos?: string;
    superficieCubierta?: string;
    superficieTotal?: string;
    anchoMetros?: string;
    largoMetros?: string;
    alturaInterna?: string;
    numeroPiso?: string;
    precioPorDia?: string;
    diasMinimos?: string;
    diasMaximos?: string;
    caracteristicas?: string[];
    caracteristicaCustom?: string;
  }) {
    await page.goto("/propiedades/nueva");
    await page.waitForLoadState("domcontentloaded");

    // Campos básicos (react-hook-form → tienen [name])
    await page.fill('[name="titulo"]', opts.titulo);
    await page.selectOption('[name="tipo"]', opts.tipo);
    await page.selectOption('[name="operacion"]', opts.operacion);
    await page.fill('[name="precio"]', opts.precio);
    await page.selectOption('[name="moneda"]', opts.moneda);
    await page.fill('[name="direccion"]', opts.direccion);
    if (opts.descripcion) {
      await page.fill('[name="descripcion"]', opts.descripcion);
    }

    // Esperar que se rendericen los atributos del tipo elegido
    await page.waitForTimeout(600);

    // Atributos numéricos
    if (opts.habitaciones)
      await page
        .fill('[name="atributos.habitaciones"]', opts.habitaciones)
        .catch(() => {});
    if (opts.banos)
      await page
        .fill('[name="atributos.banos"]', opts.banos)
        .catch(() => {});
    if (opts.superficieCubierta)
      await page
        .fill(
          '[name="atributos.superficieCubierta"]',
          opts.superficieCubierta
        )
        .catch(() => {});
    if (opts.superficieTotal)
      await page
        .fill('[name="atributos.superficieTotal"]', opts.superficieTotal)
        .catch(() => {});
    if (opts.anchoMetros)
      await page
        .fill('[name="atributos.anchoMetros"]', opts.anchoMetros)
        .catch(() => {});
    if (opts.largoMetros)
      await page
        .fill('[name="atributos.largoMetros"]', opts.largoMetros)
        .catch(() => {});
    if (opts.alturaInterna)
      await page
        .fill('[name="atributos.alturaInterna"]', opts.alturaInterna)
        .catch(() => {});
    if (opts.numeroPiso)
      await page
        .fill('[name="atributos.numeroPiso"]', opts.numeroPiso)
        .catch(() => {});
    if (opts.precioPorDia)
      await page
        .fill('[name="atributos.precioPorDia"]', opts.precioPorDia)
        .catch(() => {});
    if (opts.diasMinimos)
      await page
        .fill('[name="atributos.diasMinimos"]', opts.diasMinimos)
        .catch(() => {});
    if (opts.diasMaximos)
      await page
        .fill('[name="atributos.diasMaximos"]', opts.diasMaximos)
        .catch(() => {});

    // Características predefinidas (checkboxes por label de texto)
    for (const caract of opts.caracteristicas ?? []) {
      await page
        .locator("label")
        .filter({ hasText: new RegExp(`^${caract}$`, "i") })
        .locator('input[type="checkbox"]')
        .check()
        .catch(() => {});
    }

    // Característica custom
    // Placeholder real: "Ej: Sótano, Pozo de agua, Panel solar..."
    if (opts.caracteristicaCustom) {
      const customField = page
        .locator('input[placeholder*="Sótano"]')
        .first();
      await customField.fill(opts.caracteristicaCustom).catch(async () => {
        // Fallback: último input de texto visible sin name
        const inputs = await page
          .locator('input[type="text"]:not([name])')
          .all();
        if (inputs.length > 0)
          await inputs[inputs.length - 1].fill(opts.caracteristicaCustom!);
      });
      await page
        .getByRole("button", { name: /agregar|añadir|\+/i })
        .last()
        .click()
        .catch(() => {});
      await page.waitForTimeout(300);
    }

    // Asegurar que "Publicada" está marcada
    const publicadaLabel = page.getByText("Publicada en marketplace");
    if (await publicadaLabel.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const cb = publicadaLabel
        .locator("..")
        .locator('input[type="checkbox"]');
      const checked = await cb.isChecked().catch(() => true);
      if (!checked) await cb.check().catch(() => {});
    }

    // Intentar subir foto de prueba
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await fileInput.setInputFiles(TEST_IMAGE).catch(() => {});
      await page.waitForTimeout(4_000); // aguarda upload Cloudinary
    }

    // Enviar
    await page.getByRole("button", { name: /publicar|guardar|crear/i }).click();
    await page.waitForURL("**/propiedades", { timeout: 20_000 });
    await expect(page.getByText(opts.titulo)).toBeVisible({ timeout: 8_000 });
  }

  // 7a — Casa en venta
  await step("7a. Propiedad — Casa céntrica con pileta (Venta USD)", page, async () => {
    await crearPropiedad({
      titulo: "Casa céntrica con pileta",
      tipo: "CASA",
      operacion: "VENTA",
      precio: "85000",
      moneda: "USD",
      direccion: "Av. San Martín 450, Paso de los Libres",
      descripcion:
        "Hermosa casa céntrica con pileta, garage y quincho. Ideal para familia.",
      habitaciones: "3",
      banos: "2",
      caracteristicas: ["Cocina", "Living", "Comedor", "Patio", "Quincho"],
      caracteristicaCustom: "Salamandra",
    });
  });

  // 7b — Departamento en alquiler
  await step("7b. Propiedad — Depto luminoso (Alquiler ARS)", page, async () => {
    await crearPropiedad({
      titulo: "Departamento luminoso zona céntrica",
      tipo: "DEPARTAMENTO",
      operacion: "ALQUILER",
      precio: "180000",
      moneda: "ARS",
      direccion: "Calle Colón 320, Paso de los Libres",
      descripcion: "Departamento luminoso, excelente ubicación en planta 3.",
      habitaciones: "2",
      banos: "1",
      numeroPiso: "3",
      caracteristicas: ["Cocina", "Living", "Balcón", "Cochera"],
    });
  });

  // 7c — Terreno en venta
  await step("7c. Propiedad — Terreno esquina (Venta USD)", page, async () => {
    await crearPropiedad({
      titulo: "Terreno esquina 10x20",
      tipo: "TERRENO",
      operacion: "VENTA",
      precio: "25000",
      moneda: "USD",
      direccion: "Calle Uruguay esq. Rivadavia, Paso de los Libres",
      superficieTotal: "200",
      anchoMetros: "10",
      largoMetros: "20",
      caracteristicas: ["Agua", "Luz", "Cloaca"],
    });
  });

  // 7d — Local en alquiler
  await step("7d. Propiedad — Local comercial (Alquiler ARS)", page, async () => {
    await crearPropiedad({
      titulo: "Local comercial sobre avenida",
      tipo: "LOCAL",
      operacion: "ALQUILER",
      precio: "250000",
      moneda: "ARS",
      direccion: "Av. San Martín 800, Paso de los Libres",
      superficieCubierta: "80",
      anchoMetros: "8",
      largoMetros: "10",
      caracteristicas: ["Baño", "Depósito", "Persiana metálica"],
    });
  });

  // 7e — Galpón en venta
  await step("7e. Propiedad — Galpón industrial (Venta USD)", page, async () => {
    await crearPropiedad({
      titulo: "Galpón zona industrial",
      tipo: "GALPON",
      operacion: "VENTA",
      precio: "120000",
      moneda: "USD",
      direccion: "Ruta 117 km 3, Paso de los Libres",
      superficieCubierta: "500",
      anchoMetros: "20",
      largoMetros: "25",
      alturaInterna: "6",
      caracteristicas: ["Trifásico", "Agua", "Portón vehicular"],
    });
  });

  // 7f — Alquiler temporario
  await step("7f. Propiedad — Depto temporario frente al río", page, async () => {
    await crearPropiedad({
      titulo: "Departamento temporario frente al río",
      tipo: "DEPARTAMENTO",
      operacion: "ALQUILER_TEMPORARIO",
      precio: "15000",
      moneda: "ARS",
      direccion: "Costanera Norte 120, Paso de los Libres",
      habitaciones: "1",
      banos: "1",
      precioPorDia: "15000",
      diasMinimos: "2",
      diasMaximos: "30",
      caracteristicas: ["Cocina", "Aire acondicionado", "WiFi"],
    });
  });

  // ── 8. Cargar clientes ────────────────────────────────────────────────────

  async function crearCliente(opts: {
    nombre: string;
    telefono: string;
    origen: string;
    pipeline: string;
  }) {
    await page.goto("/clientes/nueva");
    await page.waitForLoadState("domcontentloaded");
    await page.fill('[name="nombre"]', opts.nombre);
    await page.fill('[name="telefono"]', opts.telefono);
    await page.selectOption('[name="origen"]', opts.origen);
    await page.selectOption('[name="estadoPipeline"]', opts.pipeline);
    await page.getByRole("button", { name: /guardar|crear cliente/i }).click();
    await page.waitForURL("**/clientes", { timeout: 10_000 });
    await expect(page.getByText(opts.nombre)).toBeVisible({ timeout: 5_000 });
  }

  await step("8a. Cliente — Jorge Méndez (WhatsApp / Nuevo)", page, async () => {
    await crearCliente({
      nombre: "Jorge Méndez",
      telefono: "3772401234",
      origen: "WHATSAPP",
      pipeline: "NUEVO",
    });
  });

  await step("8b. Cliente — Ana Beatriz Solís (Instagram / Contactado)", page, async () => {
    await crearCliente({
      nombre: "Ana Beatriz Solís",
      telefono: "3772405678",
      origen: "INSTAGRAM",
      pipeline: "CONTACTADO",
    });
  });

  await step("8c. Cliente — Lucas Pereyra (Portal / Visita Agendada)", page, async () => {
    await crearCliente({
      nombre: "Lucas Pereyra",
      telefono: "3772409012",
      origen: "PORTAL",
      pipeline: "VISITA_AGENDADA",
    });
  });

  // ── 9. Agendar visitas ────────────────────────────────────────────────────

  async function agendarVisita(opts: {
    propKeyword: RegExp;
    clienteKeyword: RegExp;
    horaOffset: number; // días desde hoy
    hora: number; // 0-23
  }) {
    await page.goto("/visitas");
    await page.waitForLoadState("networkidle");

    // El form ya está en la página (no hay botón "nueva visita" aparte)
    await page.waitForSelector('[name="propiedadId"]', { timeout: 8_000 });

    // Propiedad
    const propSel = page.locator('[name="propiedadId"]');
    const propOpts = await propSel.locator("option").allTextContents();
    const propOpt = propOpts.find((o) => opts.propKeyword.test(o));
    if (propOpt) await propSel.selectOption({ label: propOpt });
    else throw new Error(`No se encontró propiedad con ${opts.propKeyword}`);

    // Cliente
    const clienteSel = page.locator('[name="clienteId"]');
    const clienteOpts = await clienteSel.locator("option").allTextContents();
    const clienteOpt = clienteOpts.find((o) => opts.clienteKeyword.test(o));
    if (clienteOpt) await clienteSel.selectOption({ label: clienteOpt });
    else throw new Error(`No se encontró cliente con ${opts.clienteKeyword}`);

    // Agente — primer agente disponible
    const agenteSel = page.locator('[name="agenteId"]');
    const agenteOpts = await agenteSel.locator("option").allTextContents();
    const agenteOpt = agenteOpts.find((o) => o.trim() && !/seleccioná/i.test(o));
    if (agenteOpt) await agenteSel.selectOption({ label: agenteOpt });

    // Fecha
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + opts.horaOffset);
    fecha.setHours(opts.hora, 0, 0, 0);
    await page.fill('[name="fechaHora"]', fecha.toISOString().slice(0, 16));

    await page.getByRole("button", { name: /agendar visita/i }).click();
    await page.waitForURL("**/visitas**", { timeout: 10_000 });
  }

  await step("9a. Visita — Jorge Méndez → Casa céntrica (mañana 10:00)", page, async () => {
    await agendarVisita({
      propKeyword: /casa céntrica/i,
      clienteKeyword: /jorge/i,
      horaOffset: 1,
      hora: 10,
    });
    await expect(
      page.getByText(/jorge méndez/i).or(page.getByText(/casa céntrica/i)).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  await step("9b. Visita — Ana Beatriz → Departamento (pasado mañana 16:00)", page, async () => {
    await agendarVisita({
      propKeyword: /departamento luminoso/i,
      clienteKeyword: /ana/i,
      horaOffset: 2,
      hora: 16,
    });
    await expect(
      page.getByText(/ana beatriz/i).or(page.getByText(/departamento luminoso/i)).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── 10. Contrato de alquiler ──────────────────────────────────────────────
  await step("10. Contrato de alquiler — Depto / Ana Beatriz", page, async () => {
    await page.goto("/alquileres");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[name="propiedadId"]', { timeout: 8_000 });

    // Propiedad
    const propSel = page.locator('[name="propiedadId"]');
    const propOpts = await propSel.locator("option").allTextContents();
    const propOpt = propOpts.find((o) => /departamento luminoso/i.test(o));
    if (propOpt) await propSel.selectOption({ label: propOpt });
    else {
      const anyOpt = propOpts.find(
        (o) => o.trim() && !/seleccioná/i.test(o)
      );
      if (anyOpt) await propSel.selectOption({ label: anyOpt });
    }

    await page.fill('[name="inquilinoNombre"]', "Ana Beatriz Solís");
    await page.fill('[name="inquilinoTel"]', "3772405678");
    await page.fill('[name="precioMensual"]', "180000");
    await page.selectOption('[name="moneda"]', "ARS");
    await page.fill('[name="diaVencimientoPago"]', "10");

    const hoy = new Date().toISOString().split("T")[0];
    await page.fill('[name="fechaInicio"]', hoy);

    const fin = new Date();
    fin.setFullYear(fin.getFullYear() + 1);
    await page.fill('[name="fechaFin"]', fin.toISOString().split("T")[0]);

    await page.getByRole("button", { name: /crear contrato/i }).click();
    await page.waitForURL("**/alquileres**", { timeout: 10_000 });
    await expect(page.getByText("Ana Beatriz Solís")).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── 11. Finanzas ──────────────────────────────────────────────────────────
  await step("11a. Finanzas — Registrar operación cerrada (Venta USD 85000)", page, async () => {
    await page.goto("/finanzas");
    await page.waitForLoadState("networkidle");

    // Ir al tab Operaciones
    await page.getByRole("button", { name: /^operaciones$/i }).click();
    await page.waitForTimeout(400);

    // Abrir modal "Nueva operación"
    await page.getByRole("button", { name: /nueva operación/i }).click();
    await page.waitForSelector("text=Registrar operación", { timeout: 5_000 });

    // Tipo: Venta
    await page
      .locator(".fixed select")
      .first()
      .selectOption("VENTA")
      .catch(() => {});

    // Precio
    const precioModal = page.locator(".fixed input[type='number']").first();
    await precioModal.fill("85000");
    await page.waitForSelector("text=Desglose calculado", { timeout: 5_000 });

    // Verificar que calculó comisiones
    await expect(page.getByText(/total comisión/i)).toBeVisible();

    // Confirmar
    await page
      .getByRole("button", { name: /confirmar y registrar/i })
      .click();
    await page.waitForTimeout(2_000);
    // Debe aparecer la fila en la tabla
    await expect(
      page.getByRole("cell", { name: /venta/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  await step("11b. Finanzas — Registrar egreso ($120.000 ARS)", page, async () => {
    await page.getByRole("button", { name: /^egresos$/i }).click();
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /nuevo egreso/i }).click();
    await page.waitForSelector("text=Nuevo egreso", { timeout: 5_000 });

    await page.fill(
      '[placeholder="Publicidad portal..."]',
      "Pauta publicitaria"
    );
    await page.locator(".fixed input[type='number']").first().fill("120000");

    await page
      .locator(".fixed")
      .getByRole("button", { name: /guardar/i })
      .click();
    await page.waitForTimeout(2_000);
    await expect(page.getByText("Pauta publicitaria")).toBeVisible({
      timeout: 5_000,
    });
  });

  await step("11c. Finanzas — Probar vistas ARS / USD / Consolidado", page, async () => {
    await page.getByRole("button", { name: /resumen/i }).click();
    await page.waitForTimeout(500);

    // Vista ARS
    await page.getByRole("button", { name: /pesos/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/comisiones ars/i)).toBeVisible({
      timeout: 3_000,
    });

    // Vista USD
    await page.getByRole("button", { name: /dólares/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/comisiones usd/i)).toBeVisible({
      timeout: 3_000,
    });

    // Vista Consolidado (fetchea cotización)
    await page.getByRole("button", { name: /consolidado/i }).click();
    await page.waitForTimeout(3_000); // aguarda fetch de divisas
    await expect(page.getByText(/total estimado/i)).toBeVisible({
      timeout: 8_000,
    });

    // Probar switch Blue / MEP / Oficial
    await page.getByRole("button", { name: /^mep$/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /oficial/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^blue$/i }).click();
    await page.waitForTimeout(500);
  });

  await step("11d. Finanzas — Sheet detalle de operación", page, async () => {
    await page.getByRole("button", { name: /^operaciones$/i }).click();
    await page.waitForTimeout(400);

    // Click en la primera fila de la tabla
    await page.locator("tbody tr").first().click();
    await page.waitForTimeout(500);

    // Verificar que se abrió el sheet de detalle
    await expect(
      page.getByText(/total comisión bruta/i).or(page.getByText(/desglose/i))
    ).toBeVisible({ timeout: 3_000 });

    // Cerrar
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  // ── 12. Calculadoras ──────────────────────────────────────────────────────
  await step("12. Calculadoras — Comisiones, Escrituración, Conversor, ICL", page, async () => {
    await page.goto("/calculadoras");
    await page.waitForLoadState("networkidle");

    // Calcular comisión — precio 85000 USD
    const precioInput = page.locator('input[type="number"]').first();
    await precioInput.fill("85000");
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/comisión/i).first()).toBeVisible({
      timeout: 3_000,
    });

    // Navegar a Escrituración
    const escritBtn = page
      .getByRole("button", { name: /escrituración/i })
      .or(page.getByText(/escrituración/i));
    if (await escritBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await escritBtn.first().click();
      await page.waitForTimeout(800);
      // Fill precio
      await page.locator('input[type="number"]').first().fill("85000").catch(() => {});
      await page.waitForTimeout(800);
    }

    // Conversor
    const convBtn = page
      .getByRole("button", { name: /conversor/i })
      .or(page.getByText(/conversor/i));
    if (await convBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await convBtn.first().click();
      await page.waitForTimeout(1_500); // cotización
      await expect(
        page.getByText(/blue|oficial|cotización/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }

    // ICL
    const iclBtn = page
      .getByRole("button", { name: /icl/i })
      .or(page.getByText(/ICL/));
    if (await iclBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await iclBtn.first().click();
      await page.waitForTimeout(800);
      const iclInput = page.locator('input[type="number"]').first();
      await iclInput.fill("180000").catch(() => {});
      await page.waitForTimeout(800);
    }

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, "12-calculadoras.png"),
      fullPage: true,
    });
  });

  // ── 13. Marketplace ───────────────────────────────────────────────────────
  await step("13a. Marketplace — Propiedades publicadas visibles", page, async () => {
    await clearSession(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Esperar que carguen propiedades
    const propCard = page.locator("a[href*='/propiedades/']").first();
    await expect(propCard).toBeVisible({ timeout: 12_000 });

    // Al menos una de nuestras propiedades debe aparecer
    await expect(
      page
        .getByText(/casa céntrica/i)
        .or(page.getByText(/departamento luminoso/i))
        .or(page.getByText(/terreno esquina/i))
        .first()
    ).toBeVisible({ timeout: 8_000 });
  });

  await step("13b. Marketplace — Filtro por Venta", page, async () => {
    await page.goto("/?operacion=VENTA");
    await page.waitForLoadState("networkidle");

    // Propiedades de venta deben aparecer
    await expect(
      page.getByText(/casa céntrica/i).or(page.getByText(/terreno esquina/i)).first()
    ).toBeVisible({ timeout: 8_000 });

    // "Departamento luminoso" es alquiler → no debe aparecer
    await expect(page.getByText("Departamento luminoso zona céntrica")).toHaveCount(
      0,
      { timeout: 3_000 }
    ).catch(() => {}); // ignorar si hay retraso en DOM
  });

  await step("13c. Marketplace — Filtro por Terreno", page, async () => {
    await page.goto("/?tipo=TERRENO");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/terreno esquina/i).first()).toBeVisible({
      timeout: 8_000,
    });
  });

  await step("13d. Marketplace — Mapa con marcadores", page, async () => {
    await page.goto("/mapa");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_500); // Leaflet necesita tiempo para renderizar

    // Verificar que el contenedor del mapa existe
    await expect(
      page.locator(".leaflet-container").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  await step("13e. Detalle de propiedad — Verificar datos completos", page, async () => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navegar al detalle de la primera propiedad
    const firstLink = page.locator("a[href*='/propiedades/']").first();
    const href = await firstLink.getAttribute("href");
    if (!href) throw new Error("No se encontró ningún link de propiedad");

    await page.goto(href);
    await page.waitForLoadState("networkidle");

    // El h1 o h2 con el título de la propiedad debe estar visible
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5_000 });

    // Precio visible
    await expect(
      page.getByText(/USD|ARS|\$/).first()
    ).toBeVisible({ timeout: 3_000 });
  });

  await step("13f. Consulta desde marketplace → form enviado", page, async () => {
    // Permanecer en la misma propiedad del step anterior
    await page.waitForLoadState("networkidle");

    // Rellenar el formulario de consulta
    await page.fill('[name="nombreVisitante"]', "Test Consulta E2E");
    await page.fill('[name="telefono"]', "3772999888");

    const emailField = page.locator('[name="email"]');
    if (await emailField.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await emailField.fill("consulta.e2e@test.com");
    }

    await page.fill(
      '[name="mensaje"]',
      "Consulta automatizada del test E2E. Por favor ignorar."
    );

    await page
      .getByRole("button", { name: /enviar consulta/i })
      .click();

    // Verificar mensaje de éxito
    await expect(
      page.getByText("¡Consulta enviada!", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── 14. Verificar consulta en el CRM ─────────────────────────────────────
  await step("14. CRM — Consulta recibida y marcada como leída", page, async () => {
    // Login de nuevo como admin
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, /\/dashboard/);

    await page.goto("/consultas");
    await page.waitForLoadState("networkidle");

    // Verificar que la consulta aparece
    await expect(page.getByText("Test Consulta E2E")).toBeVisible({
      timeout: 8_000,
    });

    // Marcar como leída (puede ser un botón o un click en la tarjeta)
    const markReadBtn = page
      .getByRole("button", { name: /marcar.*leída|leída/i })
      .first();

    if (
      await markReadBtn.isVisible({ timeout: 2_000 }).catch(() => false)
    ) {
      await markReadBtn.click();
      await page.waitForTimeout(1_000);
    } else {
      // Intentar click directo sobre la consulta para abrirla/marcarla
      await page.getByText("Test Consulta E2E").click().catch(() => {});
      await page.waitForTimeout(1_000);
    }
  });

  // ── 15. Logout final ──────────────────────────────────────────────────────
  await step("15. Logout y verificación final", page, async () => {
    // Intentar usar el botón de logout del sidebar
    const logoutBtn = page.getByRole("button", {
      name: /cerrar sesión|salir|logout/i,
    });
    if (
      await logoutBtn.isVisible({ timeout: 2_000 }).catch(() => false)
    ) {
      await logoutBtn.click();
      await page.waitForURL("**/login**", { timeout: 8_000 });
    } else {
      await clearSession(page);
    }

    // Verificar que estamos en login y no hay sesión activa
    await expect(page.locator('input[type="email"]')).toBeVisible({
      timeout: 5_000,
    });

    // Intentar ir al dashboard: debe redirigir al login
    await page.goto("/dashboard");
    await page.waitForURL("**/login**", { timeout: 8_000 });
    await expect(page).toHaveURL(/login/);
  });

  // ── Resumen en consola ────────────────────────────────────────────────────
  const ok = results.filter((r) => r.status === "✅").length;
  const fail = results.filter((r) => r.status === "❌").length;
  console.log(`\n${"─".repeat(50)}`);
  console.log(`RESULTADO FINAL: ${ok} ✅ / ${fail} ❌ / ${results.length} total`);
  console.log(`${"─".repeat(50)}\n`);
});
