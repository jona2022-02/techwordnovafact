// simple-init-marketing.js
const admin = require('firebase-admin');
require('dotenv').config();

// Verificar variables de entorno
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('❌ Error: No se encontraron las credenciales de Firebase');
  console.log('📋 Configura las variables de entorno necesarias:');
  console.log('   GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

// Configurar Firebase Admin
let app;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
  } else if (process.env.FIREBASE_PRIVATE_KEY) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
  }
  console.log('✅ Firebase Admin inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function createMarketingPlans() {
  const plans = [
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
        'Verificación masiva de DTEs',
        'Verificaciones ilimitadas',
        'Soporte telefónico prioritario',
        'Reportes avanzados',
        'Integración API',
        'Gestión de usuarios'
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
      description: 'Solución completa para grandes organizaciones',
      price: 25.00,
      currency: 'USD',
      duration: 30,
      features: [
        'Todo lo del Plan Profesional',
        'Soporte 24/7 dedicado',
        'Integraciones personalizadas',
        'Reportes executivos',
        'Gestión avanzada de roles',
        'Backup y restauración automática'
      ],
      isActive: true,
      isPopular: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    }
  ];

  console.log('🔄 Creando planes de marketing...');
  
  for (const plan of plans) {
    try {
      const planRef = db.collection('marketing_plans').doc(plan.id);
      const planDoc = await planRef.get();
      
      if (planDoc.exists) {
        console.log(`   ⚠️  Plan "${plan.name}" ya existe, actualizando...`);
        await planRef.update({
          ...plan,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await planRef.set(plan);
        console.log(`   ✅ Plan "${plan.name}" creado exitosamente`);
      }
    } catch (error) {
      console.error(`   ❌ Error creando plan "${plan.name}":`, error.message);
    }
  }
}

async function createMembershipSettings() {
  console.log('🔄 Creando configuración de membresías...');
  
  const settings = {
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

  try {
    const settingsRef = db.collection('membershipSettings').doc('default');
    const settingsDoc = await settingsRef.get();
    
    if (settingsDoc.exists) {
      console.log('   ⚠️  Configuración de membresías ya existe, actualizando...');
      await settingsRef.update({
        ...settings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await settingsRef.set(settings);
      console.log('   ✅ Configuración de membresías creada exitosamente');
    }
  } catch (error) {
    console.error('   ❌ Error creando configuración de membresías:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando configuración de Firebase Marketing...');
    console.log('');
    
    await createMembershipSettings();
    await createMarketingPlans();
    
    console.log('');
    console.log('🎉 ¡Inicialización completada exitosamente!');
    console.log('');
    console.log('📋 Colecciones creadas/actualizadas:');
    console.log('   ✓ membershipSettings');
    console.log('   ✓ marketing_plans');
    console.log('');
    console.log('🎯 Próximos pasos:');
    console.log('   1. Visita http://localhost:3000/admin/marketing');
    console.log('   2. Los planes deberían aparecer en la página');
    console.log('   3. Puedes crear, editar y gestionar planes desde ahí');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    
    if (error.message.includes('permission-denied')) {
      console.log('');
      console.log('🔧 POSIBLES SOLUCIONES:');
      console.log('1. Verifica que las reglas de Firestore permitan escritura');
      console.log('2. Ejecuta: npm run deploy-rules');
      console.log('3. Asegúrate de que tu usuario tenga permisos de admin');
    }
    
    process.exit(1);
  }
}

main();