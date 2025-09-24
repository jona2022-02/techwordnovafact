import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

export async function POST() {
  try {
    console.log('=== ARREGLANDO SISTEMA COMPLETO ===');
    
    const db = await getAdminDb();
    const auth = await getAdminAuth();
    const results: string[] = [];
    
    // 1. Crear usuario admin si no existe
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail('alexanderhernandz78@gmail.com');
        results.push('✅ Usuario encontrado en Auth');
      } catch {
        userRecord = await auth.createUser({
          email: 'alexanderhernandz78@gmail.com',
          password: 'admin321',
          displayName: 'Alexander Hernandez',
          emailVerified: true
        });
        results.push('✅ Usuario creado en Auth');
      }
      
      // Sincronizar en Firestore
      const userData = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || 'Alexander Hernandez',
        emailVerified: true,
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
          'verificadorDTE.write': true,
          'procesaedte.read': true,
          'procesaedte.write': true,
          'bancos.read': true,
          'bancos.write': true
        },
        role: 'admin',
        membershipId: 'enterprise',
        membershipStatus: 'active'
      };
      
      await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
      results.push('✅ Usuario sincronizado en Firestore');
      
      // Crear membresía del usuario
      const userMembership = {
        userId: userRecord.uid,
        membershipId: 'enterprise',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
        paymentMethod: 'admin_grant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('userMemberships').doc(userRecord.uid).set(userMembership, { merge: true });
      results.push('✅ Membresía de usuario creada');
      
    } catch (error) {
      results.push(`❌ Error con usuario: ${error}`);
    }
    
    // 2. Crear membresías básicas
    try {
      const memberships = [
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
      
      for (const membership of memberships) {
        await db.collection('memberships').doc(membership.id).set(membership, { merge: true });
      }
      results.push('✅ Membresías básicas creadas');
    } catch (error) {
      results.push(`❌ Error con membresías: ${error}`);
    }
    
    // 3. Crear configuración de membresías
    try {
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
      results.push('✅ Configuración de membresías creada');
    } catch (error) {
      results.push(`❌ Error con configuración: ${error}`);
    }
    
    // 4. Inicializar colección de procesos con ejemplo
    try {
      const sampleProcess = {
        userId: 'system',
        tipo: 'verificacion_ejemplo',
        estado: 'completado',
        archivo: 'ejemplo.xml',
        resultado: {
          valido: true,
          errores: [],
          warnings: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('procesoDTE').add(sampleProcess);
      results.push('✅ Colección procesoDTE inicializada');
    } catch (error) {
      results.push(`❌ Error con procesoDTE: ${error}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sistema completamente arreglado',
      results: results,
      nextSteps: [
        'Login: alexanderhernandz78@gmail.com / admin321',
        'Verificar funcionalidades en /home',
        'Probar procesamiento de DTEs',
        'Revisar membresías en /mi-membresia'
      ]
    });
    
  } catch (error) {
    console.error('Fix system failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}