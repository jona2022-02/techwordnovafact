// scripts/test-public-api.js
// Probar la API pública para verificar funcionalidad

const https = require('https');

const BASE_URL = 'https://verificador-h4zxszcs8-jona2022-02s-projects.vercel.app';

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testPublicAPI() {
  console.log('🧪 Probando API pública del sistema...');
  console.log(`📍 URL: ${BASE_URL}/api/public-test`);
  console.log('');

  try {
    const response = await makeRequest(`${BASE_URL}/api/public-test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      }
    });

    console.log('📊 RESULTADOS:');
    console.log('═'.repeat(50));
    console.log(`🔌 Status: ${response.status}`);

    if (response.status === 200 && response.data.success) {
      console.log('✅ API pública funcionando correctamente');
      console.log('');
      
      const test = response.data.test;
      const systemStatus = response.data.systemStatus;
      
      console.log('🔥 ESTADO DEL SISTEMA:');
      console.log(`   🔗 Firebase: ${test.apis.firebase}`);
      console.log(`   📊 Firestore: ${test.apis.firestore}`);
      console.log(`   ✅ Operacional: ${systemStatus.operational ? '✅' : '❌'}`);
      console.log(`   🛠️ Listo para CRUD: ${systemStatus.readyForCRUD ? '✅' : '❌'}`);
      console.log(`   📋 Datos inicializados: ${systemStatus.dataInitialized ? '✅' : '❌'}`);
      
      console.log('');
      console.log('📁 COLECCIONES DE DATOS:');
      Object.entries(test.collections).forEach(([collection, count]) => {
        console.log(`   📂 ${collection}: ${count} documentos`);
      });
      
      console.log('');
      console.log('🎯 PRÓXIMOS PASOS:');
      response.data.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });

      if (systemStatus.operational && systemStatus.dataInitialized) {
        console.log('');
        console.log('🎉 ¡SISTEMA COMPLETAMENTE OPERACIONAL!');
        console.log('✅ Puedes proceder a usar todas las funcionalidades');
        console.log('🔐 Solo necesitas desactivar la protección de Vercel para acceso público');
      }

    } else {
      console.log('❌ Error en la API pública');
      console.log('Respuesta:', response.data);
    }

  } catch (error) {
    console.error('💥 Error al probar la API:', error.message);
  }
}

testPublicAPI();