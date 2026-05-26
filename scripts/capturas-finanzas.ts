import { chromium, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = "http://localhost:3000";
const OUT = path.join(process.cwd(), "capturas");

let n = 0;
async function shot(page: Page, nombre: string) {
  const num = String(++n).padStart(2, "0");
  const file = path.join(OUT, `fin_${num}_${nombre}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ✅ fin_${num}_${nombre}.png`);
}

async function irATab(page: Page, tab: "dashboard" | "operaciones" | "egresos") {
  // Recargar la página para evitar estados corruptos de React
  await page.goto(`${BASE}/finanzas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  if (tab !== "dashboard") {
    const label = tab === "operaciones" ? "Operaciones" : "Egresos";
    await page.getByRole("button", { name: label, exact: true }).first().click();
    await page.waitForTimeout(800);
  }
}

async function clickMoneda(page: Page, key: "Pesos" | "Dólares" | "Consolidado") {
  // Los botones de moneda tienen emoji + texto: "🇦🇷 Pesos", "🇺🇸 Dólares", "📊 Consolidado"
  await page.getByRole("button", { name: key, exact: false }).first().click();
  await page.waitForTimeout(900);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  });

  console.log("\n💰 Capturando módulo Finanzas completo\n");

  // ─── Login como ADMIN ───────────────────────────────────────────────────────
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "admin@demo.com");
  await page.fill('input[type="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  console.log("  🔐 Logueado como Admin\n");

  // ─── DASHBOARD — vista ARS ──────────────────────────────────────────────────
  await page.goto(`${BASE}/finanzas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  console.log("📊 Dashboard principal:");
  await shot(page, "dashboard_ARS");

  // Scroll para ver los gráficos de abajo
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await shot(page, "dashboard_ARS_graficos");

  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(500);
  await shot(page, "dashboard_ARS_ranking_y_detalle");

  // ─── DASHBOARD — vista USD ──────────────────────────────────────────────────
  console.log("\n💵 Vista USD:");
  await page.evaluate(() => window.scrollTo(0, 0));
  await clickMoneda(page, "Dólares");
  await shot(page, "dashboard_USD");

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(400);
  await shot(page, "dashboard_USD_graficos");

  // ─── DASHBOARD — vista CONSOLIDADO ─────────────────────────────────────────
  console.log("\n🔄 Vista Consolidado:");
  await page.evaluate(() => window.scrollTo(0, 0));
  await clickMoneda(page, "Consolidado");
  await page.waitForTimeout(3500); // esperar fetch de cotizaciones
  await shot(page, "dashboard_consolidado");

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(400);
  await shot(page, "dashboard_consolidado_graficos");

  // Volver a Pesos
  await page.evaluate(() => window.scrollTo(0, 0));
  await clickMoneda(page, "Pesos");
  await page.waitForTimeout(400);

  // ─── TAB OPERACIONES ────────────────────────────────────────────────────────
  console.log("\n📋 Tab Operaciones:");
  await irATab(page, "operaciones");
  await shot(page, "operaciones_lista");
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(400);
  await shot(page, "operaciones_lista_detalle");

  // Modal "Nueva operación" — nueva carga limpia
  await irATab(page, "operaciones");
  const btnNuevaOp = page.getByRole("button", { name: /nueva op|registrar op/i }).first();
  if (await btnNuevaOp.isVisible().catch(() => false)) {
    await btnNuevaOp.click();
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "operaciones_modal_nueva");
  }

  // ─── TAB EGRESOS ────────────────────────────────────────────────────────────
  console.log("\n💸 Tab Egresos:");
  await irATab(page, "egresos");
  await shot(page, "egresos_lista");
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(400);
  await shot(page, "egresos_lista_detalle");

  // Modal "Nuevo egreso" — nueva carga limpia
  await irATab(page, "egresos");
  const btnNuevoEgreso = page.getByRole("button", { name: /nuevo egreso|registrar egreso/i }).first();
  if (await btnNuevoEgreso.isVisible().catch(() => false)) {
    await btnNuevoEgreso.click();
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "egresos_modal_nuevo");
  }

  // ─── VISTA FINAL — dashboard completo ────────────────────────────────────────
  console.log("\n🏁 Vista final:");
  await irATab(page, "dashboard");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await shot(page, "dashboard_final_panoramica");

  await browser.close();

  const archivos = fs.readdirSync(OUT).filter((f) => f.startsWith("fin_") && f.endsWith(".png"));
  console.log(`\n✨ ${archivos.length} capturas de finanzas guardadas en ./capturas/\n`);
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message);
  process.exit(1);
});
