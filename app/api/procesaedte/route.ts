// app/api/procesaedte/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  chromium as pwChromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Frame,
} from 'playwright-core';
import chromium from '@sparticuz/chromium';
import * as cheerio from 'cheerio';
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
import { put } from '@vercel/blob';

/* ========================= Utilidades ========================= */
const limpiar = (s: string) => (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
const sinAcentos = (s: string) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');

const FECHA_DMY_REGEX = /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/;    // dd/mm/yyyy o dd-mm-yyyy
const FECHA_STRICT_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;          // dd/mm/yyyy
const UUID_HEX_REGEX = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;
const MAX_ITEMS = 10;

function toDMY(fecha: string) {
  const t = (fecha || '').trim().replace(/-/g, '/');
  if (!FECHA_DMY_REGEX.test(t)) return '';
  const [dd, mm, yyyy] = t.split('/');
  return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
}
function guessSeparator(line: string): string | RegExp {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  if (line.includes(',')) return ',';
  return /\s{2,}/; // 2+ espacios
}
/** Texto pegado (Excel/CSV) -> [{ codGen, fechaEmi }] */
function parsePastedItems(texto: string): Array<{ codGen: string; fechaEmi: string }> {
  const out: Array<{ codGen: string; fechaEmi: string }> = [];
  const lines = (texto || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/c[oó]d/i.test(line) && /fecha/i.test(line)) continue; // header
    const sep = guessSeparator(line);
    const cells = typeof sep === 'string' ? line.split(sep) : line.split(sep);
    if (!cells.length) continue;

    let codGen = '';
    let fechaEmi = '';

    for (const cRaw of cells) {
      const c = cRaw.trim();
      if (!codGen && UUID_HEX_REGEX.test(c)) codGen = c;
      if (!fechaEmi && FECHA_DMY_REGEX.test(c)) fechaEmi = toDMY(c);
    }
    if ((!codGen || !fechaEmi) && cells.length >= 2) {
      const a = (cells[0] || '').trim();
      const b = (cells[1] || '').trim();
      if (!codGen && UUID_HEX_REGEX.test(a)) codGen = a;
      if (!codGen && UUID_HEX_REGEX.test(b)) codGen = b;
      if (!fechaEmi && FECHA_DMY_REGEX.test(a)) fechaEmi = toDMY(a);
      if (!fechaEmi && FECHA_DMY_REGEX.test(b)) fechaEmi = toDMY(b);
    }
    if (codGen && fechaEmi) out.push({ codGen, fechaEmi });
  }
  return out.slice(0, MAX_ITEMS); // corte duro al pegar
}

/* ====================== Normalizadores ======================= */
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

/* ============== HTML → pares SOLO del “Resultado de consulta” ============== */
function paresDesdeResultado(htmlCompleto: string): Record<string, string> {
  const marca = /Resultado\s+de\s+consulta/i;
  const html = marca.test(htmlCompleto)
    ? htmlCompleto.slice(htmlCompleto.search(marca))
    : htmlCompleto;

  const $ = cheerio.load(html);
  const pares: Record<string, string> = {};

  $('tr').toArray().forEach((tr: any) => {
    const tds = $(tr).find('td').toArray();
    if (tds.length >= 2) {
      const k = limpiar($(tds[0]).text()).replace(/:$/, '');
      const v = limpiar($(tds[1]).text());
      if (!k || !v || /realizar\s+b(ú|u)squeda/i.test(v)) return; // evita capturar el botón
      pares[k] = v;
    }
  });

  if (Object.keys(pares).length === 0) {
    $('*').toArray().forEach((node: any) => {
      if (node.type !== 'tag') return;
      const t = limpiar($(node).text());
      if (/:\s*$/.test(t)) {
        const k = t.replace(/:$/, '');
        let v = limpiar($(node).next().text());
        if (/realizar\s+b(ú|u)squeda/i.test(v)) v = '';
        if (k && v) pares[k] = v;
      }
    });
  }
  return pares;
}

