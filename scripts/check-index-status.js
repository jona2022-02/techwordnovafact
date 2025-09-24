const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Configuración de Firebase
// NOTA: Este archivo requiere configurar las credenciales de Firebase
// Crea un archivo .env.local con las credenciales correspondientes
// o usa el archivo de credenciales JSON descargado desde Firebase Console

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : require('../firebase-service-account.json'); // Archivo no incluido en el repo

// Inicializar Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function checkIndexStatus() {
  console.log('🔍 Probando si el índice ya está listo...');
  
  try {
    // Intentar la consulta con orderBy
    const complexQuery = db.collection('marketing_plans')
      .where('isActive', '==', true)
      .orderBy('price', 'asc');
    
    const complexSnapshot = await complexQuery.get();
    console.log('✅ ¡Índice listo! Consulta con orderBy funciona correctamente');
    console.log('📊 Planes encontrados:', complexSnapshot.size);
    
    complexSnapshot.forEach(doc => {
      const planData = doc.data();
      console.log('📋', planData.name, '$' + planData.price);
    });
    
    return true;
  } catch (error) {
    if (error.message.includes('currently building')) {
      console.log('⏳ Índice aún se está construyendo... Usando consulta simple');
      return false;
    } else {
      console.error('❌ Error inesperado:', error.message);
      return false;
    }
  }
}

checkIndexStatus()
  .then((indexReady) => {
    if (indexReady) {
      console.log('🎉 ¡El sistema está totalmente optimizado!');
    } else {
      console.log('⚠️  Sistema funcionando con ordenamiento manual (temporalmente)');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });