import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    console.log('=== DIAGNÓSTICO SIMPLIFICADO ===');
    
    const db = await getAdminDb();
    const auth = await getAdminAuth();
    
    const result = {
      timestamp: new Date().toISOString(),
      status: 'checking',
      collections: {
        users: { exists: false, count: 0 },
        memberships: { exists: false, count: 0 },
        procesoDTE: { exists: false, count: 0 },
        userMemberships: { exists: false, count: 0 }
      },
      user: {
        found: false,
        inAuth: false,
        inFirestore: false,
        data: null as any
      },
      tests: {
        write: false,
        read: false
      }
    };
    
    // 1. Verificar colecciones
    try {
      const usersSnap = await db.collection('users').limit(1).get();
      result.collections.users = { exists: true, count: usersSnap.size };
      
      const membershipsSnap = await db.collection('memberships').limit(1).get();
      result.collections.memberships = { exists: true, count: membershipsSnap.size };
      
      const procesosSnap = await db.collection('procesoDTE').limit(1).get();
      result.collections.procesoDTE = { exists: true, count: procesosSnap.size };
      
      const userMembershipsSnap = await db.collection('userMemberships').limit(1).get();
      result.collections.userMemberships = { exists: true, count: userMembershipsSnap.size };
    } catch (error) {
      console.error('Error checking collections:', error);
    }
    
    // 2. Verificar usuario
    try {
      const userRecord = await auth.getUserByEmail('alexanderhernandz78@gmail.com');
      result.user.inAuth = true;
      
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (userDoc.exists) {
        result.user.inFirestore = true;
        result.user.data = userDoc.data();
        result.user.found = true;
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
    
    // 3. Test de escritura
    try {
      const testDoc = await db.collection('test').add({
        message: 'Test write',
        timestamp: new Date().toISOString()
      });
      await testDoc.delete();
      result.tests.write = true;
    } catch (error) {
      console.error('Error in write test:', error);
    }
    
    // 4. Test de lectura
    try {
      await db.collection('users').limit(1).get();
      result.tests.read = true;
    } catch (error) {
      console.error('Error in read test:', error);
    }
    
    result.status = 'completed';
    
    return NextResponse.json({
      success: true,
      diagnostic: result,
      recommendations: [
        result.user.found ? '✅ Usuario OK' : '❌ Usuario necesita sincronización',
        result.tests.write ? '✅ Escritura OK' : '❌ Problema de escritura en BD',
        result.tests.read ? '✅ Lectura OK' : '❌ Problema de lectura en BD',
        result.collections.memberships.count > 0 ? '✅ Membresías OK' : '❌ Membresías necesitan inicialización'
      ]
    });
    
  } catch (error) {
    console.error('Diagnostic failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}