/* ============ Mapeo de detalle (TODOS los campos + variaciones) ============ */
function mapearDetalle(pares: Record<string, string>) {
  const get = (label: string) => pares[label] || '';
  const estadoRaw =
    get('Estado del documento') ||
    get('Estado del Documento') ||
    get('Estado');

  // Variaciones: "Tipo DTE" vs "Tipo de DTE"
  const tipoDte =
    get('Tipo de DTE') ||
    get('Tipo DTE') ||
    get('Tipo de Dte') ||
    get('Tipo Dte');

  const documentoAjustado =
    get('Documento ajustado') ||
    get('Ajuste') ||
    get('Documento Ajustado');

  const ajustado = /ajustad/i.test(documentoAjustado);

  return {
    estado: normalizarEstado(estadoRaw),
    estadoRaw,
    tipoDte,
    tipoDteNorm: normalizarTipoDte(tipoDte),
    descripcionEstado:
      get('Descripción del Estado') ||
      get('Descripcion del Estado') ||
      get('Descripción') ||
      get('Descripcion'),
    fechaHoraGeneracion:
      get('Fecha y Hora de Generación') ||
      get('Fecha y Hora de Generacion') ||
      get('Fecha de Generación') ||
      get('Fecha de Generacion'),
    fechaHoraProcesamiento:
      get('Fecha y Hora de Procesamiento') ||
      get('Fecha de Procesamiento'),
    codigoGeneracion:
      get('Código de Generación') ||
      get('Codigo de Generacion') ||
      get('Código Generación') ||
      get('Codigo Generacion') ||
      get('Código de generación') ||
      get('Codigo de generacion'),
    selloRecepcion:
      get('Sello de Recepción') ||
      get('Sello de Recepcion') ||
      get('Sello'),
    numeroControl:
      get('Número de Control') ||
      get('Numero de Control') ||
      get('N° Control') ||
      get('No. de Control'),
    montoTotal: get('Monto Total') || get('Total a pagar'),
    ivaOperaciones: get('IVA de las operaciones') || get('IVA de las Operaciones'),
    ivaPercibido: get('IVA percibido') || get('IVA Percibido'),
    ivaRetenido: get('IVA retenido') || get('IVA Retenido'),
    retencionRenta: get('Retención renta') || get('Retencion renta'),
    totalNoAfectos: get('Total valores no afectos') || get('Valores no afectos'),
    totalPagarOperacion:
      get('Total a pagar/Total de operación') ||
      get('Total a pagar / Total de operación') ||
      get('Total de operación') ||
      get('Total de Operación'),
    otrosTributos: get('Otros tributos') || get('Otros Tributos'),
    documentoAjustado,
    ajustado,
  };
}

/* ========== Documentos relacionados (tabla tipo DataTables) ========== */
function extraerDocumentosRelacionados(html: string) {
  const $ = cheerio.load(html);
  const norm = (s = '') => limpiar(s).toLowerCase();

  // 1) ID típico
  let $table = $('#DataTables_Table_0');
  if (!$table.length) $table = $('table.dataTable').first();

  // 2) Por cabeceras
  if (!$table.length) {
    const byHeaders = $('table').toArray().find((t: any) => {
      const headers = $(t)
        .find('thead th, tr:first-child th')
        .toArray()
        .map((th: any) => norm($(th).text()))
        .join('|');
      return (
        headers.includes('fecha de generación') &&
        (headers.includes('código de generación') || headers.includes('codigo de generación')) &&
        headers.includes('sello de recepción') &&
        (headers.includes('tipo de documentación') || headers.includes('tipo de documentacion'))
      );
    });
    if (byHeaders) $table = $(byHeaders);
  }

  // 3) Fallback: primera tabla con 4 columnas bajo “Documentos relacionados”
  if (!$table.length) {
    const relTitle = $('*:contains("Documentos relacionados")').last();
    if (relTitle.length) {
      const nearTable = relTitle.nextAll('table').toArray().find((t: any) => {
        const cols = $(t).find('thead th, tr:first-child th, tr:first-child td').length;
        return cols >= 4;
      });
      if (nearTable) $table = $(nearTable);
    }
  }

  if (!$table.length) return [] as Array<{
    fechaGeneracion?: string
    codigoGeneracion?: string
    selloRecepcion?: string
    tipoDocumentacion?: string
  }>;

  const headCells = $table
    .find('thead th, tr:first-child th')
    .toArray()
    .map((th: any) => norm($(th).text()));

  const idxFecha = headCells.length ? headCells.findIndex(h => h.includes('fecha de generación')) : 0;
  const idxCod   = headCells.length ? headCells.findIndex(h => h.includes('código de generación') || h.includes('codigo de generación')) : 1;
  const idxSello = headCells.length ? headCells.findIndex(h => h.includes('sello de recepción')) : 2;
  const idxTipo  = headCells.length ? headCells.findIndex(h => h.includes('tipo de documentación') || h.includes('tipo de documentacion')) : 3;

  const rows: Array<{
    fechaGeneracion?: string
    codigoGeneracion?: string
    selloRecepcion?: string
    tipoDocumentacion?: string
  }> = [];

  $table.find('tbody tr').toArray().forEach((trEl: any) => {
    const tds = $(trEl).find('td').toArray();
    const get = (i: number) => (i >= 0 && tds[i] ? limpiar($(tds[i]).text()) : '');
    rows.push({
      fechaGeneracion:   get(idxFecha >= 0 ? idxFecha : 0),
      codigoGeneracion:  get(idxCod   >= 0 ? idxCod   : 1),
      selloRecepcion:    get(idxSello >= 0 ? idxSello : 2),
      tipoDocumentacion: get(idxTipo  >= 0 ? idxTipo  : 3),
    });
  });

  return rows;
}

