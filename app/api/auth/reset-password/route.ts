// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { getVerificationCode, deleteVerificationCode } from '@/lib/verification-codes';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { resetKey, newPassword } = await request.json();
    
    if (!resetKey || !newPassword) {
      return NextResponse.json({ 
        error: 'Clave de reset y nueva contraseña son requeridos' 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      }, { status: 400 });
    }

    // Verificar que existe el código de reset
    const codeData = getVerificationCode(resetKey);
    
    if (!codeData) {
      return NextResponse.json({ 
        error: 'Clave de reset no válida o expirada' 
      }, { status: 400 });
    }

    if (codeData.type !== 'password-reset') {
      return NextResponse.json({ 
        error: 'Tipo de clave incorrecta' 
      }, { status: 400 });
    }

    // Verificar si el código ha expirado
    if (Date.now() > codeData.expires) {
      deleteVerificationCode(resetKey);
      return NextResponse.json({ 
        error: 'La clave de reset ha expirado' 
      }, { status: 400 });
    }

    try {
      // Obtener el usuario por email
      const userRecord = await admin.auth().getUserByEmail(codeData.email);
      
      // Actualizar la contraseña
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword,
      });

      // Limpiar el código usado
      deleteVerificationCode(resetKey);

      logger.info('Contraseña reseteada correctamente', { 
        uid: userRecord.uid,
        email: codeData.email 
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Contraseña actualizada correctamente'
      });

    } catch (error: any) {
      logger.error('Error actualizando contraseña', { 
        error: error.message,
        email: codeData.email
      });

      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({ 
          error: 'Usuario no encontrado' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        error: 'Error actualizando la contraseña' 
      }, { status: 500 });
    }

  } catch (error: any) {
    logger.error('Error en reset de contraseña', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}