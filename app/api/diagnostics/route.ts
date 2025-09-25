import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Diagnóstico de variables de entorno...');
    
    // Verificar variables del cliente
    const clientVars = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.substring(0, 20) + '...'
    };

    // Verificar variables del servidor
    const serverVars = {
      firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT ? 'Presente' : 'Ausente',
      serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
      serviceAccountStart: process.env.FIREBASE_SERVICE_ACCOUNT?.substring(0, 20) || 'N/A'
    };

    return NextResponse.json({
      success: true,
      clientVars,
      serverVars,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en diagnóstico',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}