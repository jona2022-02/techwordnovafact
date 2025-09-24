import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function POST() {
  try {
    console.log('=== INICIALIZANDO SISTEMA COMPLETO ===');
    
    const auth = await getAdminAuth();
    const db = await getAdminDb();
    const results = [];
    
    // 1. Crear/Actualizar usuario admin
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail('alexanderhernandz78@gmail.com');
      } catch (error) {
        // Usuario no existe en Auth, crear
        userRecord = await auth.createUser({
          email: 'alexanderhernandz78@gmail.com',
          password: 'admin321',
          displayName: 'Alexander Hernandez',
          emailVerified: true
        });
        results.push('✅ Usuario creado en Firebase Auth');
      }
      
      // Crear/Actualizar en Firestore
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
        role: 'admin'
      };
      
      await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
      results.push('✅ Usuario sincronizado en Firestore');
      
    } catch (error) {
      results.push(`❌ Error con usuario: ${error}`);
    }
    
    // 2. Inicializar membresías básicas
    try {
      const membershipsSnapshot = await db.collection('memberships').get();
      
      if (membershipsSnapshot.empty) {
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
          await db.collection('memberships').doc(membership.id).set(membership);
        }
        results.push('✅ Membresías inicializadas');
      } else {
        results.push('ℹ️ Membresías ya existen');
      }
    } catch (error) {
      results.push(`❌ Error con membresías: ${error}`);
    }
    
    // 3. Inicializar colección de procesos
    try {
      const processSnapshot = await db.collection('procesoDTE').get();
      
      if (processSnapshot.empty) {
        // Crear documento de ejemplo
        const sampleProcess = {
          userId: 'system',
          tipo: 'verificacion',
          estado: 'completado',
          archivo: 'sample_dte.xml',
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
      } else {
        results.push('ℹ️ Colección procesoDTE ya existe');
      }
    } catch (error) {
      results.push(`❌ Error con procesoDTE: ${error}`);
    }
    
    // 4. Verificar configuraciones necesarias
    try {
      const configDoc = await db.collection('config').doc('system').get();
      
      if (!configDoc.exists) {
        const systemConfig = {
          version: '1.0.0',
          initialized: true,
          initializedAt: new Date().toISOString(),
          features: {
            verificadorDTE: true,
            memberships: true,
            bancos: true,
            reportes: true
          }
        };
        
        await db.collection('config').doc('system').set(systemConfig);
        results.push('✅ Configuración del sistema inicializada');
      } else {
        results.push('ℹ️ Configuración del sistema ya existe');
      }
    } catch (error) {
      results.push(`❌ Error con configuración: ${error}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sistema inicializado completamente',
      results: results,
      nextSteps: [
        'Login con: alexanderhernandz78@gmail.com / admin321',
        'Verificar acceso a todas las secciones',
        'Probar funcionalidades de procesamiento',
        'Verificar membresías disponibles'
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