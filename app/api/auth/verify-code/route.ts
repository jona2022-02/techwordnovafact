// app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { validateVerificationCode, deleteVerificationCode } from '@/lib/verification-codes';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { idToken, verificationCode, key, type = 'email-verification' } = await request.json();
    
    if (!verificationCode) {
      return NextResponse.json({ error: 'Código de verificación requerido' }, { status: 400 });
    }

    if (!['email-verification', 'password-reset'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de verificación no válido' }, { status: 400 });
    }

    let verificationKey: string;
    let uid: string | undefined;

    if (type === 'email-verification') {
      if (!idToken) {
        return NextResponse.json({ error: 'Token requerido para verificación de email' }, { status: 400 });
      }
      
      // Verificar el token de Firebase
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      uid = decodedToken.uid;
      verificationKey = uid;
    } else {
      if (!key) {
        return NextResponse.json({ error: 'Clave de verificación requerida para reset de contraseña' }, { status: 400 });
      }
      verificationKey = key;
    }

    // Validar el código usando la nueva función
    const validation = validateVerificationCode(verificationKey, verificationCode);
    
    if (!validation.isValid) {
      logger.warn('Código de verificación inválido', { 
        key: verificationKey.substring(0, 20) + '...',
        type,
        error: validation.error
      });
      
      return NextResponse.json({ 
        error: validation.error || 'Código incorrecto' 
      }, { status: 400 });
    }

    const codeData = validation.data!;

    // Verificar que el tipo coincide
    if (codeData.type !== type) {
      return NextResponse.json({ 
        error: 'Tipo de código incorrecto' 
      }, { status: 400 });
    }

    // Procesamiento según el tipo
    try {
      if (type === 'email-verification') {
        // Marcar al usuario como verificado
        await admin.auth().updateUser(uid!, {
          emailVerified: true,
        });

        // Limpiar el código usado
        deleteVerificationCode(verificationKey);

        logger.info('Email verificado correctamente', { uid, email: codeData.email });

        return NextResponse.json({ 
          success: true, 
          message: 'Email verificado correctamente'
        });

      } else if (type === 'password-reset') {
        // Para reset de contraseña, solo validamos el código
        // El cambio de contraseña se manejará en otro endpoint
        
        logger.info('Código de reset de contraseña verificado', { 
          email: codeData.email,
          key: verificationKey.substring(0, 20) + '...'
        });

        return NextResponse.json({ 
          success: true, 
          message: 'Código verificado correctamente',
          email: codeData.email,
          resetKey: verificationKey // Devolver la clave para el siguiente paso
        });
      }

    } catch (error: any) {
      logger.error('Error procesando verificación de código', { 
        error: error.message,
        type,
        key: verificationKey.substring(0, 20) + '...'
      });
      
      return NextResponse.json({ 
        error: 'Error procesando la verificación' 
      }, { status: 500 });
    }

  } catch (error: any) {
    logger.error('Error verificando código', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}