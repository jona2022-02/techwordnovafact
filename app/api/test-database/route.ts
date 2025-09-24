// app/api/test-database/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test 1: Verificar inicialización de Firebase Admin
    const adminAuth = await getAdminAuth();
    const adminDb = await getAdminDb();
    
    console.log('✅ Firebase Admin initialized successfully');

    // Test 2: Probar consulta a la base de datos
    const testCollection = adminDb.collection('test_connection');
    const querySnapshot = await testCollection.limit(1).get();
    
    console.log('✅ Database query successful');

    // Test 3: Probar inserción de datos
    const testDoc = {
      timestamp: new Date(),
      test: 'database_connection_test',
      environment: process.env.VERCEL_ENV || 'development',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    };

    const docRef = await testCollection.add(testDoc);
    console.log('✅ Database insert successful, doc ID:', docRef.id);

    // Test 4: Verificar que se puede leer el documento recién creado
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    
    console.log('✅ Database read-after-write successful');

    return NextResponse.json({
      success: true,
      message: 'Database operations working correctly',
      tests: {
        firebase_admin_init: '✅ Success',
        database_query: '✅ Success', 
        database_insert: '✅ Success',
        database_read: '✅ Success',
        document_id: docRef.id
      },
      environment: process.env.VERCEL_ENV || 'development',
      project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Database test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database operations failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      environment: process.env.VERCEL_ENV || 'development'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Testing database insertion with custom data...');
    
    const adminDb = await getAdminDb();
    
    // Insertar datos personalizados
    const testData = {
      ...body,
      timestamp: new Date(),
      test_type: 'custom_data_insert',
      environment: process.env.VERCEL_ENV || 'development'
    };

    const docRef = await adminDb.collection('test_custom_data').add(testData);
    
    return NextResponse.json({
      success: true,
      message: 'Custom data inserted successfully',
      document_id: docRef.id,
      inserted_data: testData
    });

  } catch (error: any) {
    console.error('❌ Custom data insertion failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Custom data insertion failed',
      error: error.message
    }, { status: 500 });
  }
}