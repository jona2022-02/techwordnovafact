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