/* =================== Playwright helpers =================== */
async function optimizarPagina(page: Page) {
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') return route.abort();
    return route.continue();
  });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-SV,es;q=0.9,en;q=0.8' });
  await page.setViewportSize({ width: 1280, height: 900 });
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(20000);
}

async function getResultadoScope(page: Page): Promise<{ html: string; frame?: Frame }> {
  try {
    await page.waitForSelector('text=/Resultado\\s+de\\s+consulta/i', { timeout: 6000 });
    return { html: await page.content(), frame: undefined };
  } catch {}
  // iframes
  for (const f of page.frames()) {
    try {
      const ok = await f.waitForSelector('text=/Resultado\\s+de\\s+consulta/i', { timeout: 3000 });
      if (ok) return { html: await f.content(), frame: f };
    } catch {}
  }
  // Relacionados / DataTables como fallback
  const sels = ['#DataTables_Table_0 tbody tr', 'table.dataTable tbody tr', 'text=/Documentos\\s+relacionados/i'];
  for (const sel of sels) {
    try {
      await page.waitForSelector(sel, { timeout: 4000 });
      const frames = page.frames();
      if (frames.length) return { html: await frames[frames.length - 1].content(), frame: frames[frames.length - 1] };
      return { html: await page.content(), frame: undefined };
    } catch {}
  }
  const frames = page.frames();
  if (frames.length) return { html: await frames[frames.length - 1].content(), frame: frames[frames.length - 1] };
  return { html: await page.content(), frame: undefined };
}

/* ============ Lanzamiento Playwright (Vercel-friendly) ============ */
async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL === '1') {
    const exePath = await chromium.executablePath();
    return pwChromium.launch({
      headless: true,
      executablePath: exePath || undefined,
      args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage'],
    });
  }
  try { return await pwChromium.launch({ headless: true, channel: 'msedge' }); }
  catch {}
  try { return await pwChromium.launch({ headless: true, channel: 'chrome' }); }
  catch { return await pwChromium.launch({ headless: true }); }
}

/* ================== URL oficial de consulta ================== */
function buildConsultaUrl(codGen: string, fecha_ddmmyyyy: string, ambiente: '00' | '01'): string {
  const [dd, mm, yyyy] = (fecha_ddmmyyyy || '').split('/');
  const fechaEmi = (dd && mm && yyyy) ? `${yyyy}-${mm}-${dd}` : '';
  const BASE = 'https://admin.factura.gob.sv/consultaPublica';
  const qs = new URLSearchParams({ codGen, ambiente });
  if (fechaEmi) qs.set('fechaEmi', fechaEmi);
  return `${BASE}?${qs.toString()}`;
}

