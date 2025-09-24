import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId es requerido'
      }, { status: 400 });
    }
    
    const db = await getAdminDb();
    
    // 1. Obtener membresía del usuario
    const userMembershipDoc = await db.collection('userMemberships').doc(userId).get();
    const userMembership = userMembershipDoc.exists ? userMembershipDoc.data() : null;
    
    // 2. Obtener configuración de membresías
    const settingsDoc = await db.collection('membershipSettings').doc('default').get();
    const membershipSettings = settingsDoc.exists ? settingsDoc.data() : null;
    
    // 3. Obtener planes de membresía disponibles
    const membershipsSnapshot = await db.collection('memberships').get();
    const availableMemberships: Array<{ id: string; [key: string]: any }> = [];
    membershipsSnapshot.forEach(doc => {
      availableMemberships.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 4. Calcular estado de la membresía
    let hasValidMembership = false;
    let daysRemaining = 0;
    
    if (userMembership && userMembership.status === 'active') {
      const endDate = new Date(userMembership.endDate);
      const now = new Date();
      
      if (endDate > now) {
        hasValidMembership = true;
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        membership: userMembership,
        membershipSettings: membershipSettings,
        availableMemberships: availableMemberships,
        status: {
          hasValidMembership: hasValidMembership,
          daysRemaining: daysRemaining,
          isExpired: userMembership?.status === 'expired' || daysRemaining < 0,
          isActive: userMembership?.status === 'active' && hasValidMembership
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting user membership:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, membershipId } = body;
    
    if (!userId || !membershipId) {
      return NextResponse.json({
        success: false,
        error: 'userId y membershipId son requeridos'
      }, { status: 400 });
    }
    
    const db = await getAdminDb();
    
    // Verificar que la membresía existe
    const membershipDoc = await db.collection('memberships').doc(membershipId).get();
    if (!membershipDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Membresía no encontrada'
      }, { status: 404 });
    }
    
    // Crear o actualizar la membresía del usuario
    const userMembership = {
      userId: userId,
      membershipId: membershipId,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      autoRenew: true,
      paymentMethod: 'admin_assigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('userMemberships').doc(userId).set(userMembership, { merge: true });
    
    // También actualizar el documento del usuario
    await db.collection('users').doc(userId).update({
      membershipId: membershipId,
      membershipStatus: 'active',
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Membresía asignada exitosamente',
      data: userMembership
    });
    
  } catch (error) {
    console.error('Error assigning membership:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}