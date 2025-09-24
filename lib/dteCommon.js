// lib/dteCommon.js (ESM)
import { chromium as pwCore } from 'playwright-core';
import chromium from '@sparticuz/chromium';
import * as XLSX from 'xlsx';
import { load as cheerioLoad } from 'cheerio';

/* ========================= Constantes ========================= */
export const ADMIN  = 'https://admin.factura.gob.sv/consultaPublica';
export const WEBAPP = 'https://webapp.dtes.mh.gob.sv/consultaPublica';

/* ========================= Utils ========================= */
const limpiar = s => (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
const sinAcentos = s => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
const COD_RE = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;

export const isProbableCodGen = s => !!s && COD_RE.test(String(s).trim());

export function normalizarEstado(t) {
  t = (t || '').toUpperCase();
  if (t.includes('ANULAD')) return 'ANULADO';
  if (t.includes('RECHAZAD')) return 'RECHAZADO';
  if (t.includes('TRANSMITIDO') || t.includes('REGISTRADO') || t.includes('SATISFACTORIAMENTE')) return 'EMITIDO';
  if (t.includes('INVALIDAD')) return 'INVALIDADO';
  if (t.includes('NO ENCONTRADO') || t.includes('NO EXISTE') || t.includes('NO SE ENCONTRÓ')) return 'NO ENCONTRADO';
  return 'DESCONOCIDO';
}
export function normalizarTipoDte(t) {
  t = sinAcentos((t || '').toUpperCase());
  if (t.includes('FACTURA')) return 'FACTURA';
  if (t.includes('COMPROBANTE') && t.includes('CREDITO') && t.includes('FISCAL')) return 'COMPROBANTE DE CRÉDITO FISCAL';
  if (t.includes('NOTA') && t.includes('CREDITO')) return 'NOTA DE CRÉDITO';
  return 'SIN_TIPO';
}

export const buildQuery = (base, params) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
};

/* ========================= Fechas y lectura de archivos ========================= */
export function tryParseFechaFlexible(raw) {
  if (raw == null) return null;
  if (raw instanceof Date && !isNaN(raw)) return raw;
  if (typeof raw === 'number') {
    // serial Excel (desde 1900-01-00)
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(d)) return d;
  }
  const s = String(raw).trim();
  if (!s) return null;

  // yyyy-MM-dd
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3]); if (!isNaN(d)) return d; }

  // dd/MM/yyyy o dd-MM-yyyy
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) { const d = new Date(+m[3], +m[2] - 1, +m[1]); if (!isNaN(d)) return d; }

  const d2 = new Date(s);
  if (!isNaN(d2)) return d2;

  return null;
}

export function parseCSV_codFecha(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/[,\t;]+/).map(p => p.trim());
    if (parts.length < 2) continue;
    const cg = parts[0]; const fv = parts[1];

    if (i === 0 && !isProbableCodGen(cg)) {
      const h0 = (parts[0] || '').toLowerCase();
      if (h0.includes('cod')) continue; // encabezado
    }

    if (!isProbableCodGen(cg)) continue;
    const d = tryParseFechaFlexible(fv); if (!d) continue;

    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    out.push({ codGen: cg, fechaYmd: `${y}-${m}-${dd}` });
  }
  return out;
}

export function parseXLSX_codFecha(buf) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  const out = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.length < 2) continue;

    const cg = String(row[0] ?? '').trim();

    if (i === 0 && !isProbableCodGen(cg)) {
      const h0 = String(row[0] ?? '').toLowerCase();
      if (h0.includes('cod')) continue; // encabezado
    }

    if (!isProbableCodGen(cg)) continue;

    const d = tryParseFechaFlexible(row[1]);
    if (!d) continue;

    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    out.push({ codGen: cg, fechaYmd: `${y}-${m}-${dd}` });
  }
  return out;
}

/* ========================= Playwright ========================= */
export async function launchBrowser() {
  const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_REGION || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isServerless) {
    const exePath = await chromium.executablePath();
    return pwCore.launch({
      headless: true,
      executablePath: exePath || undefined,
      args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage'],
    });
  }
  // Local dev: usa el chromium de Playwright con navegadores instalados
  try {
    return await pwCore.launch({ headless: true, channel: 'msedge' });
  } catch {
    try {
      return await pwCore.launch({ headless: true, channel: 'chrome' });
    } catch {
      // fallback a chromium empaquetado por Playwright
      const { chromium } = await import('playwright');
      return chromium.launch({ headless: true });
    }
  }
}

