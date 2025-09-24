// lib/authMiddleware.ts
import { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export interface AuthResult {
  user?: {
    uid: string;
    email?: string;
  };
  error?: string;
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Token de autorización requerido' };
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return { error: 'Token de autorización inválido' };
    }

    // Verificar el token con Firebase Admin
    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      }
    };

  } catch (error: any) {
    console.error('❌ Error en authMiddleware:', error);
    return { error: 'Token de autorización inválido o expirado' };
  }
}