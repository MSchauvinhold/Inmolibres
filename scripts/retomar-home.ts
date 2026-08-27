import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const OUT = path.join(process.cwd(), "capturas-presentacion");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });

  // Scroll progresivo para triggerear lazy load de imágenes
  for (const y of [400, 800, 1200, 1600, 2000]) {
    await page.evaluate((pos) => window.scrollTo({ top: pos, behavior: "instant" }), y);
    await page.waitForTimeout(800);
  }
  // Esperar que la imagen de portada de la propiedad cargue
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return imgs.some(img => img.complete && img.naturalWidth > 100);
  }, { timeout: 12000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(1500);

  const file = path.join(OUT, "01_marketplace_home.png");
  await page.screenshot({ path: file, fullPage: false });
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`✅ home capturado: ${kb}KB`);

  // También capturar con fullPage para tener la versión completa
  const file2 = path.join(OUT, "01_marketplace_home_full.png");
  await page.screenshot({ path: file2, fullPage: true });
  const kb2 = Math.round(fs.statSync(file2).size / 1024);
  console.log(`✅ home full: ${kb2}KB`);

  await browser.close();
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
