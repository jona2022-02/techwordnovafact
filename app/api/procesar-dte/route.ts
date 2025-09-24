// app/api/procesar-dte/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { procesosDteService } from '@/lib/procesosDteService';
import { CrearProcesoDTO } from '@/types/procesosDte';

// Prevent pre-rendering during build
export const dynamic = 'force-dynamic';

// Función de autenticación integrada
async function authenticate(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Token de autorización requerido' };
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return { error: 'Token de autorización inválido' };
    }

    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      }
    };

  } catch (error: any) {
    console.error('❌ Error en authenticate:', error);
    return { error: 'Token de autorización inválido o expirado' };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API procesar-dte: Iniciando request');
    
    // Verificar autenticación
    console.log('🔐 Verificando autenticación...');
    const authResult = await authenticate(request);
    if (authResult.error) {
      console.log('❌ Error de autenticación:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    if (!user) {
      console.log('❌ Usuario no encontrado en authResult');
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', user.uid, user.email);

    const body = await request.json() as CrearProcesoDTO;
    console.log('📦 Datos recibidos:', JSON.stringify(body, null, 2));

    // Validar datos requeridos
    if (body.cantidadArchivos === undefined || !body.archivos || !body.resultados || !body.tipoVerificacion) {
      console.log('❌ Datos incompletos:', {
        cantidadArchivos: body.cantidadArchivos !== undefined,
        archivos: !!body.archivos,
        resultados: !!body.resultados,
        tipoVerificacion: !!body.tipoVerificacion
      });
      return NextResponse.json(
        { error: 'Datos incompletos para guardar el proceso' }, 
        { status: 400 }
      );
    }

    // Guardar el proceso en Firestore usando Admin SDK
    console.log('💾 Guardando proceso en Firestore...');
    const procesoId = await procesosDteService.crearProcesoServer(
      user.uid,
      user.email || 'email@desconocido.com',
      body
    );

    console.log('✅ Proceso guardado con ID:', procesoId);

    return NextResponse.json({ 
      success: true, 
      procesoId,
      message: 'Proceso DTE guardado exitosamente' 
    });

  } catch (error: any) {
    console.error('❌ Error en API procesar-dte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
      { status: 500 }
    );
  }
}