import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    console.log('=== VERIFICANDO SISTEMA DE MEMBRESÍAS ===');
    
    const db = await getAdminDb();
    const results: string[] = [];
    
    // 1. Verificar colección memberships
    const membershipsSnapshot = await db.collection('memberships').get();
    results.push(`📊 Memberships encontradas: ${membershipsSnapshot.size}`);
    
    const memberships: Array<{ id: string; [key: string]: any }> = [];
    membershipsSnapshot.forEach(doc => {
      memberships.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 2. Verificar colección membershipSettings
    const settingsDoc = await db.collection('membershipSettings').doc('default').get();
    const settingsExists = settingsDoc.exists;
    results.push(`⚙️ Configuración de membresías: ${settingsExists ? 'Existe' : 'No existe'}`);
    
    // 3. Verificar colección userMemberships
    const userMembershipsSnapshot = await db.collection('userMemberships').limit(10).get();
    results.push(`👥 Membresías de usuarios: ${userMembershipsSnapshot.size}`);
    
    return NextResponse.json({
      success: true,
      message: 'Verificación del sistema de membresías completada',
      results: results,
      data: {
        memberships: memberships,
        membershipSettings: settingsExists ? settingsDoc.data() : null,
        userMemberships: userMembershipsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })),
        collections: {
          memberships: membershipsSnapshot.size,
          membershipSettings: settingsExists ? 1 : 0,
          userMemberships: userMembershipsSnapshot.size
        }
      }
    });
    
  } catch (error) {
    console.error('Error verificando membresías:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('=== INICIALIZANDO SISTEMA DE MEMBRESÍAS ===');
    
    const db = await getAdminDb();
    const results = [];
    
    // 1. Crear memberships básicas
    const basicMemberships = [
      {
        id: 'free',
        name: 'Gratuita',
        price: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Verificación básica DTE', 'Hasta 10 verificaciones/mes'],
        limits: { verificaciones: 10 },
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 29.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Verificación ilimitada DTE', 'Reportes avanzados', 'Soporte prioritario'],
        limits: { verificaciones: -1 },
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'enterprise',
        name: 'Empresarial',
        price: 99.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Todo incluido', 'API access', 'Integración personalizada'],
        limits: { verificaciones: -1 },
        active: true,
        createdAt: new Date().toISOString()
      }
    ];
    
    for (const membership of basicMemberships) {
      await db.collection('memberships').doc(membership.id).set(membership, { merge: true });
      results.push(`✅ Membership ${membership.name} creada/actualizada`);
    }
    
    // 2. Crear configuración de membresías
    const membershipSettings = {
      monthlyPrice: 29.99,
      currency: 'USD',
      isActive: true,
      description: 'Acceso completo a todas las funcionalidades',
      features: [
        'Verificación ilimitada de DTEs',
        'Reportes avanzados',
        'Soporte prioritario',
        'API de integración'
      ],
      trialDays: 7,
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('membershipSettings').doc('default').set(membershipSettings, { merge: true });
    results.push('✅ Configuración de membresías actualizada');
    
    // 3. Crear membresía para usuario admin
    try {
      const userRecord = await (await import('@/lib/firebaseAdmin')).getAdminAuth().then(auth => 
        auth.getUserByEmail('alexanderhernandz78@gmail.com')
      );
      
      const adminMembership = {
        userId: userRecord.uid,
        membershipId: 'enterprise',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
        autoRenew: true,
        paymentMethod: 'admin_grant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('userMemberships').doc(userRecord.uid).set(adminMembership, { merge: true });
      results.push('✅ Membresía admin asignada');
      
      // También actualizar el documento del usuario
      await db.collection('users').doc(userRecord.uid).update({
        membershipId: 'enterprise',
        membershipStatus: 'active',
        membershipStartDate: adminMembership.startDate,
        updatedAt: new Date().toISOString()
      });
      results.push('✅ Usuario admin actualizado con membresía');
      
    } catch (userError) {
      results.push(`⚠️ Error asignando membresía admin: ${userError}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sistema de membresías inicializado correctamente',
      results: results,
      nextSteps: [
        'Las membresías ya están disponibles',
        'El usuario admin tiene acceso completo',
        'Puede verificar en /admin/data-management',
        'El sistema está listo para usar'
      ]
    });
    
  } catch (error) {
    console.error('Error inicializando membresías:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}