// app/api/test-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';

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

    console.log('🔐 Verificando token:', token.substring(0, 20) + '...');
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
    console.log('🧪 Test de autenticación iniciado');
    
    // Verificar autenticación
    const authResult = await authenticate(request);
    if (authResult.error) {
      console.log('❌ Error de autenticación:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { user } = authResult;
    console.log('✅ Usuario autenticado:', user);

    return NextResponse.json({ 
      success: true,
      message: 'Autenticación exitosa',
      user: user
    });

  } catch (error: any) {
    console.error('❌ Error en test-auth:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
      { status: 500 }
    );
  }
}