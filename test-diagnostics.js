// Test diagnóstico completo
const diagnosticsUrl = 'https://verificador-7kag0cuqn-jona2022-02s-projects.vercel.app/api/diagnostics';

console.log('🔍 Ejecutando diagnóstico completo de Firebase...');
console.log('📍 URL:', diagnosticsUrl);

fetch(diagnosticsUrl)
  .then(response => {
    console.log('📊 Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('\n📦 DIAGNÓSTICO COMPLETO:');
    console.log('═══════════════════════════════════════════');
    
    if (data.success) {
      console.log('\n🔧 VARIABLES DEL CLIENTE:');
      Object.entries(data.clientVars).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        console.log(`  ${status} ${key}: ${value || 'AUSENTE'}`);
      });
      
      console.log('\n🔧 VARIABLES DEL SERVIDOR:');
      Object.entries(data.serverVars).forEach(([key, value]) => {
        const status = key === 'firebaseServiceAccount' ? 
          (value === 'Presente' ? '✅' : '❌') : 
          (value ? '✅' : '❌');
        console.log(`  ${status} ${key}: ${value}`);
      });
      
      // Diagnóstico final
      const allClientVarsPresent = Object.values(data.clientVars).every(v => v && v !== 'undefined');
      const serverVarPresent = data.serverVars.firebaseServiceAccount === 'Presente';
      
      console.log('\n🎯 DIAGNÓSTICO FINAL:');
      console.log(`  ${allClientVarsPresent ? '✅' : '❌'} Variables del cliente`);
      console.log(`  ${serverVarPresent ? '✅' : '❌'} Variables del servidor`);
      
      if (allClientVarsPresent && serverVarPresent) {
        console.log('\n🎉 ¡CONFIGURACIÓN COMPLETA! Firebase debería funcionar.');
      } else {
        console.log('\n⚠️  CONFIGURACIÓN INCOMPLETA. Revisar variables faltantes.');
      }
      
    } else {
      console.log('❌ Error en diagnóstico:', data.error);
    }
    
  })
  .catch(error => {
    console.error('💥 Error en diagnóstico:', error);
  });