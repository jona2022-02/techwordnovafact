// app/api/verificararchjson/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'buffer'
import * as XLSX from 'xlsx'
import { put } from '@vercel/blob'
import { authenticate } from '@/lib/apiSecurity'
import { optimizedAuditService } from '@/lib/optimizedAuditService';
import { UserService } from '@/lib/userService';

import {
  launchBrowser,
  optimizarPagina,
  procesarFilasConPool,
  tryParseFechaFlexible,
  isProbableCodGen,
  buildWorkbook,
} from '@/lib/dteCommon'

// ------------------------- Tipos útiles -------------------------
type Fila = { codGen: string; fechaYmd: string }
type Resultado = Record<string, any>

type Extra = {
  // Emisor
  emisorNit?: string
  emisorNrc?: string
  emisorNombre?: string
  emisorCodActividad?: string
  emisorDescActividad?: string
  emisorNombreComercial?: string
  emisorTelefono?: string
  emisorCorreo?: string
  // Receptor
  receptorNit?: string
  receptorNrc?: string
  receptorNombre?: string
  receptorCodActividad?: string
  receptorDescActividad?: string
  receptorDepartamento?: string
  receptorMunicipio?: string
  receptorComplemento?: string
  receptorTelefono?: string
  receptorCorreo?: string
  receptorNombreComercial?: string
}

// ------------------------- Utilidades de parseo -------------------------

// Intenta parsear JSON (objeto o arreglo). Si falla, intenta NDJSON (línea por línea).
async function robustJSONParse(file: File): Promise<any[]> {
  const text = await file.text()

  // 1) JSON estándar
  try {
    const data = JSON.parse(text)
    return Array.isArray(data) ? data : [data]
  } catch {}

  // 2) NDJSON
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const arr: any[] = []
  for (const line of lines) {
    try {
      arr.push(JSON.parse(line))
    } catch {
      // ignorar líneas no-JSON
    }
  }
  return arr
}

// Extrae solo los campos solicitados de emisor/receptor
function extractExtraFromItem(it: any): Extra {
  const e = it?.emisor ?? {}
  const r = it?.receptor ?? {}
  const dirR = r?.direccion ?? {}

  return {
    // Emisor
    emisorNit: e?.nit ?? undefined,
    emisorNrc: e?.nrc ?? undefined,
    emisorNombre: e?.nombre ?? undefined,
    emisorCodActividad: e?.codActividad ?? undefined,
    emisorDescActividad: e?.descActividad ?? undefined,
    emisorNombreComercial: e?.nombreComercial ?? undefined,
    emisorTelefono: e?.telefono ?? undefined,
    emisorCorreo: e?.correo ?? undefined,
    // Receptor
    receptorNit: r?.nit ?? undefined,
    receptorNrc: r?.nrc ?? undefined,
    receptorNombre: r?.nombre ?? undefined,
    receptorCodActividad: r?.codActividad ?? undefined,
    receptorDescActividad: r?.descActividad ?? undefined,
    receptorDepartamento: dirR?.departamento ?? undefined,
    receptorMunicipio: dirR?.municipio ?? undefined,
    receptorComplemento: dirR?.complemento ?? undefined,
    receptorTelefono: r?.telefono ?? undefined,
    receptorCorreo: r?.correo ?? undefined,
    receptorNombreComercial: r?.nombreComercial ?? undefined,
  }
}

// Convierte items JSON -> filas {codGen, fechaYmd} y llena un mapa key->extra
function itemsToFilasAndExtras(
  items: any[],
  extrasByKey: Map<string, Extra>
): Fila[] {
  const out: Fila[] = []
  for (const it of items) {
    const ident = it?.identificacion ?? {}
    const cg = ident?.codigoGeneracion?.toString()?.trim() ?? ''
    const fvRaw = ident?.fecEmi

    const d = tryParseFechaFlexible(fvRaw)
    if (!isProbableCodGen(cg) || !d) continue

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const fechaYmd = `${y}-${m}-${dd}`

    const key = `${cg}|${fechaYmd}`
    const extra = extractExtraFromItem(it)
    // guarda/actualiza extra
    extrasByKey.set(key, { ...(extrasByKey.get(key) || {}), ...extra })

    out.push({ codGen: cg, fechaYmd })
  }
  return out
}

