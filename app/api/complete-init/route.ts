import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

export async function POST() {
  try {
    console.log('=== INICIALIZACIÓN COMPLETA DE SISTEMA ===');
    
    const db = await getAdminDb();
    const auth = await getAdminAuth();
    const results = [];
    let userId = '';
    
    // 1. Verificar/Crear usuario admin
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail('alexanderhernandz78@gmail.com');
        results.push('✅ Usuario admin encontrado en Auth');
      } catch (error) {
        // Usuario no existe, crearlo
        userRecord = await auth.createUser({
          email: 'alexanderhernandz78@gmail.com',
          password: 'admin321',
          displayName: 'Alexander Hernandez',
          emailVerified: true
        });
        results.push('✅ Usuario admin creado en Auth');
      }
      
      userId = userRecord.uid;
      
      // Sincronizar datos en Firestore
      const userData = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || 'Alexander Hernandez',
        emailVerified: true,
        role: 'admin',
        membershipId: 'enterprise',
        membershipStatus: 'active',
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
          'bancos.write': true,
          'memberships.read': true,
          'memberships.write': true
        },
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
      results.push('✅ Usuario admin sincronizado en Firestore');
      
    } catch (userError) {
      results.push(`❌ Error con usuario admin: ${userError}`);
    }
    
    // 2. Inicializar membresías
    try {
      const memberships = [
        {
          id: 'free',
          name: 'Plan Gratuito',
          description: 'Acceso básico al verificador DTE',
          price: 0,
          currency: 'USD',
          billingCycle: 'monthly',
          features: ['Verificación básica DTE', 'Hasta 10 verificaciones/mes'],
          limits: { verificaciones: 10, procesamiento: 5 },
          active: true
        },
        {
          id: 'premium',
          name: 'Plan Premium',
          description: 'Acceso completo con funciones avanzadas',
          price: 29.99,
          currency: 'USD',
          billingCycle: 'monthly',
          features: ['Verificación ilimitada', 'Reportes avanzados', 'Exportación Excel', 'Soporte prioritario'],
          limits: { verificaciones: -1, procesamiento: -1 },
          active: true
        },
        {
          id: 'enterprise',
          name: 'Plan Empresarial',
          description: 'Solución completa para empresas',
          price: 99.99,
          currency: 'USD',
          billingCycle: 'monthly',
          features: ['Todo incluido', 'API de integración', 'Soporte 24/7', 'Personalización'],
          limits: { verificaciones: -1, procesamiento: -1, usuarios: -1 },
          active: true
        }
      ];
      
      for (const membership of memberships) {
        await db.collection('memberships').doc(membership.id).set({
          ...membership,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      results.push('✅ Membresías inicializadas');
      
    } catch (membershipError) {
      results.push(`❌ Error inicializando membresías: ${membershipError}`);
    }
    
    // 3. Configuración de membresías
    try {
      const membershipSettings = {
        monthlyPrice: 29.99,
        yearlyPrice: 299.99,
        currency: 'USD',
        trialDays: 7,
        isActive: true,
        description: 'Configuración del sistema de membresías',
        features: {
          free: ['Verificación básica', 'Hasta 10 consultas/mes'],
          premium: ['Verificación ilimitada', 'Reportes', 'Excel'],
          enterprise: ['Todo incluido', 'API', 'Soporte 24/7']
        },
        limits: {
          free: { verificaciones: 10, procesamiento: 5 },
          premium: { verificaciones: -1, procesamiento: 50 },
          enterprise: { verificaciones: -1, procesamiento: -1 }
        },
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('membershipSettings').doc('default').set(membershipSettings, { merge: true });
      results.push('✅ Configuración de membresías creada');
      
    } catch (settingsError) {
      results.push(`❌ Error con configuración de membresías: ${settingsError}`);
    }
    
    // 4. Asignar membresía al usuario admin
    if (userId) {
      try {
        const userMembership = {
          userId: userId,
          membershipId: 'enterprise',
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
          autoRenew: true,
          paymentMethod: 'admin_grant',
          grantedBy: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await db.collection('userMemberships').doc(userId).set(userMembership, { merge: true });
        results.push('✅ Membresía Enterprise asignada al admin');
        
      } catch (userMembershipError) {
        results.push(`❌ Error asignando membresía: ${userMembershipError}`);
      }
    }
    
    // 5. Inicializar colección de procesos con documento de ejemplo
    try {
      const sampleProcess = {
        userId: userId || 'system',
        userEmail: 'alexanderhernandz78@gmail.com',
        tipo: 'verificacion_individual',
        ambiente: '01',
        totalProcesados: 1,
        exitosos: 1,
        errores: 0,
        rechazados: 0,
        noEncontrados: 0,
        resultados: [{
          estado: 'EMITIDO',
          codigoGeneracion: 'sample-code-123',
          fechaHoraGeneracion: '2024-01-01 10:00:00',
          montoTotal: '100.00',
          tipoDte: 'FACTURA',
          error: ''
        }],
        stats: {
          emitidos: 1,
          anulados: 0,
          rechazados: 0,
          errores: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('procesoDTE').add(sampleProcess);
      results.push('✅ Colección procesoDTE inicializada con ejemplo');
      
    } catch (processError) {
      results.push(`❌ Error inicializando procesoDTE: ${processError}`);
    }
    
    // 6. Configuración del sistema
    try {
      const systemConfig = {
        version: '2.0.0',
        initialized: true,
        initializedAt: new Date().toISOString(),
        features: {
          verificadorDTE: true,
          memberships: true,
          bancos: true,
          reportes: true,
          usuarios: true,
          procesamiento: true
        },
        limits: {
          maxConcurrentProcesses: 4,
          maxItemsPerProcess: 10,
          defaultTrialDays: 7
        },
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('config').doc('system').set(systemConfig, { merge: true });
      results.push('✅ Configuración del sistema actualizada');
      
    } catch (configError) {
      results.push(`❌ Error con configuración: ${configError}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sistema completamente inicializado',
      results: results,
      summary: {
        collections: ['users', 'memberships', 'membershipSettings', 'userMemberships', 'procesoDTE', 'config'],
        adminUser: 'alexanderhernandz78@gmail.com',
        adminMembership: 'enterprise',
        systemReady: true
      },
      nextSteps: [
        '1. Login con alexanderhernandz78@gmail.com / admin321',
        '2. Verificar que aparezcan las membresías en /membership',
        '3. Probar el procesamiento de DTEs',
        '4. Verificar el panel de administración',
        '5. Sistema completamente funcional'
      ]
    });
    
  } catch (error) {
    console.error('System initialization failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}