export async function optimizarPagina(page) {
  await page.route('**/*', route => {
    const t = route.request().resourceType();
    if (t === 'image' || t === 'media' || t === 'font' || t === 'stylesheet') return route.abort();
    return route.continue();
  });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-SV,es;q=0.9,en;q=0.8' });
  await page.setViewportSize({ width: 1280, height: 900 });
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(20000);
}

async function getResultadoScope(page) {
  try {
    await page.waitForSelector('text=/Estado\\s+del\\s+documento/i', { timeout: 6000 });
    return { html: await page.content() };
  } catch {}

  for (const f of page.frames()) {
    try {
      await f.waitForSelector('text=/Estado\\s+del\\s+documento/i', { timeout: 3000 });
      return { html: await f.content() };
    } catch {}
  }

  return { html: await page.content() };
}

/* ========================= Parseo HTML ========================= */
const looksLikeButton = (s) => /realizar\s+b(ú|u)squeda/i.test(s);

function paresDesdeHtml(html) {
  const $ = cheerioLoad(html);
  const pares = {};

  const add = (k, v) => {
    k = limpiar(k).replace(/:$/, '');
    v = limpiar(v);
    if (!k || !v) return;
    if (looksLikeButton(v)) return; // evita "Realizar Búsqueda"
    pares[k] = v; // guarda la versión más limpia
  };

  // 1) Tablas <th>/<td> o <td>/<td>
  $('table').each((_, tbl) => {
    $(tbl).find('tr').each((__, tr) => {
      const cells = $(tr).children('th,td').toArray();
      if (cells.length >= 2) {
        for (let i = 0; i < cells.length - 1; i++) {
          const k = $(cells[i]).text();
          const v = $(cells[i + 1]).text();
          if (/:$/.test(limpiar(k)) || limpiar(k).length <= 50) add(k, v);
        }
      }
    });
  });

  // 2) Listas de definición <dt>/<dd>
  $('dl dt').each((_, dt) => {
    const dd = $(dt).nextAll('dd').first();
    if (dd.length) add($(dt).text(), dd.text());
  });

  // 3) Fallback: cualquier nodo que termine con ':' y su siguiente nodo con texto
  $('*').each((_, el) => {
    const t = limpiar($(el).text());
    if (!/:$/.test(t)) return;

    // siguiente hermano con texto
    let nxt = $(el).next();
    while (nxt.length && !limpiar(nxt.text())) nxt = nxt.next();
    if (nxt.length) add(t, nxt.text());

    // o primer nodo de texto dentro del mismo contenedor
    const sibling = $(el).parent().contents().toArray().find(n => n !== el && limpiar($(n).text()));
    if (sibling) add(t, $(sibling).text());
  });

  return pares;
}

function mapearDetalle(p) {
  const g = k => p[k] || '';
  const estadoRaw = g('Estado del documento') || g('Estado del Documento');
  const documentoAjustado = g('Documento ajustado');
  const ajustado = /ajustad/i.test(documentoAjustado);
  const tipoDte = g('Tipo de DTE');
  return {
    estado: normalizarEstado(estadoRaw),
    estadoRaw,
    tipoDte,
    tipoDteNorm: normalizarTipoDte(tipoDte),
    descripcionEstado: g('Descripción del Estado') || g('Descripcion del Estado'),
    fechaHoraGeneracion: g('Fecha y Hora de Generación') || g('Fecha y Hora de Generacion'),
    fechaHoraProcesamiento: g('Fecha y Hora de Procesamiento'),
    codigoGeneracion: g('Código de Generación') || g('Codigo de Generacion'),
    selloRecepcion: g('Sello de Recepción') || g('Sello de Recepcion'),
    numeroControl: g('Número de Control') || g('Numero de Control'),
    montoTotal: g('Monto Total'),
    ivaOperaciones: g('IVA de las operaciones'),
    ivaPercibido: g('IVA percibido'),
    ivaRetenido: g('IVA retenido'),
    retencionRenta: g('Retención renta') || g('Retencion renta'),
    totalNoAfectos: g('Total valores no afectos'),
    totalPagarOperacion:
      g('Total a pagar/Total de operación') ||
      g('Total a pagar / Total de operación') ||
      g('Total de operación'),
    otrosTributos: g('Otros tributos'),
    documentoAjustado,
    ajustado,
  };
}

