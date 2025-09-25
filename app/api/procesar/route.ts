// app/api/procesar/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Aumentado para procesamiento por lotes

import { NextRequest, NextResponse } from 'next/server';
import {
  chromium as pwChromium,
  type Browser,
  type Page,
  type BrowserContext,
  type Frame,
} from 'playwright-core';
import chromium from '@sparticuz/chromium';
import * as cheerio from 'cheerio';
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import { put } from '@vercel/blob';
import type { Element as DomElement, AnyNode } from 'domhandler';
import { authenticate } from '@/lib/apiSecurity';
import { optimizedAuditService } from '@/lib/optimizedAuditService';
import { UserService } from '@/lib/userService';

/* =============== Utilidades =============== */

function limpiar(s: string) {
  return (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}
function sinAcentos(s: string) {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
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
  const t = sinAcentos((texto || '').toUpperCase());
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

/* =============== Parsing HTML =============== */

function paresDesdeHtml(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const pares: Record<string, string> = {};

  $('tr').toArray().forEach((tr: DomElement) => {
    const tds = $(tr).find('td').toArray();
    if (tds.length >= 2) {
      const k = limpiar($(tds[0]).text()).replace(/:$/, '');
      const v = limpiar($(tds[1]).text());
      if (k && v) pares[k] = v;
    }
  });

  if (Object.keys(pares).length === 0) {
    $('*').toArray().forEach((node: AnyNode) => {
      if ((node as any).type !== 'tag') return; // solo Element
      const el = node as DomElement;

      const t = limpiar($(el).text());
      if (/:\s*$/.test(t)) {
        const k = t.replace(/:$/, '');
        const v = limpiar($(el).next().text());
        if (k && v) pares[k] = v;
      }
    });
  }
  return pares;
}

function mapearDetalle(pares: Record<string, string>) {
  const get = (label: string) => pares[label] || '';
  const estadoRaw = get('Estado del documento') || get('Estado del Documento');
  const documentoAjustado = get('Documento ajustado');
  const ajustado = /ajustad/i.test(documentoAjustado);
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
    ivaOperaciones: get('IVA de las operaciones'),
    ivaPercibido: get('IVA percibido'),
    ivaRetenido: get('IVA retenido'),
    retencionRenta: get('Retención renta') || get('Retencion renta'),
    totalNoAfectos: get('Total valores no afectos'),
    totalPagarOperacion:
      get('Total a pagar/Total de operación') ||
      get('Total a pagar / Total de operación') ||
      get('Total de operación'),
    otrosTributos: get('Otros tributos'),
    documentoAjustado,
    ajustado,
  };
}

function extraerDocumentosRelacionados(html: string) {
  const $ = cheerio.load(html);
  const norm = (s = '') => limpiar(s).toLowerCase();

  const tableEl = $('table').toArray().find((t: DomElement) => {
    const headers = $(t)
      .find('thead th, tr:first-child th')
      .toArray()
      .map((th: DomElement) => norm($(th).text()))
      .join('|');
    return (
      headers.includes('fecha de generación') &&
      (headers.includes('código de generación') || headers.includes('codigo de generación')) &&
      headers.includes('sello de recepción') &&
      headers.includes('tipo de documentación')
    );
  });
  if (!tableEl) return [] as Array<{
    fechaGeneracion?: string
    codigoGeneracion?: string
    selloRecepcion?: string
    tipoDocumentacion?: string
  }>;

  const $table = $(tableEl);
  const headCells = $table
    .find('thead th, tr:first-child th')
    .toArray()
    .map((th: DomElement) => norm($(th).text()));

  const idxFecha = headCells.findIndex(h => h.includes('fecha de generación'));
  const idxCod   = headCells.findIndex(h => h.includes('código de generación') || h.includes('codigo de generación'));
  const idxSello = headCells.findIndex(h => h.includes('sello de recepción'));
  const idxTipo  = headCells.findIndex(h => h.includes('tipo de documentación'));

  const rows: Array<{
    fechaGeneracion?: string
    codigoGeneracion?: string
    selloRecepcion?: string
    tipoDocumentacion?: string
  }> = [];

  $table.find('tbody tr').toArray().forEach((trEl: DomElement) => {
    const tds = $(trEl).find('td').toArray();
    const get = (i: number) => (i >= 0 && tds[i] ? limpiar($(tds[i]).text()) : '');
    rows.push({
      fechaGeneracion: get(idxFecha),
      codigoGeneracion: get(idxCod),
      selloRecepcion: get(idxSello),
      tipoDocumentacion: get(idxTipo),
    });
  });

  return rows;
}

/* =============== Playwright helpers =============== */

async function optimizarPagina(page: Page) {
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') {
      return route.abort();
    }
    return route.continue();
  });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-SV,es;q=0.9,en;q=0.8' });
  await page.setViewportSize({ width: 1280, height: 900 });
  page.setDefaultTimeout(12000); // Reducido de 20s a 12s
  page.setDefaultNavigationTimeout(12000);
}

