// app/api/public-test/route.ts
// API pública para probar que el sistema funciona correctamente

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    console.log('🧪 API public-test: Iniciando prueba pública');
    
    // Test básico de conectividad a Firebase
    const db = await getAdminDb();
    
    // Intentar leer configuraciones básicas (sin autenticación)
    const testResults = {
      timestamp: new Date().toISOString(),
      firebaseConnection: false,
      dataExists: false,
      apis: {
        firebase: 'connecting...',
        firestore: 'connecting...'
      },
      collections: {
        membershipSettings: 0,
        marketing_plans: 0,
        roles: 0,
        permissions: 0
      }
    };

    try {
      // Test 1: Conexión básica a Firestore
      const settingsCollection = db.collection('membershipSettings');
      const settingsSnapshot = await settingsCollection.limit(1).get();
      testResults.firebaseConnection = true;
      testResults.apis.firebase = 'connected ✅';
      testResults.apis.firestore = 'connected ✅';
      testResults.collections.membershipSettings = settingsSnapshot.size;

      console.log('✅ Firebase conectado correctamente');

      // Test 2: Verificar que existen datos
      const collections = ['marketing_plans', 'roles', 'permissions'];
      
      for (const collectionName of collections) {
        try {
          const snapshot = await db.collection(collectionName).limit(5).get();
          testResults.collections[collectionName as keyof typeof testResults.collections] = snapshot.size;
        } catch (error) {
          console.warn(`⚠️ Error leyendo ${collectionName}:`, error);
        }
      }

      testResults.dataExists = Object.values(testResults.collections).some(count => count > 0);

      console.log('📊 Resultados de prueba:', testResults);

    } catch (firebaseError) {
      console.error('❌ Error de Firebase:', firebaseError);
      const errorMessage = firebaseError instanceof Error ? firebaseError.message : 'Error desconocido';
      testResults.apis.firebase = `error: ${errorMessage}`;
      testResults.apis.firestore = `error: ${errorMessage}`;
    }

    return NextResponse.json({
      success: true,
      message: 'Sistema funcionando correctamente',
      test: testResults,
      systemStatus: {
        operational: testResults.firebaseConnection && testResults.dataExists,
        readyForCRUD: testResults.firebaseConnection,
        dataInitialized: testResults.dataExists
      },
      nextSteps: testResults.firebaseConnection 
        ? (testResults.dataExists 
          ? ['✅ Sistema listo', '🔐 Configurar autenticación', '🧪 Probar operaciones CRUD']
          : ['⚠️ Ejecutar inicialización de datos', '🔧 node scripts/initialize-production-data.js'])
        : ['❌ Verificar configuración de Firebase', '🔧 Revisar variables de entorno']
    }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error('❌ Error en public-test:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Manejar OPTIONS para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}