/* ===== Consulta UNA URL ===== */
export async function consultarConClick(page, url) {
  const u = new URL(url);
  const host = u.host || '';
  const ambiente = u.searchParams.get('ambiente') || '';
  const codGen = u.searchParams.get('codGen') || '';
  const fechaEmi = u.searchParams.get('fechaEmi') || '';

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // click "Realizar Búsqueda"
    const tries = [
      async () => page.getByRole('button', { name: /Realizar Búsqueda/i }).click({ timeout: 2500 }),
      async () => page.click('text=Realizar Búsqueda', { timeout: 2500 }),
      async () => page.click('button:has-text("Realizar Búsqueda")', { timeout: 2500 }),
      async () => page.click('input[type="button"][value*="Realizar"]', { timeout: 2500 }),
    ];
    let clicked = false;
    for (const t of tries) { try { await t(); clicked = true; break; } catch {} }
    if (!clicked) {
      for (const f of page.frames()) {
        try { await f.click('text=Realizar Búsqueda', { timeout: 2000 }); clicked = true; break; } catch {}
      }
    }

    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const { html } = await getResultadoScope(page);

    // Parseo principal
    const pares = paresDesdeHtml(html);
    const det = mapearDetalle(pares);

    // Fallback heurístico
    if (!det.estadoRaw || det.estado === 'DESCONOCIDO') {
      const bodyTxt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const m = bodyTxt.match(/Estado[^:]*:\s*([A-Za-zÁÉÍÓÚÑñ\s]+)/i);
      const linea = (m && m[1]) || '';
      const heur = normalizarEstado(linea || bodyTxt);
      if (heur !== 'DESCONOCIDO') { det.estado = heur; det.estadoRaw = linea; }
    }

    // Relacionados
    let relacionados = [];
    if (det.ajustado) relacionados = extraerDocumentosRelacionados(html);

    return {
      ok: true,
      url,
      linkVisita: url,
      visitar: 'Abrir',
      //host,
      ambiente,
      codGen,
      fechaEmi,
      ...det,
      relacionados,
      error: ''
    };
  } catch (e) {
    return {
      ok: false,
       url,
      linkVisita: url,
      visitar: 'Abrir',
      //host,
      ambiente,
      codGen,
      fechaEmi,
      estado: 'ERROR',
      estadoRaw: '',
      tipoDte: '',
      tipoDteNorm: 'SIN_TIPO',
      relacionados: [],
      error: e?.message || String(e)
    };
  }
}

function extraerDocumentosRelacionados(html) {
  const $ = cheerioLoad(html);
  const norm = s => limpiar(s).toLowerCase();
  const table = $('table').toArray().find(t => {
    const headers = $(t).find('thead th, tr:first-child th').toArray().map(th => norm($(th).text())).join('|');
    return headers.includes('fecha de generación')
      && (headers.includes('código de generación') || headers.includes('codigo de generación'))
      && headers.includes('sello de recepción')
      && headers.includes('tipo de documentación');
  });
  if (!table) return [];
  const $t = $(table);
  const head = $t.find('thead th, tr:first-child th').toArray().map(th => norm($(th).text()));
  const idxF = head.findIndex(h => h.includes('fecha de generación'));
  const idxC = head.findIndex(h => h.includes('código de generación') || h.includes('codigo de generación'));
  const idxS = head.findIndex(h => h.includes('sello de recepción'));
  const idxT = head.findIndex(h => h.includes('tipo de documentación'));
  const rows = [];
  $t.find('tbody tr').toArray().forEach(tr => {
    const tds = $(tr).find('td').toArray();
    const get = i => (i >= 0 && tds[i]) ? limpiar($(tds[i]).text()) : '';
    rows.push({
      fechaGeneracion: get(idxF),
      codigoGeneracion: get(idxC),
      selloRecepcion: get(idxS),
      tipoDocumentacion: get(idxT)
    });
  });
  return rows;
}

