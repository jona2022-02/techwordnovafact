import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    console.log('=== DIAGNÓSTICO COMPLETO ===');
    
    const auth = await getAdminAuth();
    const db = await getAdminDb();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      firebase: { connection: false, auth: false, firestore: false },
      user: { exists: false, inAuth: false, inFirestore: false, data: null as any },
      memberships: { collection: false, count: 0, sample: null as any },
      processes: { collection: false, count: 0, sample: null as any },
      collections: [] as string[]
    };
    
    // 1. Test Firebase connection
    try {
      diagnostics.firebase.connection = true;
      diagnostics.firebase.auth = !!auth;
      diagnostics.firebase.firestore = !!db;
    } catch (error) {
      console.error('Firebase connection failed:', error);
    }
    
    // 2. Check user alexanderhernandz78@gmail.com
    try {
      const userRecord = await auth.getUserByEmail('alexanderhernandz78@gmail.com');
      diagnostics.user.inAuth = true;
      
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (userDoc.exists) {
        diagnostics.user.inFirestore = true;
        diagnostics.user.data = userDoc.data();
        diagnostics.user.exists = true;
      }
    } catch (error) {
      console.log('User check failed:', error);
    }
    
    // 3. Check memberships collection
    try {
      const membershipsSnapshot = await db.collection('memberships').limit(5).get();
      diagnostics.memberships.collection = true;
      diagnostics.memberships.count = membershipsSnapshot.size;
      
      if (!membershipsSnapshot.empty) {
        const firstDoc = membershipsSnapshot.docs[0];
        diagnostics.memberships.sample = {
          id: firstDoc.id,
          data: firstDoc.data()
        };
      }
    } catch (error) {
      console.error('Memberships check failed:', error);
    }
    
    // 4. Check processes collection (diferentes posibles nombres)
    const processCollections = ['processes', 'procesos', 'procesoDTE', 'procesosDTE'];
    for (const collName of processCollections) {
      try {
        const snapshot = await db.collection(collName).limit(3).get();
        if (snapshot.size > 0) {
          diagnostics.processes.collection = true;
          diagnostics.processes.count += snapshot.size;
          if (!diagnostics.processes.sample) {
            const firstDoc = snapshot.docs[0];
            diagnostics.processes.sample = {
              collection: collName,
              id: firstDoc.id,
              data: firstDoc.data()
            };
          }
        }
      } catch (error) {
        console.log(`Collection ${collName} check failed:`, error);
      }
    }
    
    // 5. List all collections
    try {
      const collections = await db.listCollections();
      diagnostics.collections = collections.map(col => col.id);
    } catch (error) {
      console.error('Failed to list collections:', error);
    }
    
    // 6. Check auth endpoints
    const endpointTests = [];
    try {
      // Test sync-user endpoint
      const testResponse = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      endpointTests.push({
        endpoint: '/api/auth/sync-user',
        status: testResponse.status,
        accessible: testResponse.status !== 404
      });
    } catch (error) {
      endpointTests.push({
        endpoint: '/api/auth/sync-user',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Diagnóstico completo realizado',
      diagnostics: diagnostics,
      endpointTests: endpointTests,
      recommendations: {
        login: diagnostics.user.exists ? 'Usuario listo para login' : 'Usuario necesita ser creado/sincronizado',
        memberships: diagnostics.memberships.collection ? `${diagnostics.memberships.count} membresías encontradas` : 'No hay membresías - necesita inicialización',
        processes: diagnostics.processes.collection ? `Procesos encontrados en: ${diagnostics.processes.sample?.collection}` : 'No hay procesos guardados',
        collections: `Colecciones disponibles: ${diagnostics.collections.join(', ')}`
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