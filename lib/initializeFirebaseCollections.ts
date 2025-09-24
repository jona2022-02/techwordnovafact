// lib/initializeFirebaseCollections.ts
import admin from '@/lib/firebaseAdmin';

// Datos iniciales para la configuración de membresías
const initialMembershipSettings = {
  id: 'default-membership',
  monthlyPrice: 15.0,
  currency: 'USD',
  isActive: true,
  description: 'Membresía Premium NovaFact',
  features: [
    'Acceso completo a verificadores de DTEs',
    'Procesamiento ilimitado de documentos',
    'Reportes y exportaciones sin límite',
    'Soporte técnico prioritario',
    'Gestión avanzada de usuarios',
    'Integración con APIs de terceros'
  ],
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};

// Planes de marketing iniciales
const initialMarketingPlans = [
  {
    id: 'plan-basico',
    name: 'Plan Básico',
    description: 'Perfecto para empezar con la verificación de DTEs',
    price: 10.00,
    currency: 'USD',
    duration: 30,
    features: [
      'Verificación individual de DTEs',
      'Hasta 100 verificaciones por mes',
      'Soporte por email',
      'Reportes básicos'
    ],
    isActive: true,
    isPopular: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system'
  },
  {
    id: 'plan-profesional',
    name: 'Plan Profesional',
    description: 'La mejor opción para empresas en crecimiento',
    price: 15.00,
    currency: 'USD',
    duration: 30,
    features: [
      'Verificación individual y masiva',
      'Verificaciones ilimitadas',
      'Soporte técnico prioritario',
      'Reportes avanzados y exportaciones',
      'Gestión de usuarios',
      'Integración con APIs'
    ],
    isActive: true,
    isPopular: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system'
  },
  {
    id: 'plan-empresarial',
    name: 'Plan Empresarial',
    description: 'Solución completa para grandes empresas',
    price: 25.00,
    currency: 'USD',
    duration: 30,
    features: [
      'Todo lo incluido en Plan Profesional',
      'Usuarios ilimitados',
      'Soporte telefónico 24/7',
      'Integración personalizada',
      'Reportes personalizados',
      'Gestión avanzada de permisos'
    ],
    isActive: true,
    isPopular: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system'
  }
];

/**
 * Inicializa las colecciones de Firebase con datos por defecto
 */
export async function initializeFirebaseCollections() {
  try {
    console.log('🔄 Iniciando inicialización de colecciones de Firebase...');
    console.log('🔍 Verificando conexión a Firebase Admin...');

    // Obtener referencia a la base de datos admin
    const db = admin.firestore();
    
    if (!db) {
      throw new Error('Base de datos de Firebase Admin no inicializada');
    }

    // 1. Crear colección membershipSettings si no existe
    console.log('🔍 Verificando colección membershipSettings...');
    const membershipSettingsRef = db.collection('membershipSettings').doc('default');
    const membershipSettingsDoc = await membershipSettingsRef.get();
    
    if (!membershipSettingsDoc.exists) {
      await membershipSettingsRef.set(initialMembershipSettings);
      console.log('✅ Colección membershipSettings creada con configuración por defecto');
    } else {
      console.log('ℹ️  Colección membershipSettings ya existe');
    }

    // 2. Crear colección marketing_plans con planes iniciales
    console.log('🔄 Creando planes de marketing iniciales...');
    console.log(`📝 Total de planes a crear: ${initialMarketingPlans.length}`);
    
    for (const plan of initialMarketingPlans) {
      console.log(`🔍 Verificando plan: ${plan.name} (${plan.id})`);
      const planRef = db.collection('marketing_plans').doc(plan.id);
      const planDoc = await planRef.get();
      
      if (!planDoc.exists) {
        await planRef.set(plan);
        console.log(`✅ Plan '${plan.name}' creado exitosamente`);
      } else {
        console.log(`ℹ️  Plan '${plan.name}' ya existe, omitiendo creación`);
      }
    }

    // 3. Verificar que existen las otras colecciones (se crearán automáticamente cuando se agreguen documentos)
    const collections = ['userMemberships', 'paymentRecords', 'memberships'];
    
    for (const collectionName of collections) {
      console.log(`ℹ️  Colección ${collectionName} lista para recibir documentos`);
    }

    console.log('🎉 Inicialización de colecciones completada exitosamente');
    console.log('📋 Colecciones creadas/verificadas:');
    console.log('   - membershipSettings (configuración de precios)');
    console.log('   - marketing_plans (planes disponibles para usuarios)');
    console.log('   - userMemberships (membresías de usuarios)');
    console.log('   - paymentRecords (registros de pagos)');
    console.log('   - memberships (membresías completas)');
    
    return true;

  } catch (error) {
    console.error('❌ Error inicializando colecciones de Firebase:', error);
    throw error;
  }
}

/**
 * Crea una membresía de ejemplo para un usuario (útil para testing)
 */
export async function createExampleMembership(userId: string) {
  try {
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const oneMonthLater = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const exampleMembership = {
      id: `membership-${userId}`,
      userId: userId,
      planId: 'plan-profesional', // Corregido: usar planId en lugar de membershipId
      status: 'active',
      startDate: now,
      endDate: oneMonthLater,
      isActive: true, // Corregido: usar isActive en lugar de autoRenew
      paymentMethod: 'credit_card',
      createdAt: now,
      updatedAt: now
    };

    const membershipRef = db.collection('userMemberships').doc(exampleMembership.id);
    await membershipRef.set(exampleMembership);

    console.log(`✅ Membresía de ejemplo creada para usuario ${userId}`);
    return exampleMembership;

  } catch (error) {
    console.error('❌ Error creando membresía de ejemplo:', error);
    throw error;
  }
}

/**
 * Crea un registro de pago de ejemplo
 */
export async function createExamplePaymentRecord(membershipId: string, userId: string) {
  try {
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const examplePayment = {
      id: `payment-${Date.now()}`,
      membershipId: membershipId,
      userId: userId,
      amount: 15.0,
      currency: 'USD',
      status: 'completed',
      paymentDate: now,
      paymentMethod: 'credit_card',
      transactionId: `txn-${Date.now()}`,
      notes: 'Pago inicial de membresía',
      createdAt: now
    };

    const paymentRef = db.collection('paymentRecords').doc(examplePayment.id);
    await paymentRef.set(examplePayment);

    console.log(`✅ Registro de pago de ejemplo creado: ${examplePayment.id}`);
    return examplePayment;

  } catch (error) {
    console.error('❌ Error creando registro de pago de ejemplo:', error);
    throw error;
  }
}

/**
 * Función para reinicializar todas las colecciones (usar con cuidado)
 */
export async function resetMembershipCollections() {
  try {
    console.log('⚠️  ADVERTENCIA: Reinicializando colecciones de membresía');
    
    const db = admin.firestore();
    
    // Esto solo resetea la configuración por defecto
    const membershipSettingsRef = db.collection('membershipSettings').doc('default');
    await membershipSettingsRef.set(initialMembershipSettings);
    
    console.log('✅ Configuración de membresía restablecida a valores por defecto');
    console.log('ℹ️  Nota: Las membresías de usuario existentes no fueron afectadas');

  } catch (error) {
    console.error('❌ Error reinicializando colecciones:', error);
    throw error;
  }
}