/* ===== Pool por FILAS codGen/fecha ===== */
export async function procesarFilasConPool(ctx, filas, concurrencia = 2) {
  const resultados = [];
  const cola = filas.slice();
  const hosts = [ADMIN, WEBAPP];
  const workers = [];

  const tieneDetalle = (r) =>
    !!(r?.codigoGeneracion || r?.numeroControl || r?.selloRecepcion || r?.montoTotal);

  for (let i = 0; i < Math.min(concurrencia, cola.length); i++) {
    workers.push((async () => {
      const page = await ctx.newPage();
      await optimizarPagina(page);

      while (cola.length) {
        const { codGen, fechaYmd } = cola.shift();
        try {
          let mejor = null;
          let candidatoEstado = null; 
          for (const base of hosts) {
            const url = buildQuery(base, { ambiente: '01', codGen, fechaEmi: fechaYmd });
            const r = await consultarConClick(page, url);
            const est = (r.estado || '').toUpperCase();

            if (r.ok && tieneDetalle(r)) { mejor = r; break; } 
            if ((est === 'EMITIDO' || est === 'INVALIDADO') && !candidatoEstado) {
              candidatoEstado = r;
            }
          }

          mejor = mejor || candidatoEstado || {
            ok: false, url: '', linkVisita: '', visitar: 'Abrir',
            host: '', ambiente: '01', codGen, fechaEmi: fechaYmd,
            estado: 'NO ENCONTRADO', estadoRaw: '', tipoDte: '', tipoDteNorm: 'SIN_TIPO',
            relacionados: [], error: ''
          };

          resultados.push(mejor);
        } catch (err) {
          resultados.push({
            ok: false, url: '', linkVisita: '', visitar: 'Abrir',
            host: '', ambiente: '01', codGen, fechaEmi: fechaYmd,
            estado: 'ERROR', estadoRaw: '', tipoDte: '', tipoDteNorm: 'SIN_TIPO',
            relacionados: [], error: err?.message || String(err)
          });
        }

        await page.waitForTimeout(180);
      }

      await page.close();
    })());
  }

  await Promise.all(workers);
  return resultados;
}

/* ========================= Excel helpers ========================= */
export const sheetNameSafe = (name) => {
  const bad = /[:\\/?*\[\]]/g;
  let s = (name || 'Hoja').replace(bad, ' ').trim();
  if (s.length > 31) s = s.slice(0, 31);
  return s || 'Hoja';
};

export function applyHyperlinks(ws) {
  const ref = ws['!ref']; if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const headers = {};
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
    const cell = ws[addr];
    if (cell && typeof cell.v === 'string') headers[cell.v] = C;
  }
  const colVisitar = headers['visitar'];
  const colLink = headers['linkVisita'];
  if (colVisitar === undefined || colLink === undefined) return;
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const aV = XLSX.utils.encode_cell({ r: R, c: colVisitar });
    const aL = XLSX.utils.encode_cell({ r: R, c: colLink });
    const url = ws[aL]?.v;
    if (typeof url === 'string' && url) {
      ws[aV] = ws[aV] || { t: 's', v: 'Abrir' };
      ws[aV].l = { Target: url };
    }
  }
}

export function buildWorkbook(resultados) {
  const wb = XLSX.utils.book_new();

  const wsAll = XLSX.utils.json_to_sheet(resultados);
  applyHyperlinks(wsAll);
  XLSX.utils.book_append_sheet(wb, wsAll, sheetNameSafe('Todos'));

  const tipos = ['FACTURA', 'COMPROBANTE DE CRÉDITO FISCAL', 'NOTA DE CRÉDITO'];
  for (const t of tipos) {
    const rows = resultados.filter(r => r?.tipoDteNorm === t);
    const ws = XLSX.utils.json_to_sheet(rows);
    applyHyperlinks(ws);
    XLSX.utils.book_append_sheet(wb, ws, sheetNameSafe(t));
  }

  const rechaz = resultados.filter(r => r?.estado === 'RECHAZADO' || r?.estado === 'INVALIDADO');
  const wsR = XLSX.utils.json_to_sheet(rechaz);
  applyHyperlinks(wsR);
  XLSX.utils.book_append_sheet(wb, wsR, sheetNameSafe('Rechazados'));

  const relAll = [];
  for (const r of resultados) {
    const parent = r.codGen || r.codigoGeneracion || '';
    const tipoPadre = r.tipoDte || '';
    if (Array.isArray(r.relacionados) && r.relacionados.length) {
      for (const rel of r.relacionados) {
        relAll.push({
          codGenPadre: parent,
          tipoDtePadre: tipoPadre,
          fechaGeneracion: rel.fechaGeneracion,
          codigoGeneracion: rel.codigoGeneracion,
          selloRecepcion: rel.selloRecepcion,
          tipoDocumentacion: rel.tipoDocumentacion,
          linkVisita: r.linkVisita || r.url,
          visitar: 'Abrir'
        });
      }
    }
  }
  if (relAll.length) {
    const wsRel = XLSX.utils.json_to_sheet(relAll);
    applyHyperlinks(wsRel);
    XLSX.utils.book_append_sheet(wb, wsRel, sheetNameSafe('Relacionados'));
  }

  return wb;
}

/* Exporto XLSX por si lo quieres usar desde los routes */
export { XLSX };
