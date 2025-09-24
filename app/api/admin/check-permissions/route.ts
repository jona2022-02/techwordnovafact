// app/api/admin/check-permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { RolesService } from '@/lib/rolesService';

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
    console.log('🔍 Verificando permisos de administrador...');

    // Verificar autenticación
    const authResult = await authenticate(request);
    if (authResult.error) {
      console.log('❌ Error de autenticación:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', user.uid, user.email);

    // Verificar permisos de administrador
    try {
      const hasAdminAccess = await RolesService.userHasPermission(user.uid, 'admin_access');
      console.log('🔑 Permisos de admin_access:', hasAdminAccess);

      // También verificar el rol directamente
      const userProfile = await RolesService.getUserProfile(user.uid);
      console.log('👤 Perfil de usuario:', {
        uid: userProfile?.uid,
        email: userProfile?.email,
        role: userProfile?.role,
        permissions: userProfile?.permissions
      });

      return NextResponse.json({ 
        success: true,
        user: {
          uid: user.uid,
          email: user.email
        },
        hasAdminAccess,
        userProfile: userProfile ? {
          role: userProfile.role,
          permissions: userProfile.permissions
        } : null
      });

    } catch (permissionError: any) {
      console.error('❌ Error verificando permisos:', permissionError);
      return NextResponse.json({ 
        success: false,
        error: 'Error verificando permisos',
        details: permissionError.message,
        user: {
          uid: user.uid,
          email: user.email
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Error en check-permissions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
      { status: 500 }
    );
  }
}