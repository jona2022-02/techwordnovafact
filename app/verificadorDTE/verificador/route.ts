// app/verificadorDTE/verificador/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos para procesamiento por lotes

import { NextRequest, NextResponse } from 'next/server';
import {
  chromium as pwChromium,
  type Browser,
  type BrowserContext,
} from 'playwright-core';
import chromium from '@sparticuz/chromium';
import * as cheerio from 'cheerio';
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import { put } from '@vercel/blob';
import { authenticate } from '@/lib/apiSecurity';
import { optimizedAuditService } from '@/lib/optimizedAuditService';
import { UserService } from '@/lib/userService';

// Importar funciones del procesador principal
const MAX_ENLACES_PERMITIDOS = 150; // Límite máximo
const LOTE_SIZE = 10; // Procesar de 10 en 10
const DELAY_ENTRE_LOTES = 2000; // 2 segundos entre lotes
const CONCURRENCIA_POR_LOTE = 2; // 2 páginas simultáneas por lote

/* =============== Utilidades (reutilizadas) =============== */
function limpiar(s: string) {
  return (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizarEstado(texto: string): string {
  const t = (texto || '').toUpperCase();
  if (t.includes('ANULAD')) return 'ANULADO';
  if (t.includes('RECHAZAD')) return 'RECHAZADO';
  if (t.includes('TRANSMITIDO') || t.includes('REGISTRADO') || t.includes('SATISFACTORIAMENTE')) return 'EMITIDO';
  if (t.includes('INVALIDAD')) return 'INVALIDADO';
  if (t.includes('NO ENCONTRADO') || t.includes('NO EXISTE') || t.includes('NO SE ENCONTRÓ')) return 'NO ENCONTRADO';
  return 'DESCONOCIDO';
}

function normalizarTipoDte(texto: string): 'FACTURA' | 'COMPROBANTE DE CRÉDITO FISCAL' | 'NOTA DE CRÉDITO' | 'SIN_TIPO' {
  const t = (texto || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
  if (t.includes('FACTURA')) return 'FACTURA';
  if (t.includes('COMPROBANTE') && t.includes('CREDITO') && t.includes('FISCAL')) return 'COMPROBANTE DE CRÉDITO FISCAL';
  if (t.includes('NOTA') && t.includes('CREDITO')) return 'NOTA DE CRÉDITO';
  return 'SIN_TIPO';
}

function extraerParametros(url: string) {
  try {
    const u = new URL(url);
    return {
      base: `${u.protocol}//${u.host}${u.pathname}`,
      host: u.host || '',
      ambiente: u.searchParams.get('ambiente') || '',
      codGen: u.searchParams.get('codGen') || '',
      fechaEmi: u.searchParams.get('fechaEmi') || '',
    };
  } catch {
    return { base: '', host: '', ambiente: '', codGen: '', fechaEmi: '' };
  }
}

function parsearLinksDesdeCSV(contenido: string): string[] {
  const lines = contenido.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const urlRegex = /(https?:\/\/[^\s,;]+consultaPublica[^\s,;]*)/i;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(urlRegex);
    if (m) out.push(m[1]);
    else if (i === 0 && !lines[i].toLowerCase().includes('http')) continue;
  }
  return out;
}

function sanitizarUrl(u: string) {
  u = (u || '').trim().replace(/[,\.;\s]+$/g, '');
  const { base, ambiente, codGen, fechaEmi } = extraerParametros(u);
  if (!base) return u;
  const limpio = new URLSearchParams();
  if (ambiente) limpio.set('ambiente', ambiente);
  if (codGen) limpio.set('codGen', codGen);
  if (fechaEmi) limpio.set('fechaEmi', fechaEmi);
  return `${base}?${limpio.toString()}`;
}

// Función para parsear HTML y extraer datos
function paresDesdeHtml(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const pares: Record<string, string> = {};

  $('tr').toArray().forEach((tr) => {
    const tds = $(tr).find('td').toArray();
    if (tds.length >= 2) {
      const k = limpiar($(tds[0]).text()).replace(/:$/, '');
      const v = limpiar($(tds[1]).text());
      if (k && v) pares[k] = v;
    }
  });

  return pares;
}

function mapearDetalle(pares: Record<string, string>) {
  const get = (label: string) => pares[label] || '';
  const estadoRaw = get('Estado del documento') || get('Estado del Documento');
  const tipoDte = get('Tipo de DTE');

  return {
    estado: normalizarEstado(estadoRaw),
    estadoRaw,
    tipoDte,
    tipoDteNorm: normalizarTipoDte(tipoDte),
    descripcionEstado: get('Descripción del Estado') || get('Descripcion del Estado'),
    fechaHoraGeneracion: get('Fecha y Hora de Generación') || get('Fecha y Hora de Generacion'),
    fechaHoraProcesamiento: get('Fecha y Hora de Procesamiento'),
    codigoGeneracion: get('Código de Generación') || get('Codigo de Generacion'),
    selloRecepcion: get('Sello de Recepción') || get('Sello de Recepcion'),
    numeroControl: get('Número de Control') || get('Numero de Control'),
    montoTotal: get('Monto Total'),
  };
}

// Lanzar browser optimizado
async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL === '1') {
    const exePath = await chromium.executablePath();
    return pwChromium.launch({
      headless: true,
      executablePath: exePath || undefined,
      args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage', '--disable-extensions'],
    });
  }
  try {
    return await pwChromium.launch({ headless: true, channel: 'msedge' });
  } catch {
    return await pwChromium.launch({ headless: true, channel: 'chrome' });
  }
}

