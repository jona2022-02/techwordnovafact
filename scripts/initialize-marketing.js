// scripts/initialize-marketing.js
const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');
const { initializeFirebaseCollections } = require('../lib/initializeFirebaseCollections');

// Configuración de Firebase - Reemplaza con tu configuración
const firebaseConfig = {
  // apiKey: "tu-api-key",
  // authDomain: "tu-auth-domain",
  // projectId: "tu-project-id",
  // storageBucket: "tu-storage-bucket",
  // messagingSenderId: "tu-sender-id",
  // appId: "tu-app-id"
};

async function initializeMarketingData() {
  try {
    console.log('🔄 Inicializando aplicación Firebase...');
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('✅ Firebase inicializado correctamente');
    
    console.log('🔄 Creando colecciones de membresía y marketing...');
    await initializeFirebaseCollections();
    
    console.log('✅ ¡Inicialización completada exitosamente!');
    console.log('📋 Se han creado/verificado las siguientes colecciones:');
    console.log('   ✓ membershipSettings (configuración de precios)');
    console.log('   ✓ marketing_plans (planes disponibles para usuarios)');
    console.log('   ✓ userMemberships (membresías de usuarios)');
    console.log('   ✓ paymentRecords (registros de pagos)');
    console.log('   ✓ memberships (membresías completas)');
    console.log('');
    console.log('🎯 Próximos pasos:');
    console.log('   1. Visita /admin/marketing para gestionar planes');
    console.log('   2. Visita la página principal para ver los planes');
    console.log('   3. Los usuarios ahora pueden ver los planes de membresía');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    
    if (error.message.includes('permission-denied')) {
      console.log('');
      console.log('🔧 SOLUCIÓN REQUERIDA:');
      console.log('1. Asegúrate de tener las reglas de Firestore configuradas correctamente');
      console.log('2. Si estás en desarrollo, considera usar el emulador de Firestore');
      console.log('3. Verifica que tu configuración de Firebase sea correcta');
    }
    
    process.exit(1);
  }
}

// Ejecutar inicialización
initializeMarketingData();