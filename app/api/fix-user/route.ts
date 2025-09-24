import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    console.log('Checking user: alexanderhernandz78@gmail.com');
    
    const auth = await getAdminAuth();
    const db = await getAdminDb();
    
    // Buscar usuario por email
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail('alexanderhernandz78@gmail.com');
      console.log('User found in Auth:', {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Usuario no encontrado en Firebase Auth',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Buscar en Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      // Usuario existe en Auth pero no en Firestore - vamos a crearlo
      console.log('User not found in Firestore, creating...');
      
      const userData = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || 'Alexander Hernandez',
        emailVerified: userRecord.emailVerified,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        permissions: {
          'admin.users.read': true,
          'admin.users.write': true,
          'admin.permissions.read': true,
          'admin.permissions.write': true,
          'admin.reports.read': true,
          'admin.reports.write': true,
          'verificadorDTE.read': true,
          'verificadorDTE.write': true
        },
        role: 'admin'
      };
      
      await db.collection('users').doc(userRecord.uid).set(userData);
      
      return NextResponse.json({
        success: true,
        message: 'Usuario creado en Firestore',
        action: 'created',
        userData: userData
      });
    } else {
      // Usuario existe, mostrar datos
      const userData = userDoc.data();
      return NextResponse.json({
        success: true,
        message: 'Usuario encontrado',
        action: 'found',
        userData: userData
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}