async function getResultadoScope(page: Page): Promise<{ html: string, frame?: Frame }> {
  try {
    await page.waitForSelector('text=/Estado\\s+del\\s+documento/i', { timeout: 4000 }); // Reducido de 6s a 4s
    return { html: await page.content(), frame: undefined };
  } catch {}
  for (const f of page.frames()) {
    try {
      const ok = await f.waitForSelector('text=/Estado\\s+del\\s+documento/i', { timeout: 3000 });
      if (ok) return { html: await f.content(), frame: f };
    } catch {}
  }
  const frames = page.frames();
  if (frames.length) return { html: await frames[frames.length - 1].content(), frame: frames[frames.length - 1] };
  return { html: await page.content(), frame: undefined };
}

async function consultarConClick(page: Page, rawUrl: string) {
  const url = sanitizarUrl(rawUrl);
  const { host, ambiente, codGen, fechaEmi } = extraerParametros(url);
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 }); // Reducido de 20s a 12s

    let hizoClick = false;
    const intentos = [
      async () => page.getByRole('button', { name: /Realizar Búsqueda/i }).click({ timeout: 2500 }),
      async () => page.click('text=Realizar Búsqueda', { timeout: 2500 }),
      async () => page.click('button:has-text("Realizar Búsqueda")', { timeout: 2500 }),
      async () => page.click('input[type="button"][value*="Realizar"]', { timeout: 2500 }),
    ];
    for (const fn of intentos) { try { await fn(); hizoClick = true; break; } catch {} }

    if (!hizoClick) {
      for (const f of page.frames()) {
        try { await f.click('text=Realizar Búsqueda', { timeout: 2000 }); hizoClick = true; break; } catch {}
      }
    }

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {}); // Reducido de 8s a 5s
    const { html } = await getResultadoScope(page);

    const pares = paresDesdeHtml(html);
    let detalle = mapearDetalle(pares);

    if (!detalle.estadoRaw || detalle.estado === 'DESCONOCIDO') {
      const bodyTxt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const estadoLinea = (bodyTxt.match(/Estado[^:]*:\s*([A-Za-zÁÉÍÓÚÑñ\s]+)/i) || [,''])[1];
      const estadoHeuristico = normalizarEstado(estadoLinea || bodyTxt);
      if (estadoHeuristico !== 'DESCONOCIDO') {
        detalle.estado = estadoHeuristico;
        detalle.estadoRaw = estadoLinea || '';
      }
    }

    let relacionados: any[] = [];
    if (detalle.ajustado) relacionados = extraerDocumentosRelacionados(html);

    const dur = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`✔ ${codGen || ''} -> ${detalle.estado} (${host}) en ${dur}s`);

    return {
      url,
      linkVisita: url,
      visitar: 'Abrir',
      host, ambiente, codGen, fechaEmi,
      ...detalle,
      relacionados,
      error: '',
    };
  } catch (e: any) {
    console.warn(`✖ Error con ${codGen || url}: ${e?.message || e}`);
    return {
      url: rawUrl,
      linkVisita: sanitizarUrl(rawUrl),
      visitar: 'Abrir',
      host, ambiente, codGen, fechaEmi,
      estado: 'ERROR',
      estadoRaw: '',
      tipoDte: '',
      tipoDteNorm: 'SIN_TIPO',
      relacionados: [],
      error: e?.message || String(e),
    };
  }
}

