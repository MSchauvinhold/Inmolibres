/**
 * exportar-pdf.ts
 * Convierte presentacion-inmolibres.html a PDF usando Playwright.
 * Ejecutar: npx tsx scripts/exportar-pdf.ts
 */
import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

async function main() {
  const htmlFile = path.join(process.cwd(), "presentacion-inmolibres.html");
  const pdfFile  = path.join(process.cwd(), "presentacion-inmolibres.pdf");

  if (!fs.existsSync(htmlFile)) {
    throw new Error(`No se encontró ${htmlFile}. Ejecutá primero: npx tsx scripts/generar-presentacion.ts`);
  }

  console.log("🖨️  Generando PDF...");
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Cargar el HTML como archivo local (base64 images funcionan sin servidor)
  const fileUrl = `file:///${htmlFile.replace(/\\/g, "/")}`;
  await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 60000 });

  // Esperar que las fuentes de Google Fonts carguen
  await page.waitForTimeout(4000);

  // Disparar el observer manualmente (scroll reveal) para que todo esté visible
  await page.evaluate(() => {
    document.querySelectorAll(".fi").forEach(el => el.classList.add("vis"));
  });
  await page.waitForTimeout(500);

  await page.pdf({
    path: pdfFile,
    format: "A4",
    printBackground: true,     // preserva fondos oscuros
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    preferCSSPageSize: false,
  });

  await browser.close();

  const sizeMB = (fs.statSync(pdfFile).size / 1024 / 1024).toFixed(2);
  console.log(`\n✅ PDF generado: ${pdfFile}`);
  console.log(`   Tamaño: ${sizeMB} MB`);
  console.log(`   Podés abrirlo con cualquier visor de PDF o enviarlo por email.\n`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
