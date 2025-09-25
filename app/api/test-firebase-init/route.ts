import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('🔥 Testing Firebase Admin initialization directly...');
    
    // Verificar si ya está inicializado
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin already initialized');
      return NextResponse.json({
        status: 'already_initialized',
        apps: admin.apps.length
      });
    }

    // Obtener variables de entorno
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    console.log('🔍 Environment check:');
    console.log('  - projectId:', projectId);
    console.log('  - rawCredentials length:', rawCredentials?.length);
    
    if (!projectId || !rawCredentials) {
      throw new Error('Missing required environment variables');
    }

    // Usar estrategia 3 que funcionó en debug
    console.log('📝 Parsing credentials with strategy 3...');
    let cleaned = rawCredentials.trim()
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    
    const serviceAccount = JSON.parse(cleaned);
    
    console.log('✅ Service account parsed');
    console.log('🔍 Service account fields:', Object.keys(serviceAccount));
    console.log('🔑 Private key length:', serviceAccount.private_key?.length);
    console.log('🔑 Private key starts with:', serviceAccount.private_key?.substring(0, 50));

    // Intentar inicializar Firebase Admin
    console.log('🚀 Attempting Firebase Admin initialization...');
    
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
    });
    
    console.log('✅ Firebase Admin initialized successfully!');
    
    // Probar operación básica
    const auth = admin.auth();
    console.log('✅ Auth service accessible');
    
    const db = admin.firestore();
    console.log('✅ Firestore service accessible');
    
    return NextResponse.json({
      status: 'success',
      message: 'Firebase Admin initialized and tested successfully',
      projectId: projectId,
      appName: app.name
    });

  } catch (error) {
    console.error('❌ Firebase Admin test failed:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}