import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

interface DiagnosticData {
  exists: boolean;
  count?: number;
  documents?: Array<{ id: string; data: any }>;
  error?: string;
}

interface UserData {
  auth?: {
    uid: string;
    email: string;
    emailVerified: boolean;
  };
  firestore?: any;
  error?: string;
}

interface TestResult {
  success: boolean;
  error?: string;
  count?: number;
  documentId?: string;
  data?: any;
  message?: string;
}

export async function GET() {
  try {
    console.log('=== DIAGNÓSTICO ESPECÍFICO DE PRODUCCIÓN ===');
    
    const db = await getAdminDb();
    const auth = await getAdminAuth();
    
    const diagnostics: {
      timestamp: string;
      collections: Record<string, DiagnosticData>;
      user: UserData;
      environment: {
        vercelEnv: string | undefined;
        nodeEnv: string | undefined;
        region: string | undefined;
      };
      firebase: {
        projectId: string | undefined;
        hasServiceAccount: boolean;
      };
      writeTest?: TestResult;
      readTest?: TestResult;
    } = {
      timestamp: new Date().toISOString(),
      collections: {},
      user: {},
      environment: {
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV,
        region: process.env.VERCEL_REGION
      },
      firebase: {
        projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT
      }
    };
    
    // 1. Verificar colecciones principales
    const collections = ['users', 'memberships', 'procesoDTE', 'userMemberships', 'membershipSettings'];
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).limit(5).get();
        diagnostics.collections[collectionName] = {
          exists: true,
          count: snapshot.size,
          documents: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
        };
      } catch (error) {
        diagnostics.collections[collectionName] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // 2. Verificar usuario específico
    try {
      const userRecord = await auth.getUserByEmail('alexanderhernandz78@gmail.com');
      diagnostics.user.auth = {
        uid: userRecord.uid,
        email: userRecord.email || 'No email',
        emailVerified: userRecord.emailVerified
      };
      
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (userDoc.exists) {
        diagnostics.user.firestore = userDoc.data();
      } else {
        diagnostics.user.firestore = null;
      }
    } catch (error) {
      diagnostics.user.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // 3. Intentar crear un documento de prueba
    try {
      const testDoc = {
        type: 'test_diagnostic',
        message: 'Test de escritura en producción',
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL_ENV || 'unknown'
      };
      
      const docRef = await db.collection('test_diagnostics').add(testDoc);
      diagnostics.writeTest = {
        success: true,
        documentId: docRef.id,
        message: 'Escritura exitosa'
      };
      
      // Leer el documento recién creado
      const createdDoc = await docRef.get();
      diagnostics.readTest = {
        success: createdDoc.exists,
        data: createdDoc.data()
      };
      
      // Limpiar - eliminar el documento de prueba
      await docRef.delete();
      
    } catch (error) {
      diagnostics.writeTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Diagnóstico específico de producción completado',
      diagnostics: diagnostics,
      recommendations: {
        collections: Object.entries(diagnostics.collections)
          .filter(([name, data]) => !data.exists || data.count === 0)
          .map(([name]) => `Inicializar colección: ${name}`),
        user: diagnostics.user.firestore ? 'Usuario OK' : 'Usuario necesita sincronización',
        database: diagnostics.writeTest?.success ? 'Base de datos funcional' : 'Problemas de escritura'
      }
    });
    
  } catch (error) {
    console.error('Diagnostic failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}