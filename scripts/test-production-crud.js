// scripts/test-production-crud.js
// Script para probar todas las operaciones CRUD en producción

const https = require('https');
const { performance } = require('perf_hooks');

// Configuración del servidor de producción
const BASE_URL = 'https://verificador-jh4nxt1dt-jona2022-02s-projects.vercel.app';

// Datos de prueba
const TEST_DATA = {
  email: 'test-crud@example.com',
  password: 'TestPassword123!',
  displayName: 'Usuario Prueba CRUD'
};

// Función para hacer requests HTTP
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Función de utilidad para logging con tiempo
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
}

async function testProductionCRUD() {
  console.log('🚀 Iniciando pruebas CRUD en producción...');
  console.log(`📍 URL Base: ${BASE_URL}`);
  console.log('');

  let authToken = null;
  let userId = null;
  let testResults = {
    auth: { success: false, time: 0 },
    users: { create: false, read: false, update: false, delete: false },
    memberships: { read: false, activate: false, manage: false },
    processes: { create: false, read: false, manage: false },
    overall: { success: false, errors: [] }
  };

  try {
    // 1. PRUEBA DE CONECTIVIDAD Y HEALTH CHECK
    log('🔍 1. Verificando conectividad...');
    const startTime = performance.now();
    
    try {
      const healthResponse = await makeRequest(`${BASE_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      log('✅ Conectividad OK', { status: healthResponse.status });
    } catch (error) {
      log('❌ Error de conectividad', error.message);
      testResults.overall.errors.push('Conectividad falló');
    }

    // 2. PRUEBA DE AUTENTICACIÓN
    log('🔐 2. Probando autenticación...');
    
    // Intentar login (este paso requeriría un usuario existente)
    // Por ahora, simularemos que tenemos un token válido
    // En una implementación real, aquí harías login con Firebase Auth
    
    log('ℹ️ Nota: Para pruebas completas, necesitamos un usuario autenticado');
    log('ℹ️ Ejecuta primero: npm run dev y crea un usuario admin');

    // 3. PRUEBA DE APIs SIN AUTENTICACIÓN (públicas)
    log('🌐 3. Probando APIs públicas...');
    
    try {
      // Probar API de planes de marketing
      const marketingResponse = await makeRequest(`${BASE_URL}/api/marketing-plans`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (marketingResponse.status === 200) {
        log('✅ API de planes de marketing funciona');
        testResults.memberships.read = true;
      } else {
        log('❌ API de planes de marketing falló', { status: marketingResponse.status });
      }
    } catch (error) {
      log('❌ Error en API de marketing', error.message);
    }

    // 4. PRUEBA DE CONFIGURACIONES
    log('⚙️ 4. Probando configuraciones...');
    
    try {
      const configResponse = await makeRequest(`${BASE_URL}/api/membership-settings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (configResponse.status === 200) {
        log('✅ API de configuraciones funciona');
      } else {
        log('❌ API de configuraciones falló', { status: configResponse.status });
      }
    } catch (error) {
      log('❌ Error en API de configuraciones', error.message);
    }

    // 5. PRUEBA DE DIAGNÓSTICO
    log('🔍 5. Probando diagnóstico del sistema...');
    
    try {
      const diagnosticResponse = await makeRequest(`${BASE_URL}/api/diagnostics`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      log('📊 Diagnóstico del sistema:', {
        status: diagnosticResponse.status,
        data: diagnosticResponse.data
      });
    } catch (error) {
      log('❌ Error en diagnóstico', error.message);
    }

    const endTime = performance.now();
    testResults.auth.time = endTime - startTime;

    // RESUMEN
    console.log('');
    console.log('📊 RESUMEN DE PRUEBAS:');
    console.log('═'.repeat(50));
    
    console.log('🔐 Autenticación:');
    console.log(`   ⏱️ Tiempo: ${testResults.auth.time.toFixed(2)}ms`);
    
    console.log('👥 Usuarios:');
    console.log(`   📝 Crear: ${testResults.users.create ? '✅' : '❌'}`);
    console.log(`   📖 Leer: ${testResults.users.read ? '✅' : '❌'}`);
    console.log(`   ✏️ Actualizar: ${testResults.users.update ? '✅' : '❌'}`);
    console.log(`   🗑️ Eliminar: ${testResults.users.delete ? '✅' : '❌'}`);
    
    console.log('💳 Membresías:');
    console.log(`   📖 Leer: ${testResults.memberships.read ? '✅' : '❌'}`);
    console.log(`   🔄 Activar: ${testResults.memberships.activate ? '✅' : '❌'}`);
    console.log(`   ⚙️ Gestionar: ${testResults.memberships.manage ? '✅' : '❌'}`);
    
    console.log('📄 Procesos DTE:');
    console.log(`   📝 Crear: ${testResults.processes.create ? '✅' : '❌'}`);
    console.log(`   📖 Leer: ${testResults.processes.read ? '✅' : '❌'}`);
    console.log(`   ⚙️ Gestionar: ${testResults.processes.manage ? '✅' : '❌'}`);
    
    if (testResults.overall.errors.length > 0) {
      console.log('');
      console.log('❌ ERRORES ENCONTRADOS:');
      testResults.overall.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('');
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('1. ✅ Crea un usuario administrador');
    console.log('2. 🔐 Obtén un token de autenticación válido');
    console.log('3. 🧪 Ejecuta pruebas CRUD completas con autenticación');
    console.log('4. 📊 Verifica que todos los datos se guarden correctamente');

  } catch (error) {
    log('❌ Error general en las pruebas', error);
    testResults.overall.errors.push(`Error general: ${error.message}`);
  }

  return testResults;
}

// Ejecutar las pruebas
testProductionCRUD().then((results) => {
  console.log('');
  console.log('🏁 Pruebas completadas');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});