// app/api/verificarcodyfecha/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { put } from '@vercel/blob';
import * as XLSX from 'xlsx'; 
import { authenticate } from '@/lib/apiSecurity';
import { optimizedAuditService } from '@/lib/optimizedAuditService';
import { UserService } from '@/lib/userService';

import {
  launchBrowser, optimizarPagina, procesarFilasConPool,
  parseCSV_codFecha, parseXLSX_codFecha, buildWorkbook
} from '@/lib/dteCommon';

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
    const formData = await req.formData();
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
          tipoVerificacion: 'CODIGO_FECHA',
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

    // 1) Leer XLSX/CSV y construir [{codGen, fechaYmd}]
    const filas: any[] = [];
    for (const f of archivos) {
      const buf = Buffer.from(await f.arrayBuffer());
      const name = (f.name || '').toLowerCase();
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        parseXLSX_codFecha(buf).forEach((x: any) => filas.push(x));
      } else {
        parseCSV_codFecha(buf.toString('utf8')).forEach((x: any) => filas.push(x));
      }
    }
    
    if (!filas.length) {
      // Log de error si hay usuario
      if (userInfo) {
        const userData = await UserService.getUserById(userInfo.uid);
        await optimizedAuditService.logDTEProcessing({
          userId: userInfo.uid,
          userEmail: userInfo.email,
          userRole: userData?.role || 'client',
          tipoVerificacion: 'CODIGO_FECHA',
          cantidadArchivos: archivos.length,
          nombreArchivos: archivos.map(f => f.name),
          cantidadResultados: 0,
          duracionMs: Date.now() - startTime,
          exito: false,
          errorMessage: 'No se encontraron filas válidas en los archivos',
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined
        });
      }
      return new Response(
        'No se encontraron filas válidas. Se espera CSV/XLSX con columnas: codGen,fecha (yyyy-MM-dd o dd/MM/yyyy).',
        { status: 400 }
      );
    }

    // 2) Playwright
    let browser: any = null;
    let resultados: any[] = [];
    try {
      browser = await launchBrowser();
      const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) VerificadorDTE/1.0 Chrome Safari',
      });
      // (opcional) precalentar 1 página
      const p = await ctx.newPage(); 
      await optimizarPagina(p); 
      await p.close();

      resultados = await procesarFilasConPool(ctx, filas, 2);
      await ctx.close();
    } finally {
      if (browser) await browser.close();
    }

    // 3) Excel
    const wb = buildWorkbook(resultados);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    const filename = `verificacion_cod_fecha_${Date.now()}.xlsx`;
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const payloadBase = { filename, total: resultados.length, resultados };

    // Preparar respuesta
    let response: NextResponse;
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const { url } = await put(filename, excelBuffer, { access: 'public', contentType, token });
      response = NextResponse.json({ ...payloadBase, downloadUrl: url });
    } else {
      const excelBase64 = Buffer.from(excelBuffer).toString('base64');
      response = NextResponse.json({ ...payloadBase, excelBase64 });
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
        tipoVerificacion: 'CODIGO_FECHA',
        cantidadArchivos: archivos.length,
        nombreArchivos: archivos.map(f => f.name),
        cantidadResultados: resultados.length,
        duracionMs,
        exito: true,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        metadata: {
          totalFilas: filas.length,
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
        tipoVerificacion: 'CODIGO_FECHA',
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
    
    console.error('Error in codigo y fecha processing:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
}