// Handler DELETE para borrado masivo de procesos DTE
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await authenticate(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    // Verificar si es administrador
    try {
      const userProfile = await RolesService.getUserProfile(user.uid);
      if (!userProfile || userProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Acceso denegado - Se requiere rol de administrador' }, { status: 403 });
      }
    } catch (roleError: any) {
      return NextResponse.json({ error: 'Error verificando permisos' }, { status: 500 });
    }

    // Leer filtros del body (JSON)
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
    }
    const { userId, fechaDesde, fechaHasta } = body;

    // Construir query para borrar documentos
    const adminDb = await (await import('@/lib/firebaseAdmin')).getAdminDb();
    const collectionRef = adminDb.collection('procesosdtes');
    let queryRef: any = collectionRef;
    if (userId) {
      queryRef = queryRef.where('userId', '==', userId);
    }
    if (fechaDesde) {
      queryRef = queryRef.where('fechaHora', '>=', new Date(fechaDesde));
    }
    if (fechaHasta) {
      queryRef = queryRef.where('fechaHora', '<=', new Date(fechaHasta));
    }

    // Obtener documentos a borrar
    const snapshot = await queryRef.get();
    const batch = adminDb.batch();
    let count = 0;
    snapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
      count++;
    });
    if (count === 0) {
      return NextResponse.json({ deleted: 0, message: 'No se encontraron procesos para borrar.' });
    }
    await batch.commit();
    return NextResponse.json({ deleted: count, message: `Se eliminaron ${count} procesos.` });
  } catch (error: any) {
    console.error('❌ Error en DELETE admin/procesos-dte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { procesosDteService } from '@/lib/procesosDteService';
import { RolesService } from '@/lib/rolesService';

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

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await authenticate(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    // Verificar si es administrador (método más simple)
    try {
      const userProfile = await RolesService.getUserProfile(user.uid);
      if (!userProfile || userProfile.role !== 'admin') {
        console.log('❌ Usuario no es admin:', {uid: user.uid, role: userProfile?.role});
        return NextResponse.json({ error: 'Acceso denegado - Se requiere rol de administrador' }, { status: 403 });
      }
      console.log('✅ Usuario admin verificado:', user.uid);
    } catch (roleError: any) {
      console.error('❌ Error verificando rol:', roleError);
      return NextResponse.json({ error: 'Error verificando permisos' }, { status: 500 });
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get('limite') || '50');
    const userId = searchParams.get('userId') || undefined;
    const fechaDesde = searchParams.get('fechaDesde') ? new Date(searchParams.get('fechaDesde')!) : undefined;
    const fechaHasta = searchParams.get('fechaHasta') ? new Date(searchParams.get('fechaHasta')!) : undefined;
    const soloExitosos = searchParams.get('soloExitosos') === 'true';

    // Obtener procesos usando método del servidor
    const procesos = await procesosDteService.obtenerTodosLosProcesosServer(limite, {
      fechaDesde,
      fechaHasta,
      soloExitosos,
      userId,
    });

    // Obtener estadísticas usando método del servidor
    const estadisticas = await procesosDteService.obtenerEstadisticasProcesosServer(userId);

    return NextResponse.json({ 
      procesos,
      estadisticas,
      total: procesos.length 
    });

  } catch (error: any) {
    console.error('❌ Error en API admin/procesos-dte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
      { status: 500 }
    );
  }
}