// app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { getVerificationCode, deleteVerificationCode } from '@/lib/verification-codes';

export async function POST(request: NextRequest) {
  try {
    const { idToken, verificationCode } = await request.json();
    
    if (!idToken || !verificationCode) {
      return NextResponse.json({ error: 'Token y código requeridos' }, { status: 400 });
    }

    // Verificar el token de Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Buscar el código almacenado para este usuario
    const storedCodeData = getVerificationCode(uid);
    
    if (!storedCodeData) {
      return NextResponse.json({ error: 'No hay código pendiente para este usuario' }, { status: 400 });
    }

    // Verificar si el código ha expirado
    if (Date.now() > storedCodeData.expires) {
      deleteVerificationCode(uid);
      return NextResponse.json({ error: 'El código ha expirado' }, { status: 400 });
    }

    // Verificar si el código coincide
    if (storedCodeData.code !== verificationCode.trim()) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
    }

    // Código correcto - marcar al usuario como verificado
    try {
      await admin.auth().updateUser(uid, {
        emailVerified: true,
      });

      // Limpiar el código usado
      deleteVerificationCode(uid);

      return NextResponse.json({ 
        success: true, 
        message: 'Email verificado correctamente'
      });

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      return NextResponse.json({ error: 'Error actualizando el estado de verificación' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error verificando código:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}