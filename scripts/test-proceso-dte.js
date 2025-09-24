// scripts/test-proceso-dte.js
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fetch = require('node-fetch');

// Configuración de Firebase (usa las mismas variables de entorno)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function testProcesoGuardado() {
  try {
    console.log('🧪 Iniciando prueba del guardado de proceso DTE...');

    // Datos de prueba
    const procesoData = {
      cantidadArchivos: 2,
      cantidadResultados: 10,
      tipoVerificacion: 'CSV',
      archivos: ['test1.csv', 'test2.csv'],
      resultados: {
        emitidos: 8,
        anulados: 1,
        rechazados: 1,
        invalidados: 0,
        errores: 0,
        montoTotal: 1500.50
      },
      duracionMs: 5000,
      exito: true
    };

    // Hacer la petición al endpoint
    const response = await fetch('http://localhost:3000/api/procesar-dte', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Nota: Necesitaríamos un token válido aquí para la prueba completa
        'Authorization': `Bearer TEST_TOKEN`
      },
      body: JSON.stringify(procesoData)
    });

    const responseText = await response.text();
    console.log('📥 Respuesta del servidor:', response.status, responseText);

    if (response.ok) {
      console.log('✅ Proceso guardado exitosamente');
    } else {
      console.log('❌ Error al guardar proceso');
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba si el script se llama directamente
if (require.main === module) {
  testProcesoGuardado();
}

module.exports = { testProcesoGuardado };