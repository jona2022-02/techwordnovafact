// app/api/auth/send-verification-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '../../../../lib/firebaseAdmin';
import { 
  setVerificationCode, 
  generateCode, 
  generatePasswordResetKey 
} from '../../../../lib/verification-codes';
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail 
} from '../../../../lib/emailService';
import { logger } from '../../../../lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { idToken, email, type = 'email-verification' } = await request.json();
    
    // Para verificación de email, requerimos token
    // Para reset de contraseña, solo requerimos email
    if (type === 'email-verification' && !idToken) {
      return NextResponse.json({ error: 'Token requerido para verificación de email' }, { status: 400 });
    }

    if (type === 'password-reset' && !email) {
      return NextResponse.json({ error: 'Email requerido para reset de contraseña' }, { status: 400 });
    }

    if (!['email-verification', 'password-reset'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de código no válido' }, { status: 400 });
    }

    let uid: string;
    let userEmail: string;

    if (type === 'email-verification') {
      // Verificar el token de Firebase
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      uid = decodedToken.uid;
      userEmail = decodedToken.email || '';

      if (!userEmail) {
        return NextResponse.json({ error: 'Email no encontrado en el token' }, { status: 400 });
      }
    } else {
      // Para reset de contraseña, verificar que el email existe
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        uid = userRecord.uid;
        userEmail = email;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Por seguridad, no revelar que el usuario no existe
          return NextResponse.json({ 
            success: true, 
            message: 'Si el email existe, recibirás un código de verificación' 
          });
        }
        throw error;
      }
    }

    // Generar código de verificación
    const verificationCode = generateCode();
    const expires = Date.now() + (1 * 60 * 1000); // 1 minuto

    // Generar clave única
    const key = type === 'password-reset' 
      ? generatePasswordResetKey(userEmail)
      : uid;

    // Guardar código
    setVerificationCode(key, {
      code: verificationCode,
      expires,
      email: userEmail,
      type: type as 'email-verification' | 'password-reset'
    });

    // Enviar email según el tipo
    let emailSent = false;
    if (type === 'email-verification') {
      emailSent = await sendVerificationEmail(userEmail, verificationCode);
    } else if (type === 'password-reset') {
      emailSent = await sendPasswordResetEmail(userEmail, verificationCode);
    }

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Error enviando el correo electrónico' }, 
        { status: 500 }
      );
    }

    logger.info('Código de verificación enviado', { 
      email: userEmail, 
      type, 
      uid,
      key: type === 'password-reset' ? key.substring(0, 20) + '...' : key
    });

    return NextResponse.json({ 
      success: true, 
      message: type === 'password-reset' 
        ? 'Si el email existe, recibirás un código de verificación'
        : 'Código enviado correctamente',
      key: type === 'password-reset' ? key : undefined, // Solo devolver key para reset de contraseña
      expiresIn: 1, // minutos
      // Solo para desarrollo - remover en producción
      devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    });

  } catch (error: any) {
    logger.error('Error enviando código de verificación', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
