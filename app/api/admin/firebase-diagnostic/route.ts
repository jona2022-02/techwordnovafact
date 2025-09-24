// app/api/admin/firebase-diagnostic/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Iniciando diagnóstico de Firebase...');
    
    const results = {
      clientSDK: false,
      adminSDK: false,
      firebaseAuth: false,
      envVars: {
        clientVars: [] as string[],
        adminVars: [] as string[]
      },
      userInfo: {
        uid: '',
        email: '',
        role: ''
      }
    };

    // 1. Verificar autenticación del usuario
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Token de autorización requerido',
        results 
      }, { status: 401 });
    }

    try {
      // 2. Verificar Firebase Admin SDK
      console.log('🔍 Verificando Firebase Admin SDK...');
      const decodedToken = await admin.auth().verifyIdToken(token);
      results.adminSDK = true;
      results.firebaseAuth = true;
      results.userInfo.uid = decodedToken.uid;
      results.userInfo.email = decodedToken.email || '';
      console.log('✅ Firebase Admin SDK funcional');

      // 3. Verificar acceso a Firestore
      console.log('🔍 Verificando acceso a Firestore Admin...');
      const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      if (userData) {
        results.userInfo.role = userData.role || 'client';
        console.log('✅ Acceso a Firestore funcional');
      } else {
        console.log('⚠️  Usuario no encontrado en Firestore');
      }

      if (userData?.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Permisos insuficientes - rol requerido: admin',
          results 
        }, { status: 403 });
      }

    } catch (adminError) {
      console.error('❌ Error con Firebase Admin SDK:', adminError);
      results.adminSDK = false;
      results.firebaseAuth = false;
    }

    // 4. Verificar variables de entorno cliente
    console.log('🔍 Verificando variables de entorno...');
    const clientEnvVars = [
      'NEXT_PUBLIC_FB_API_KEY',
      'NEXT_PUBLIC_FB_AUTH_DOMAIN', 
      'NEXT_PUBLIC_FB_PROJECT_ID',
      'NEXT_PUBLIC_FB_APP_ID'
    ];

    for (const envVar of clientEnvVars) {
      if (process.env[envVar]) {
        results.envVars.clientVars.push(`${envVar}: ✓`);
      } else {
        results.envVars.clientVars.push(`${envVar}: ✗ FALTANTE`);
      }
    }

    // 5. Verificar variables de entorno admin
    const adminEnvVars = [
      'FIREBASE_SERVICE_ACCOUNT_B64',
      'FIREBASE_SERVICE_ACCOUNT', 
      'FIREBASE_ADMIN_PROJECT_ID',
      'FIREBASE_ADMIN_CLIENT_EMAIL',
      'FIREBASE_ADMIN_PRIVATE_KEY'
    ];

    for (const envVar of adminEnvVars) {
      if (process.env[envVar]) {
        results.envVars.adminVars.push(`${envVar}: ✓`);
      } else {
        results.envVars.adminVars.push(`${envVar}: ✗ FALTANTE`);
      }
    }

    // 6. Probar operación básica de escritura
    console.log('🔍 Probando operación de escritura en Firestore...');
    try {
      const testRef = admin.firestore().collection('_test').doc('diagnostic');
      await testRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        test: true
      });
      
      // Limpiar el documento de prueba
      await testRef.delete();
      
      console.log('✅ Operaciones de escritura funcionan correctamente');
      results.clientSDK = true;
      
    } catch (writeError) {
      console.error('❌ Error en operación de escritura:', writeError);
      results.clientSDK = false;
    }

    console.log('🎉 Diagnóstico completado');
    console.log('📋 Resultados:', JSON.stringify(results, null, 2));

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'Diagnóstico completado' 
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    
    // Logging detallado
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Error interno del servidor durante diagnóstico', 
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}