/* ================== Consulta un DTE (fila) ================== */
async function consultarDte(page: Page, codGen: string, fecha: string, ambiente: '00' | '01') {
  const url = buildConsultaUrl(codGen, fecha, ambiente);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const intentos = [
      async () => page.getByRole('button', { name: /Realizar Búsqueda/i }).click({ timeout: 2500 }),
      async () => page.click('text=Realizar Búsqueda', { timeout: 2500 }),
      async () => page.click('button:has-text("Realizar Búsqueda")', { timeout: 2500 }),
      async () => page.click('input[type="button"][value*="Realizar"]', { timeout: 2500 }),
      async () => page.keyboard.press('Enter'),
    ];
    for (const fn of intentos) { try { await fn(); break; } catch {} }

    // Espera explícita de “Resultado de consulta” o (fallback) DataTables/relacionados
    await Promise.race([
      page.waitForSelector('text=/Resultado\\s+de\\s+consulta/i', { timeout: 8000 }),
      page.waitForSelector('#DataTables_Table_0 tbody tr, table.dataTable tbody tr', { timeout: 8000 }),
    ]).catch(() => {});

    let html = await page.content();

    // Parsear SOLO el bloque de resultado (evita capturar el formulario)
    let pares = paresDesdeResultado(html);
    let d = mapearDetalle(pares);

    // Si es AJUSTADO, espera la tabla y vuelve a leer (por si aún no se pintó)
    if (/ajustad/i.test(d.documentoAjustado || '') || d.ajustado) {
      try {
        await page.waitForSelector('#DataTables_Table_0 tbody tr, table.dataTable tbody tr, text=/Documentos\\s+relacionados/i', { timeout: 4000 });
      } catch {}
      html = await page.content();
      pares = paresDesdeResultado(html);
      d = mapearDetalle(pares);
    }

    // Heurística de estado (por si cambia el label)
    if (!d.estadoRaw || d.estado === 'DESCONOCIDO') {
      const bodyTxt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const estadoLinea = (bodyTxt.match(/Estado[^:]*:\s*([A-Za-zÁÉÍÓÚÑñ\s]+)/i) || [,''])[1];
      const estimado = normalizarEstado(estadoLinea || bodyTxt);
      if (estimado !== 'DESCONOCIDO') {
        d.estado = estimado;
        d.estadoRaw = estadoLinea || '';
      }
    }

    // Documentos relacionados + Fallback de tipo desde “Tipo de Documentación”
    let relacionados: Array<{ fechaGeneracion?: string; codigoGeneracion?: string; selloRecepcion?: string; tipoDocumentacion?: string; }> = [];
    if (d.ajustado) {
      relacionados = extraerDocumentosRelacionados(html);
      if ((!d.tipoDte || d.tipoDteNorm === 'SIN_TIPO') && relacionados.length) {
        const tipoFallback = (relacionados.find(r => (r.tipoDocumentacion || '').trim())?.tipoDocumentacion || '').trim();
        if (tipoFallback) {
          d.tipoDte = tipoFallback;
          d.tipoDteNorm = normalizarTipoDte(tipoFallback);
        }
      }
    }

    return { ...d, linkVisita: url, relacionados, error: '' };
  } catch (e: any) {
    return {
      estado: 'ERROR',
      estadoRaw: '',
      tipoDte: '',
      tipoDteNorm: 'SIN_TIPO',
      descripcionEstado: '',
      fechaHoraGeneracion: '',
      fechaHoraProcesamiento: '',
      codigoGeneracion: '',
      selloRecepcion: '',
      numeroControl: '',
      montoTotal: '',
      ivaOperaciones: '',
      ivaPercibido: '',
      ivaRetenido: '',
      retencionRenta: '',
      totalNoAfectos: '',
      totalPagarOperacion: '',
      otrosTributos: '',
      documentoAjustado: '',
      ajustado: false,
      linkVisita: url,
      relacionados: [],
      error: e?.message || String(e),
    };
  }
}

