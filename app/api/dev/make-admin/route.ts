// app/api/dev/make-admin/route.ts
// ⚠️  SOLO PARA DESARROLLO - ELIMINAR EN PRODUCCIÓN
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

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
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint no disponible en producción' }, { status: 404 });
  }

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

    console.log('🔧 Haciendo admin al usuario:', user.uid, user.email);

    // Actualizar el usuario a admin
    const adminDb = await getAdminDb();

    await adminDb.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      role: 'admin',
      permissions: ['admin_access', 'user_management', 'reports_access'],
      updatedAt: new Date(),
      createdAt: new Date(),
    }, { merge: true });

    console.log('✅ Usuario actualizado a administrador');

    return NextResponse.json({ 
      success: true,
      message: 'Usuario actualizado a administrador',
      user: {
        uid: user.uid,
        email: user.email,
        role: 'admin'
      }
    });

  } catch (error: any) {
    console.error('❌ Error haciendo admin:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
      { status: 500 }
    );
  }
}