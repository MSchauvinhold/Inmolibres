import { chromium, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = "http://localhost:3000";
const OUT = path.join(process.cwd(), "capturas");

let contador = 0;

async function shot(page: Page, nombre: string) {
  const num = String(++contador).padStart(2, "0");
  const file = path.join(OUT, `${num}_${nombre}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ✅ ${num}_${nombre}.png`);
}

async function ir(page: Page, ruta: string, espera = 1500) {
  await page.goto(`${BASE}${ruta}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(espera);
}

async function login(ctx: BrowserContext, email: string, pass: string, label = ""): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 25000 });
  } catch {
    // Capturar estado actual para debug
    const debugFile = path.join(OUT, `DEBUG_login_fail_${label || email.split("@")[0]}.png`);
    await page.screenshot({ path: debugFile, fullPage: true });
    const url = page.url();
    const bodyText = await page.textContent("body").catch(() => "");
    throw new Error(`Login fallido para ${email} — URL: ${url}\nPágina: ${bodyText?.slice(0, 200)}`);
  }

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  return page;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const vp = { width: 1440, height: 900 };

  console.log("\n📸 InmoLibres — capturando todos los módulos\n");

  // ═══════════════════════════════════════════════════════════
  // 1. PÁGINAS PÚBLICAS
  // ═══════════════════════════════════════════════════════════
  console.log("🌐  Páginas públicas");
  {
    const ctx = await browser.newContext({ viewport: vp, locale: "es-AR" });
    const page = await ctx.newPage();

    await ir(page, "/"); await shot(page, "marketplace_home");

    // Intentar capturar detalle de propiedad desde el marketplace
    const links = await page.$$eval(
      'a[href*="/propiedades/"]',
      (els) => [...new Set(els.map((e) => (e as HTMLAnchorElement).href))].slice(0, 1)
    );
    if (links.length) {
      await page.goto(links[0], { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      await shot(page, "marketplace_detalle_propiedad");
    }

    await ir(page, "/mapa", 3000); await shot(page, "mapa_propiedades");
    await ir(page, "/login"); await shot(page, "login");
    await ir(page, "/suspendido"); await shot(page, "suspendido");

    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 2. SUPERADMIN
  // ═══════════════════════════════════════════════════════════
  console.log("\n🔐  SuperAdmin (mateo_schauvinhold@hotmail.com)");
  {
    const ctx = await browser.newContext({ viewport: vp, locale: "es-AR" });
    const page = await login(ctx, "mateo_schauvinhold@hotmail.com", "Kaisito40261943@");

    await shot(page, "superadmin_dashboard");
    await ir(page, "/admin"); await shot(page, "superadmin_panel");
    await ir(page, "/admin/inmobiliarias"); await shot(page, "superadmin_inmobiliarias");
    await ir(page, "/admin/particulares"); await shot(page, "superadmin_particulares");
    await ir(page, "/admin/consultas-kai"); await shot(page, "superadmin_consultas_kai");

    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 3. ADMIN DE INMOBILIARIA
  // ═══════════════════════════════════════════════════════════
  console.log("\n🏢  Admin de inmobiliaria (admin@demo.com)");
  {
    const ctx = await browser.newContext({ viewport: vp, locale: "es-AR" });
    try {
      const page = await login(ctx, "admin@demo.com", "demo1234", "admin");

      await shot(page, "admin_dashboard");
      await ir(page, "/propiedades"); await shot(page, "admin_propiedades");
      await ir(page, "/propiedades/nueva"); await shot(page, "admin_propiedades_nueva");
      await ir(page, "/clientes"); await shot(page, "admin_clientes");
      await ir(page, "/clientes/nueva"); await shot(page, "admin_clientes_nueva");
      await ir(page, "/visitas"); await shot(page, "admin_visitas");
      await ir(page, "/alquileres"); await shot(page, "admin_alquileres");
      await ir(page, "/finanzas"); await shot(page, "admin_finanzas");
      await ir(page, "/calculadoras"); await shot(page, "admin_calculadoras");
      await ir(page, "/consultas"); await shot(page, "admin_consultas");
      await ir(page, "/contactos"); await shot(page, "admin_contactos");
      await ir(page, "/configuracion"); await shot(page, "admin_configuracion");
    } catch (e: any) {
      console.log(`  ⚠️  Skipped: ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 4. AGENTE
  // ═══════════════════════════════════════════════════════════
  console.log("\n👤  Agente (agente@demo.com)");
  {
    const ctx = await browser.newContext({ viewport: vp, locale: "es-AR" });
    try {
      const page = await login(ctx, "agente@demo.com", "agente123", "agente");

      await shot(page, "agente_dashboard");
      await ir(page, "/propiedades"); await shot(page, "agente_propiedades");
      await ir(page, "/clientes"); await shot(page, "agente_clientes");
      await ir(page, "/visitas"); await shot(page, "agente_visitas");
      await ir(page, "/alquileres"); await shot(page, "agente_alquileres");
      await ir(page, "/consultas"); await shot(page, "agente_consultas");
      await ir(page, "/calculadoras"); await shot(page, "agente_calculadoras");
      await ir(page, "/configuracion"); await shot(page, "agente_configuracion");
    } catch (e: any) {
      console.log(`  ⚠️  Skipped: ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 5. PARTICULAR
  // ═══════════════════════════════════════════════════════════
  console.log("\n🏠  Particular");
  {
    const ctx = await browser.newContext({ viewport: vp, locale: "es-AR" });
    const page = await ctx.newPage();
    await ir(page, "/particular"); await shot(page, "particular_panel");
    await ctx.close();
  }

  await browser.close();

  const total = fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).length;
  console.log(`\n✨ Completado — ${total} capturas en ./capturas/\n`);
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message);
  process.exit(1);
});