// === Lanzar Playwright: Vercel (Sparticuz) vs Local (Edge/Chrome) ===
async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL === '1') {
    const exePath = await chromium.executablePath();
    return pwChromium.launch({
      headless: true,
      executablePath: exePath || undefined,
      args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage'],
    });
  }
  // Local Windows/Mac/Linux: usa un navegador instalado
  try {
    return await pwChromium.launch({ headless: true, channel: 'msedge' });
  } catch {
    return await pwChromium.launch({ headless: true, channel: 'chrome' });
  }
}

// ✅ NUEVO: Procesamiento por lotes optimizado para 150 consultas
const LOTE_SIZE = 15; // Procesar de 15 en 15
const DELAY_ENTRE_LOTES = 2000; // 2 segundos entre lotes
const CONCURRENCIA_POR_LOTE = 3; // 3 páginas simultáneas por lote

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
        try {
          const resultado = await consultarConClick(page, url);
          resultados.push(resultado);
        } catch (err) {
          resultados.push({
            url: url,
            linkVisita: sanitizarUrl(url),
            visitar: 'Abrir',
            estado: 'ERROR',
            tipoDte: '',
            tipoDteNorm: 'SIN_TIPO',
            relacionados: [],
            error: (err as any)?.message || String(err),
          });
        }
        
        // Pequeña pausa entre consultas
        await page.waitForTimeout(300);
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

// Pool de páginas concurrentes (función anterior mantenida para compatibilidad)
async function procesarEnlacesConPool(ctx: BrowserContext, links: string[], concurrencia = 2) {
  const resultados: any[] = [];
  const cola = links.slice();
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrencia, cola.length); i++) {
    workers.push((async () => {
      const page = await ctx.newPage();
      await optimizarPagina(page);
      while (cola.length) {
        const raw = cola.shift()!;
        try {
          // Intentar solo una vez para evitar timeouts
          const r = await consultarConClick(page, raw);
          resultados.push(r);
        } catch (err) {
          resultados.push({
            url: raw,
            linkVisita: sanitizarUrl(raw),
            visitar: 'Abrir',
            estado: 'ERROR',
            tipoDte: '',
            tipoDteNorm: 'SIN_TIPO',
            relacionados: [],
            error: (err as any)?.message || String(err),
          });
        }
        // Reducir tiempo de espera entre consultas
        await page.waitForTimeout(100);
      }
      await page.close();
    })());
  }

  await Promise.all(workers);
  return resultados;
}

/* =============== Excel helpers =============== */

function sheetNameSafe(name: string) {
  const bad = /[:\\/?*\[\]]/g;
  let s = (name || 'Hoja').replace(bad, ' ').trim();
  if (s.length > 31) s = s.slice(0, 31);
  return s || 'Hoja';
}
function applyHyperlinks(ws: XLSX.WorkSheet) {
  const ref = ws['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const headers: Record<string, number> = {};
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
    const cell = (ws as any)[addr];
    if (cell && typeof cell.v === 'string') headers[cell.v] = C;
  }
  const colVisitar = headers['visitar'];
  const colLink = headers['linkVisita'];
  if (colVisitar === undefined || colLink === undefined) return;
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const addrVisitar = XLSX.utils.encode_cell({ r: R, c: colVisitar });
    const addrLink = XLSX.utils.encode_cell({ r: R, c: colLink });
    const url = (ws as any)[addrLink]?.v;
    if (typeof url === 'string' && url) {
      (ws as any)[addrVisitar] = (ws as any)[addrVisitar] || { t: 's', v: 'Abrir' };
      (ws as any)[addrVisitar].l = { Target: url };
    }
  }
}