// ------------------------------- Handler -------------------------------

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

  try {
    const form = await req.formData()
    const files = form.getAll('files') as File[]
    const unico = form.get('file') as File | null
    if ((!files || files.length === 0) && !unico) {
      // Log de error si hay usuario
      if (userInfo) {
        const userData = await UserService.getUserById(userInfo.uid);
        await optimizedAuditService.logDTEProcessing({
          userId: userInfo.uid,
          userEmail: userInfo.email,
          userRole: userData?.role || 'client',
          tipoVerificacion: 'JSON',
          cantidadArchivos: 0,
          nombreArchivos: [],
          cantidadResultados: 0,
          duracionMs: Date.now() - startTime,
          exito: false,
          errorMessage: 'No se proporcionaron archivos JSON',
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined
        });
      }
      return new Response('No se proporcionaron archivos JSON.', { status: 400 })
    }
    if (unico) files.push(unico)

  // 1) Parsear todos los JSON -> filas {codGen, fechaYmd} + mapa key->extra
  const filas: Fila[] = []
  const extrasByKey = new Map<string, Extra>()
  const errores: Resultado[] = []

  for (const f of files) {
    try {
      const items = await robustJSONParse(f)
      const extraidas = itemsToFilasAndExtras(items, extrasByKey)

      if (extraidas.length === 0) {
        errores.push({
          url: '',
          linkVisita: '',
          visitar: 'Abrir',
          host: '',
          ambiente: '',
          codGen: '',
          fechaEmi: '',
          estado: 'ERROR',
          error:
            'No se encontraron campos identificacion.codigoGeneracion / identificacion.fecEmi válidos en el JSON.',
        })
      } else {
        filas.push(...extraidas)
      }
    } catch (e: any) {
      errores.push({
        url: '',
        linkVisita: '',
        visitar: 'Abrir',
        host: '',
        ambiente: '',
        codGen: '',
        fechaEmi: '',
        estado: 'ERROR',
        error: `Error al procesar ${f.name}: ${e?.message || String(e)}`,
      })
    }
  }

  // Deduplicar por (codGen|fechaYmd)
  const seen = new Set<string>()
  const dedup: Fila[] = []
  for (const r of filas) {
    const key = `${r.codGen}|${r.fechaYmd}`
    if (!seen.has(key)) {
      seen.add(key)
      dedup.push(r)
    }
  }

  if (dedup.length === 0 && errores.length > 0) {
    // Solo errores de parseo
    return NextResponse.json({ resultados: errores })
  }
  if (dedup.length === 0) {
    return new Response(
      'No se encontraron filas válidas. Se espera identificacion.codigoGeneracion y identificacion.fecEmi en los JSON.',
      { status: 400 }
    )
  }

  // 2) Consultar en Hacienda con Playwright (misma lógica que /api/verificarcodyfecha)
  let browser: any = null
  let resultados: Resultado[] = []
  try {
    browser = await launchBrowser()
    const ctx = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) VerificadorDTE/1.0 Chrome Safari',
    })
    // Precalentar una página
    const p = await ctx.newPage()
    await optimizarPagina(p)
    await p.close()

    const consultados = await procesarFilasConPool(ctx, dedup, 2)

    // 2.1) MERGE: inyecta los campos emisor/receptor extraídos del JSON en cada resultado
    for (const r of consultados) {
      const cg = (r?.codGen || '').toString()
      const fe = (r?.fechaEmi || '').toString() // procesarFilasConPool devuelve la misma YYYY-MM-DD que enviamos
      const key = `${cg}|${fe}`
      const extra = extrasByKey.get(key)
      if (extra) Object.assign(r, extra)
    }

    resultados = [...errores, ...consultados]
    await ctx.close()
  } finally {
    if (browser) await browser.close()
  }

  // 3) Excel (pestañas: Todos / Tipos / Rechazados / Relacionados)
  const wb = buildWorkbook(resultados)
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
  const filename = `verificacion_json_${Date.now()}.xlsx`
  const contentType =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  const payloadBase = { filename, total: resultados.length, resultados }

  // Preparar respuesta
  let response;
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    const { url } = await put(filename, excelBuffer, {
      access: 'public',
      contentType,
      token,
    })
    response = NextResponse.json({ ...payloadBase, downloadUrl: url })
  } else {
    const excelBase64 = Buffer.from(excelBuffer).toString('base64')
    response = NextResponse.json({ ...payloadBase, excelBase64 })
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
      tipoVerificacion: 'JSON',
      cantidadArchivos: files.length,
      nombreArchivos: files.map(f => f.name),
      cantidadResultados: resultados.length,
      duracionMs,
      exito: true,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: {
        totalFilas: dedup.length,
        erroresJSON: errores.length,
        tiposUnicos: [...new Set(resultados.map((r: any) => r.tipoDte))],
        estadosUnicos: [...new Set(resultados.map((r: any) => r.estado))]
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
        tipoVerificacion: 'JSON',
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
    
    console.error('Error in JSON processing:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
}