/* ======================= Helpers Excel ======================= */
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
  const colLink = headers['linkVisita'] ?? headers['link'];
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
function buildWorkbook(resultados: any[]) {
  const wb = XLSX.utils.book_new();

  // Hoja: Todos
  const todos = resultados.map((r) => ({
    estado: r.estado,
    tipoDte: r.tipoDte,
    tipoDteNorm: r.tipoDteNorm,
    descripcionEstado: r.descripcionEstado,
    codigoGeneracion: r.codigoGeneracion,
    numeroControl: r.numeroControl,
    fechaHoraGeneracion: r.fechaHoraGeneracion,
    fechaHoraProcesamiento: r.fechaHoraProcesamiento,
    montoTotal: r.montoTotal,
    ivaOperaciones: r.ivaOperaciones,
    ivaPercibido: r.ivaPercibido,
    ivaRetenido: r.ivaRetenido,
    retencionRenta: r.retencionRenta,
    totalNoAfectos: r.totalNoAfectos,
    totalPagarOperacion: r.totalPagarOperacion,
    otrosTributos: r.otrosTributos,
    documentoAjustado: r.documentoAjustado,
    ajustado: r.ajustado,
    linkVisita: r.linkVisita,
    visitar: 'Abrir',
    error: r.error,
  }));
  const wsAll = XLSX.utils.json_to_sheet(todos);
  applyHyperlinks(wsAll);
  XLSX.utils.book_append_sheet(wb, wsAll, sheetNameSafe('Todos'));

  // Hojas por tipo fijo
  const tiposFijos: Array<'FACTURA' | 'COMPROBANTE DE CRÉDITO FISCAL' | 'NOTA DE CRÉDITO'> = [
    'FACTURA',
    'COMPROBANTE DE CRÉDITO FISCAL',
    'NOTA DE CRÉDITO',
  ];
  for (const tipo of tiposFijos) {
    const rows = resultados.filter(r => r?.tipoDteNorm === tipo).map(r => ({
      ...r,
      linkVisita: r.linkVisita,
      visitar: 'Abrir',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    applyHyperlinks(ws);
    XLSX.utils.book_append_sheet(wb, ws, sheetNameSafe(tipo));
  }

  // Rechazados / invalidados
  const rechazados = resultados.filter(r => r?.estado === 'RECHAZADO' || r?.estado === 'INVALIDADO')
    .map(r => ({ ...r, linkVisita: r.linkVisita, visitar: 'Abrir' }));
  const wsRech = XLSX.utils.json_to_sheet(rechazados);
  applyHyperlinks(wsRech);
  XLSX.utils.book_append_sheet(wb, wsRech, sheetNameSafe('Rechazados'));

  // Relacionados (si existen)
  const relacionadosAll: any[] = [];
  for (const r of resultados) {
    if (Array.isArray(r.relacionados) && r.relacionados.length) {
      for (const rel of r.relacionados) {
        relacionadosAll.push({
          codGenPadre: r.codigoGeneracion || r.codGen || '',
          tipoDtePadre: r.tipoDte || r.tipoDteNorm || '',
          fechaGeneracion: rel.fechaGeneracion,
          codigoGeneracion: rel.codigoGeneracion,
          selloRecepcion: rel.selloRecepcion,
          tipoDocumentacion: rel.tipoDocumentacion,
          linkVisita: r.linkVisita,
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

  return wb;
}

/* =========================== Handler =========================== */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let items: Array<{ codGen: string; fecha: string }> = Array.isArray(body?.items) ? body.items : [];
    const pasteText: string = typeof body?.pasteText === 'string' ? body.pasteText : '';
    const ambiente: '00' | '01' = body?.ambiente === '00' ? '00' : '01';
    const concurrencia: number = Math.max(1, Math.min(4, Number(body?.concurrencia ?? 2)));
    const includeExcel = Boolean(body?.includeExcel);

    // Si vino texto pegado y no hay items, parsear (corte a 10 dentro de la función)
    if (!items.length && pasteText) {
      const parsed = parsePastedItems(pasteText).map(p => ({ codGen: p.codGen, fecha: p.fechaEmi }));
      items = parsed;
    }

    // Deduplicar por (codGen|fecha)
    if (items.length) {
      const seen = new Set<string>();
      items = items.filter((it) => {
        const k = `${(it.codGen || '').trim().toUpperCase()}|${(it.fecha || '').trim()}`;
        if (!k.includes('|')) return false;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }

    // Límite duro: 10
    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Máximo permitido: ${MAX_ITEMS} ítems. Recibidos: ${items.length}.` }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ error: 'Sin items para verificar (items o pasteText).' }, { status: 400 });
    }

    // Validaciones
    for (const it of items) {
      if (!it.codGen?.trim() || !it.fecha?.trim() || !FECHA_STRICT_REGEX.test(it.fecha.trim())) {
        return NextResponse.json({ error: 'Datos inválidos (codGen/fecha). Use dd/mm/yyyy.' }, { status: 400 });
      }
      if (!UUID_HEX_REGEX.test(it.codGen.trim())) {
        return NextResponse.json({ error: `Código de generación inválido: ${it.codGen}` }, { status: 400 });
      }
    }

    // Playwright
    const browser: Browser = await launchBrowser();
    const ctx: BrowserContext = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) VerificadorDTE/1.0 Chrome Safari',
    });

    const trabajos = items.map((j, i) => ({ i, ...j }));
    const resultados: any[] = new Array(items.length);
    let ptr = 0;

    const workers: Promise<void>[] = [];
    for (let w = 0; w < Math.min(concurrencia, trabajos.length); w++) {
      workers.push((async () => {
        const page = await ctx.newPage();
        await optimizarPagina(page);
        while (true) {
          let t: typeof trabajos[number] | undefined;
          if (ptr < trabajos.length) t = trabajos[ptr++];
          else break;
          const r = await consultarDte(page, t.codGen.trim(), t.fecha.trim(), ambiente);
          resultados[t.i] = r;
          await page.waitForTimeout(150);
        }
        await page.close();
      })());
    }

    await Promise.all(workers);
    await ctx.close();
    await browser.close();

    /* ---------- Guardar en base de datos ---------- */
    try {
      const { getAdminDb, getAdminAuth } = await import('@/lib/firebaseAdmin');
      const db = await getAdminDb();
      const auth = await getAdminAuth();
      
      // Intentar obtener el usuario actual del token de autorización
      let userId = 'anonymous';
      let userEmail = 'unknown';
      
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const decodedToken = await auth.verifyIdToken(token);
          userId = decodedToken.uid;
          userEmail = decodedToken.email || 'unknown';
        } catch (tokenError) {
          console.log('Error verificando token, usando usuario anónimo:', tokenError);
        }
      }
      
      const procesoData = {
        userId: userId,
        userEmail: userEmail,
        tipo: 'verificacion_masiva',
        ambiente: ambiente,
        totalProcesados: resultados.length,
        exitosos: resultados.filter(r => r.estado === 'EMITIDO' || r.estado === 'OK').length,
        errores: resultados.filter(r => r.estado === 'ERROR').length,
        rechazados: resultados.filter(r => r.estado === 'RECHAZADO' || r.estado === 'ANULADO').length,
        noEncontrados: resultados.filter(r => r.estado === 'NO ENCONTRADO').length,
        resultados: resultados.map(r => ({
          ...r,
          // Limpiar datos muy largos para optimizar almacenamiento
          linkVisita: r.linkVisita,
          estado: r.estado,
          codigoGeneracion: r.codigoGeneracion,
          fechaHoraGeneracion: r.fechaHoraGeneracion,
          montoTotal: r.montoTotal,
          tipoDte: r.tipoDte,
          error: r.error
        })),
        configuracion: {
          concurrencia: concurrencia,
          includeExcel: includeExcel
        },
        stats: {
          emitidos: resultados.filter(r => r.estado === 'EMITIDO').length,
          anulados: resultados.filter(r => r.estado === 'ANULADO').length,
          rechazados: resultados.filter(r => r.estado === 'RECHAZADO').length,
          errores: resultados.filter(r => r.estado === 'ERROR').length
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await db.collection('procesoDTE').add(procesoData);
      console.log(`✅ Proceso guardado en BD: ${docRef.id} para usuario: ${userEmail}`);
    } catch (dbError) {
      console.error('❌ Error guardando en BD:', dbError);
      // No fallar la respuesta por error de BD, pero logear el error
    }

    /* ---------- Excel opcional ---------- */
    if (includeExcel) {
      const wb = buildWorkbook(resultados);
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      const filename = `resultados_dtes_${Date.now()}.xlsx`;
      const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      if (blobToken) {
        const { url } = await put(filename, excelBuffer, {
          access: 'public',
          contentType,
          token: blobToken,
        });
        return NextResponse.json({ resultados, downloadUrl: url, filename });
      }

      const excelBase64 = Buffer.from(excelBuffer).toString('base64');
      return NextResponse.json({ resultados, excelBase64, filename });
    }

    return NextResponse.json({ resultados });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}