/* =============== Handler =============== */

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userInfo: { uid: string; email?: string } | undefined;
  
  // Intentar obtener información del usuario (opcional)
  try {
    const authResult = await authenticate(req);
    if (authResult.success && authResult.user) {
      userInfo = {
        uid: authResult.user.uid,
        email: authResult.user.email
      };
    }
  } catch (error) {
    // Si falla la autenticación, continuamos sin usuario (para compatibilidad)
    console.warn('Authentication failed, continuing without user info');
  }

  const formData = await req.formData();

  try {
    const archivos = formData.getAll('files') as File[];
    const unico = formData.get('file') as File | null;
    if ((!archivos || archivos.length === 0) && !unico) {
      // Log de error si hay usuario
      if (userInfo) {
        const userData = await UserService.getUserById(userInfo.uid);
        await optimizedAuditService.logDTEProcessing({
          userId: userInfo.uid,
          userEmail: userInfo.email,
          userRole: userData?.role || 'client',
          tipoVerificacion: 'CSV',
          cantidadArchivos: 0,
          nombreArchivos: [],
          cantidadResultados: 0,
          duracionMs: Date.now() - startTime,
          exito: false,
          errorMessage: 'No se proporcionaron archivos',
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined
        });
      }
      return new Response('No se proporcionaron archivos.', { status: 400 });
    }
    if (unico) archivos.push(unico);

  const setLinks = new Set<string>();
  for (const f of archivos) {
    const buf = Buffer.from(await f.arrayBuffer());
    const contenido = buf.toString('utf8');
    parsearLinksDesdeCSV(contenido).forEach((u) => setLinks.add(sanitizarUrl(u)));
  }
    const links = Array.from(setLinks).filter(Boolean);
    if (!links.length) {
      // Log de error si hay usuario
      if (userInfo) {
        const userData = await UserService.getUserById(userInfo.uid);
        await optimizedAuditService.logDTEProcessing({
          userId: userInfo.uid,
          userEmail: userInfo.email,
          userRole: userData?.role || 'client',
          tipoVerificacion: 'CSV',
          cantidadArchivos: archivos.length,
          nombreArchivos: archivos.map(f => f.name),
          cantidadResultados: 0,
          duracionMs: Date.now() - startTime,
          exito: false,
          errorMessage: 'No se encontraron URLs válidas en los CSV',
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined
        });
      }
      return new Response('No se encontraron URLs válidas en los CSV.', { status: 400 });
    }

    // ✅ NUEVO: Límite de 150 enlaces con procesamiento por lotes
    const MAX_ENLACES_PERMITIDOS = 150;
    
    if (links.length > MAX_ENLACES_PERMITIDOS) {
      return new Response(`Demasiados enlaces. Máximo permitido: ${MAX_ENLACES_PERMITIDOS}, encontrados: ${links.length}`, { status: 400 });
    }

    console.log(`📊 Iniciando procesamiento de ${links.length} enlaces por lotes optimizado`);
    
  let browser: Browser | null = null;
  let resultados: any[] = [];

  try {
    browser = await launchBrowser();
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 NovaFactVerificador/2.0',
    });

    // ✅ NUEVO: Usar procesamiento por lotes optimizado
    resultados = await procesarEnlacesPorLotes(ctx, links);

    await ctx.close();
  } finally {
    if (browser) await browser.close();
  }

  // Excel: Todos + 3 tipos + Rechazados + Relacionados
  const wb = XLSX.utils.book_new();

  const wsAll = XLSX.utils.json_to_sheet(resultados);
  applyHyperlinks(wsAll);
  XLSX.utils.book_append_sheet(wb, wsAll, sheetNameSafe('Todos'));

  const tiposFijos: Array<'FACTURA' | 'COMPROBANTE DE CRÉDITO FISCAL' | 'NOTA DE CRÉDITO'> = [
    'FACTURA',
    'COMPROBANTE DE CRÉDITO FISCAL',
    'NOTA DE CRÉDITO',
  ];
  for (const tipo of tiposFijos) {
    const rows = resultados.filter(r => r?.tipoDteNorm === tipo);
    const ws = XLSX.utils.json_to_sheet(rows);
    applyHyperlinks(ws);
    XLSX.utils.book_append_sheet(wb, ws, sheetNameSafe(tipo));
  }

  const rechazados = resultados.filter(r => r?.estado === 'RECHAZADO' || r?.estado === 'INVALIDADO');
  const wsRech = XLSX.utils.json_to_sheet(rechazados);
  applyHyperlinks(wsRech);
  XLSX.utils.book_append_sheet(wb, wsRech, sheetNameSafe('Rechazados'));

  const relacionadosAll: any[] = [];
  for (const r of resultados) {
    const parent = r.codGen || r.codigoGeneracion || '';
    const tipoPadre = r.tipoDte || '';
    if (Array.isArray(r.relacionados) && r.relacionados.length) {
      for (const rel of r.relacionados) {
        relacionadosAll.push({
          codGenPadre: parent,
          tipoDtePadre: tipoPadre,
          fechaGeneracion: rel.fechaGeneracion,
          codigoGeneracion: rel.codigoGeneracion,
          selloRecepcion: rel.selloRecepcion,
          tipoDocumentacion: rel.tipoDocumentacion,
          linkVisita: r.linkVisita || r.url,
          visitar: 'Abrir',
        });
      }
    }
  }
  if (relacionadosAll.length) {
    const wsRel = XLSX.utils.json_to_sheet(relacionadosAll);
    applyHyperlinks(wsRel);
    XLSX.utils.book_append_sheet(wb, wsRel, sheetNameSafe('Relacionados'));
  }

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  const filename = `resultados_dtes_${Date.now()}.xlsx`;
  const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // payload base SIEMPRE con resultados
  const payloadBase = {
    filename,
    total: resultados.length,
    totalOriginal: links.length, // Total de enlaces encontrados
    procesados: resultados.length, // Enlaces realmente procesados
    procesadoPorLotes: true, // Indicador de que se usó procesamiento por lotes
    loteSize: LOTE_SIZE,
    tiempoTotal: ((Date.now() - startTime) / 1000).toFixed(2) + 's',
    resultados, // <--- clave para que la tabla se llene en el front
  };

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  
  // Preparar respuesta
  let response;
  if (blobToken) {
    const { url } = await put(filename, excelBuffer, {
      access: 'public',
      contentType,
      token: blobToken,
    });
    response = NextResponse.json({
      ...payloadBase,
      downloadUrl: url,
    });
  } else {
    const excelBase64 = Buffer.from(excelBuffer).toString('base64');
    response = NextResponse.json({
      ...payloadBase,
      excelBase64,
    });
  }

  // Log de auditoría
  if (userInfo) {
    const endTime = Date.now();
    const duracionMs = endTime - startTime;
    const userData = await UserService.getUserById(userInfo.uid);
    
    await optimizedAuditService.logDTEProcessing({
      userId: userInfo.uid,
      userEmail: userInfo.email,
      userRole: userData?.role || 'client',
      tipoVerificacion: 'CSV',
      cantidadArchivos: archivos.length,
      nombreArchivos: archivos.map(f => f.name),
      cantidadResultados: resultados.length,
      duracionMs,
      exito: true,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: {
        totalLinks: links.length,
        linksProcessed: resultados.length,
        procesadoPorLotes: true,
        loteSize: LOTE_SIZE,
        numeroLotes: Math.ceil(links.length / LOTE_SIZE),
        tiposUnicos: [...new Set(resultados.map(r => r.tipoDte))],
        estadosUnicos: [...new Set(resultados.map(r => r.estado))]
      }
    });
  }

  return response;
  } catch (error) {
    // Log de error si hay usuario
    if (userInfo) {
      const endTime = Date.now();
      const duracionMs = endTime - startTime;
      const userData = await UserService.getUserById(userInfo.uid);
      
      await optimizedAuditService.logDTEProcessing({
        userId: userInfo.uid,
        userEmail: userInfo.email,
        userRole: userData?.role || 'client',
        tipoVerificacion: 'CSV',
        cantidadArchivos: 0,
        nombreArchivos: [],
        cantidadResultados: 0,
        duracionMs,
        exito: false,
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined
      });
    }
    
    console.error('Error in CSV processing:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
}
