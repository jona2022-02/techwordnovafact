// Script para optimizar la velocidad de consultas en procesar/route.ts
// Ejecuta: node optimize-dte-speed.js

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app', 'api', 'procesar', 'route.ts');
let code = fs.readFileSync(file, 'utf8');

code = code
  // Lote y concurrencia
  .replace(/const LOTE_SIZE = \d+;[^\n]*\n/, 'const LOTE_SIZE = 25; // Procesar de 25 en 25 (más rápido)\n')
  .replace(/const DELAY_ENTRE_LOTES = \d+;[^\n]*\n/, 'const DELAY_ENTRE_LOTES = 500; // 0.5 segundos entre lotes (más rápido)\n')
  .replace(/const CONCURRENCIA_POR_LOTE = \d+;[^\n]*\n/, 'const CONCURRENCIA_POR_LOTE = 6; // 6 páginas simultáneas por lote (más rápido)\n')
  // Pausa entre consultas
  .replace(/await page\.waitForTimeout\(300\);/g, 'await page.waitForTimeout(100);')
  // Playwright timeouts
  .replace(/page\.setDefaultTimeout\(12000\);/g, 'page.setDefaultTimeout(7000);')
  .replace(/page\.setDefaultNavigationTimeout\(12000\);/g, 'page.setDefaultNavigationTimeout(7000);')
  // Selectores y navegación
  .replace(/waitForSelector\('text=\/Estado\s\+del\\\\s\+documento\/i', \{ timeout: 4000 \}\)/g, "waitForSelector('text=/Estado\\s+del\\s+documento/i', { timeout: 2500 })")
  .replace(/waitForSelector\('text=\/Estado\s\+del\\\\s\+documento\/i', \{ timeout: 3000 \}\)/g, "waitForSelector('text=/Estado\\s+del\\s+documento/i', { timeout: 1800 })")
  .replace(/await page\.goto\(([^,]+), \{ waitUntil: 'domcontentloaded', timeout: 12000 \}\);/g, 'await page.goto($1, { waitUntil: \'domcontentloaded\', timeout: 7000 });')
  // Clicks
  .replace(/timeout: 2500/g, 'timeout: 1200')
  .replace(/timeout: 2000/g, 'timeout: 900')
  // LoadState
  .replace(/await page\.waitForLoadState\('networkidle', \{ timeout: 5000 \}\)\.catch\(\(\) => \{\}\);/g, "await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});");

fs.writeFileSync(file, code, 'utf8');
console.log('✔ Optimizaciones aplicadas a app/api/procesar/route.ts');