// Optimizar página para velocidad
async function optimizarPagina(page: any) {
  await page.route('**/*', (route: any) => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
      return route.abort();
    }
    return route.continue();
  });
  
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-SV,es;q=0.9,en;q=0.8' });
  await page.setViewportSize({ width: 1280, height: 900 });
  page.setDefaultTimeout(10000); // 10 segundos timeout
  page.setDefaultNavigationTimeout(10000);
}

// Consultar un DTE individual
async function consultarDTE(page: any, rawUrl: string) {
  const url = sanitizarUrl(rawUrl);
  const { host, ambiente, codGen, fechaEmi } = extraerParametros(url);
  const t0 = Date.now();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Intentar hacer click en "Realizar Búsqueda"
    const intentos = [
      async () => page.getByRole('button', { name: /Realizar Búsqueda/i }).click({ timeout: 2000 }),
      async () => page.click('text=Realizar Búsqueda', { timeout: 2000 }),
      async () => page.click('button:has-text("Realizar Búsqueda")', { timeout: 2000 }),
      async () => page.click('input[type="button"][value*="Realizar"]', { timeout: 2000 }),
    ];

    let hizoClick = false;
    for (const fn of intentos) { 
      try { 
        await fn(); 
        hizoClick = true; 
        break; 
      } catch {} 
    }

    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    
    const html = await page.content();
    const pares = paresDesdeHtml(html);
    const detalle = mapearDetalle(pares);

    const dur = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`✔ ${codGen || ''} -> ${detalle.estado} (${host}) en ${dur}s`);

    return {
      url,
      linkVisita: url,
      host, ambiente, codGen, fechaEmi,
      ...detalle,
      error: '',
      procesadoEn: dur + 's'
    };
  } catch (e: any) {
    console.warn(`✖ Error con ${codGen || url}: ${e?.message || e}`);
    return {
      url: rawUrl,
      linkVisita: sanitizarUrl(rawUrl),
      host, ambiente, codGen, fechaEmi,
      estado: 'ERROR',
      estadoRaw: '',
      tipoDte: '',
      tipoDteNorm: 'SIN_TIPO',
      error: e?.message || String(e),
      procesadoEn: ((Date.now() - t0) / 1000).toFixed(2) + 's'
    };
  }
}

// Procesar un lote de enlaces
async function procesarLote(ctx: BrowserContext, lote: string[], numerolote: number) {
  console.log(`📦 Procesando lote ${numerolote} (${lote.length} enlaces)`);
  const resultados: any[] = [];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(CONCURRENCIA_POR_LOTE, lote.length); i++) {
    workers.push((async () => {
      const page = await ctx.newPage();
      await optimizarPagina(page);
      
      // Procesar URLs asignadas a este worker
      const urlsWorker = lote.filter((_, index) => index % CONCURRENCIA_POR_LOTE === i);
      
      for (const url of urlsWorker) {
        const resultado = await consultarDTE(page, url);
        resultados.push(resultado);
        
        // Pequeña pausa entre consultas
        await page.waitForTimeout(500);
      }
      
      await page.close();
    })());
  }

  await Promise.all(workers);
  return resultados;
}

