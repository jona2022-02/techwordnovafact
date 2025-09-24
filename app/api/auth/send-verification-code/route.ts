// app/api/auth/send-verification-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '../../../../lib/firebaseAdmin';
import { setVerificationCode, generateCode } from '../../../../lib/verification-codes';
import { sendVerificationEmail } from '../../../../lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    // Verificar el token de Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json({ error: 'Email no encontrado' }, { status: 400 });
    }

    // Generar código de verificación
    const verificationCode = generateCode();
    const expires = Date.now() + (10 * 60 * 1000); // 10 minutos

    // Guardar código
    setVerificationCode(uid, {
      code: verificationCode,
      expires,
      email,
    });

    // Enviar email con el código
    const emailSent = await sendVerificationEmail(email, verificationCode);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Error enviando el correo de verificación' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Código enviado correctamente',
      expiresIn: 10, // minutos
      // Solo para desarrollo - remover en producción
      devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    });

  } catch (error) {
    console.error('Error enviando código:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
