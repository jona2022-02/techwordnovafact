// app/api/admin/initialize-collections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseCollections, createExampleMembership, createExamplePaymentRecord } from '@/lib/initializeFirebaseCollections';
import admin from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    // Verificar que el usuario es admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Obtener el usuario desde Firestore para verificar su rol
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { action, userId } = await request.json();

    let result;

    switch (action) {
      case 'initialize':
        result = await initializeFirebaseCollections();
        return NextResponse.json({ 
          success: true, 
          message: 'Colecciones inicializadas exitosamente',
          data: result 
        });

      case 'create-example-membership':
        if (!userId) {
          return NextResponse.json({ error: 'userId requerido para crear membresía de ejemplo' }, { status: 400 });
        }
        const membership = await createExampleMembership(userId);
        const payment = await createExamplePaymentRecord(membership.id, userId);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Membresía de ejemplo creada exitosamente',
          data: { membership, payment }
        });

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en initialize-collections POST:', error);
    
    // Logging detallado para debug
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    // Verificar que el usuario es admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Obtener el usuario desde Firestore para verificar su rol
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Verificar estado de las colecciones
    const db = admin.firestore();
    
    const collections = {
      membershipSettings: false,
      userMemberships: false,
      paymentRecords: false
    };

    // Verificar membershipSettings
    const membershipSettingsRef = db.collection('membershipSettings').doc('default');
    const membershipSettingsDoc = await membershipSettingsRef.get();
    collections.membershipSettings = membershipSettingsDoc.exists;

    // Verificar userMemberships (solo check si la colección existe)
    const userMembershipsSnapshot = await db.collection('userMemberships').limit(1).get();
    collections.userMemberships = !userMembershipsSnapshot.empty;

    // Verificar paymentRecords
    const paymentRecordsSnapshot = await db.collection('paymentRecords').limit(1).get();
    collections.paymentRecords = !paymentRecordsSnapshot.empty;

    return NextResponse.json({ 
      success: true, 
      collections,
      message: 'Estado de colecciones obtenido exitosamente'
    });

  } catch (error) {
    console.error('Error verificando colecciones GET:', error);
    
    // Logging detallado para debug
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}