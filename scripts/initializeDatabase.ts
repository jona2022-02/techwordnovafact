// scripts/initializeDatabase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirebaseCollections } from '../lib/initializeFirebaseCollections';

// Tu configuración de Firebase
const firebaseConfig = {
  // Añade aquí tu configuración de Firebase
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // storageBucket: "...",
  // messagingSenderId: "...",
  // appId: "..."
};

async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando aplicación Firebase...');
    
    // Inicializar Firebase (solo si no está ya inicializado)
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Si estás usando el emulador (desarrollo local), descomenta estas líneas:
    // if (process.env.NODE_ENV === 'development') {
    //   connectFirestoreEmulator(db, 'localhost', 8080);
    //   connectAuthEmulator(auth, 'http://localhost:9099');
    // }

    console.log('✅ Firebase inicializado correctamente');
    
    console.log('🔄 Creando colecciones de membresía...');
    await initializeFirebaseCollections();
    
    console.log('✅ Base de datos inicializada correctamente!');
    console.log('📋 Colecciones creadas:');
    console.log('   - membershipSettings (configuración de precios)');
    console.log('   - userMemberships (membresías de usuarios)');
    console.log('   - paymentRecords (registros de pagos)');
    
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        console.log('');
        console.log('🔧 SOLUCIÓN REQUERIDA:');
        console.log('1. Despliega las reglas de Firestore ejecutando:');
        console.log('   firebase deploy --only firestore:rules');
        console.log('');
        console.log('2. O configura las reglas manualmente en Firebase Console:');
        console.log('   https://console.firebase.google.com/project/TU_PROJECT_ID/firestore/rules');
        console.log('');
        console.log('3. Asegúrate de que tu usuario tenga permisos de admin en la colección users');
      } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log('');
        console.log('🔧 SOLUCIÓN REQUERIDA:');
        console.log('1. Verifica la configuración de Firebase en firebaseConfig');
        console.log('2. Asegúrate de que el proyecto existe en Firebase Console');
        console.log('3. Verifica que las credenciales sean correctas');
      }
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };