import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    console.log('=== LOGIN DEBUG TEST ===');
    
    const { email, password } = await request.json();
    console.log('Testing login for:', email);
    
    const auth = await getAdminAuth();
    const db = await getAdminDb();
    
    // 1. Verificar si el usuario existe en Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('✅ User found in Firebase Auth:', userRecord.uid);
    } catch (error) {
      console.log('❌ User not found in Firebase Auth:', error);
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado en Firebase Auth',
        step: 'auth_lookup'
      });
    }
    
    // 2. Verificar si el usuario existe en Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (!userDoc.exists) {
      console.log('❌ User not found in Firestore');
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado en Firestore',
        step: 'firestore_lookup',
        authUser: {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified
        }
      });
    }
    
    const userData = userDoc.data();
    console.log('✅ User found in Firestore:', JSON.stringify(userData, null, 2));
    
    // 3. Verificar membresía
    let membershipData = null;
    if (userData?.membershipId) {
      const membershipDoc = await db.collection('memberships').doc(userData.membershipId).get();
      if (membershipDoc.exists) {
        membershipData = membershipDoc.data();
        console.log('✅ Membership found:', JSON.stringify(membershipData, null, 2));
      } else {
        console.log('⚠️ Membership referenced but not found:', userData.membershipId);
      }
    } else {
      console.log('⚠️ No membership ID in user data');
    }
    
    // 4. Verificar permisos
    const permissions = userData?.permissions || {};
    console.log('Permissions:', JSON.stringify(permissions, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Debug completo del login',
      data: {
        authUser: {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled
        },
        firestoreUser: userData,
        membership: membershipData,
        hasPermissions: Object.keys(permissions).length > 0,
        permissionCount: Object.keys(permissions).length
      }
    });
    
  } catch (error) {
    console.error('Login debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'general_error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Listar usuarios para debug
    const db = await getAdminDb();
    const usersSnapshot = await db.collection('users').limit(10).get();
    
    const users: any[] = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        email: data.email,
        name: data.name,
        hasPermissions: data.permissions ? Object.keys(data.permissions).length > 0 : false,
        membershipId: data.membershipId || null,
        createdAt: data.createdAt
      });
    });
    
    return NextResponse.json({
      success: true,
      message: 'Lista de usuarios en la base de datos',
      users: users,
      totalFound: users.length
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}