// Función principal para procesar por lotes
async function procesarEnlacesPorLotes(ctx: BrowserContext, links: string[]) {
  const todosResultados: any[] = [];
  const lotes = [];
  
  // Dividir en lotes
  for (let i = 0; i < links.length; i += LOTE_SIZE) {
    lotes.push(links.slice(i, i + LOTE_SIZE));
  }

  console.log(`🚀 Procesando ${links.length} enlaces en ${lotes.length} lotes de máximo ${LOTE_SIZE} cada uno`);

  // Procesar cada lote secuencialmente
  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i];
    const resultados = await procesarLote(ctx, lote, i + 1);
    todosResultados.push(...resultados);
    
    // Pausa entre lotes para no saturar el servidor
    if (i < lotes.length - 1) {
      console.log(`⏸️ Pausa de ${DELAY_ENTRE_LOTES}ms antes del siguiente lote...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_ENTRE_LOTES));
    }
  }

  return todosResultados;
}

/* =============== Handler Principal =============== */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userInfo: { uid: string; email?: string } | undefined;

  try {
    const authResult = await authenticate(req);
    if (authResult.success && authResult.user) {
      userInfo = {
        uid: authResult.user.uid,
        email: authResult.user.email
      };
    }
  } catch (error) {
    console.warn('Authentication failed, continuing without user info');
  }

  const formData = await req.formData();

  try {
    const archivos = formData.getAll('files') as File[];
    const unico = formData.get('file') as File | null;
    
    if ((!archivos || archivos.length === 0) && !unico) {
      return new Response('No se proporcionaron archivos CSV.', { status: 400 });
    }
    
    if (unico) archivos.push(unico);

    // Extraer enlaces de todos los archivos CSV
    const setLinks = new Set<string>();
    for (const f of archivos) {
      const buf = Buffer.from(await f.arrayBuffer());
      const contenido = buf.toString('utf8');
      parsearLinksDesdeCSV(contenido).forEach((u) => setLinks.add(sanitizarUrl(u)));
    }
    
    const links = Array.from(setLinks).filter(Boolean);
    
    if (!links.length) {
      return new Response('No se encontraron URLs válidas en los archivos CSV.', { status: 400 });
    }

    // Aplicar límite de 150 enlaces
    if (links.length > MAX_ENLACES_PERMITIDOS) {
      return new Response(`Demasiados enlaces. Máximo permitido: ${MAX_ENLACES_PERMITIDOS}, encontrados: ${links.length}`, { status: 400 });
    }

    console.log(`📊 Iniciando procesamiento de ${links.length} enlaces por lotes`);
    
    let browser: Browser | null = null;
    let resultados: any[] = [];

    try {
      browser = await launchBrowser();
      const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 NovaFactVerificador/2.0',
      });

      resultados = await procesarEnlacesPorLotes(ctx, links);
      await ctx.close();
    } finally {
      if (browser) await browser.close();
    }

    // Crear Excel con resultados
    const wb = XLSX.utils.book_new();
    const wsAll = XLSX.utils.json_to_sheet(resultados);
    XLSX.utils.book_append_sheet(wb, wsAll, 'Todos los DTEs');

    // Crear hojas por estado
    const estados = ['EMITIDO', 'RECHAZADO', 'ANULADO', 'INVALIDADO', 'ERROR'];
    for (const estado of estados) {
      const filtrados = resultados.filter(r => r?.estado === estado);
      if (filtrados.length > 0) {
        const ws = XLSX.utils.json_to_sheet(filtrados);
        XLSX.utils.book_append_sheet(wb, ws, estado);
      }
    }

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const filename = `verificacion_dte_lotes_${Date.now()}.xlsx`;
    
    const payloadBase = {
      filename,
      total: resultados.length,
      totalOriginal: links.length,
      procesadoPorLotes: true,
      loteSize: LOTE_SIZE,
      tiempoTotal: ((Date.now() - startTime) / 1000).toFixed(2) + 's',
      resultados,
    };

    // Subir a Blob o devolver base64
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      const { url } = await put(filename, excelBuffer, {
        access: 'public',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        token: blobToken,
      });
      return NextResponse.json({ ...payloadBase, downloadUrl: url });
    } else {
      const excelBase64 = Buffer.from(excelBuffer).toString('base64');
      return NextResponse.json({ ...payloadBase, excelBase64 });
    }

  } catch (error) {
    console.error('Error en verificador por lotes:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
}