// Test script para verificar configuración de Firebase
const testUrl = 'https://verificador-pllemevgq-jona2022-02s-projects.vercel.app/api/public-test';

console.log('🔥 Probando conectividad Firebase en producción...');
console.log('📍 URL:', testUrl);

fetch(testUrl)
  .then(response => {
    console.log('📊 Status:', response.status);
    if (response.ok) {
      return response.json();
    } else {
      return response.text();
    }
  })
  .then(data => {
    console.log('📦 Respuesta:', data);
    if (typeof data === 'object') {
      console.log('✅ ¡Firebase conectado correctamente!');
    } else {
      console.log('❌ Problemas de conexión detectados');
    }
  })
  .catch(error => {
    console.error('💥 Error:', error);
  });