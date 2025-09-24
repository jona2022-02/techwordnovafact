import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    console.log('Testing database operations in production...');
    
    // 1. Obtener instancia de base de datos
    const db = await getAdminDb();
    console.log('✅ Database connection established');
    
    // 2. Probar consulta (leer datos)
    console.log('Testing read operation...');
    const usersSnapshot = await db.collection('users').limit(1).get();
    console.log(`✅ Read test: Found ${usersSnapshot.size} users`);
    
    // 3. Probar inserción de datos de prueba
    console.log('Testing write operation...');
    const testDoc = {
      type: 'test',
      message: 'Test from production',
      timestamp: new Date().toISOString(),
      environment: 'production'
    };
    
    const docRef = await db.collection('test_logs').add(testDoc);
    console.log(`✅ Write test: Document created with ID ${docRef.id}`);
    
    // 4. Verificar que se insertó correctamente
    const insertedDoc = await docRef.get();
    const insertedData = insertedDoc.data();
    console.log(`✅ Verification: Document retrieved with message "${insertedData?.message}"`);
    
    // 5. Limpiar - eliminar el documento de prueba
    await docRef.delete();
    console.log('✅ Cleanup: Test document deleted');
    
    return NextResponse.json({
      success: true,
      message: 'Database operations working correctly in production',
      tests: {
        connection: 'OK',
        read: 'OK',
        write: 'OK',
        verification: 'OK',
        cleanup: 'OK'
      },
      details: {
        usersFound: usersSnapshot.size,
        testDocId: docRef.id,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Database operations test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('Testing POST operation with data insertion...');
    
    const db = await getAdminDb();
    
    // Insertar un registro más completo
    const postTestDoc = {
      type: 'post_test',
      message: 'POST test from production API',
      timestamp: new Date().toISOString(),
      metadata: {
        userAgent: 'API Test',
        method: 'POST',
        environment: 'production'
      }
    };
    
    const docRef = await db.collection('api_tests').add(postTestDoc);
    
    // Verificar inserción
    const doc = await docRef.get();
    const data = doc.data();
    
    return NextResponse.json({
      success: true,
      message: 'POST database operation successful',
      documentId: docRef.id,
      insertedData: data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('POST database operation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}