// scripts/setup-database.js
const { execSync } = require('child_process');

console.log('🚀 Configurando base de datos para el sistema de membresías...\n');

try {
  // Verificar si Firebase CLI está instalado
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    console.log('✅ Firebase CLI detectado');
  } catch (error) {
    console.log('❌ Firebase CLI no encontrado');
    console.log('📦 Instala Firebase CLI ejecutando:');
    console.log('   npm install -g firebase-tools\n');
    process.exit(1);
  }

  // Verificar si el usuario está logueado
  try {
    execSync('firebase projects:list', { stdio: 'pipe' });
    console.log('✅ Usuario autenticado en Firebase');
  } catch (error) {
    console.log('❌ No estás logueado en Firebase');
    console.log('🔑 Inicia sesión ejecutando:');
    console.log('   firebase login\n');
    process.exit(1);
  }

  console.log('\n🔧 PASOS PARA CONFIGURAR LA BASE DE DATOS:\n');
  
  console.log('1️⃣ DESPLIEGAR REGLAS DE SEGURIDAD:');
  console.log('   firebase deploy --only firestore:rules');
  console.log('   (Esto configurará los permisos para las colecciones de membresía)\n');
  
  console.log('2️⃣ DESPLIEGAR ÍNDICES (OPCIONAL):');
  console.log('   firebase deploy --only firestore:indexes');
  console.log('   (Mejora el rendimiento de las consultas)\n');
  
  console.log('3️⃣ CREAR COLECCIONES INICIALES:');
  console.log('   Accede a tu aplicación como administrador y ve a:');
  console.log('   http://localhost:3000/admin/firebase-init');
  console.log('   Haz clic en "Inicializar Colecciones de Firebase"\n');
  
  console.log('4️⃣ VERIFICAR CONFIGURACIÓN:');
  console.log('   Ve a Firebase Console > Firestore Database');
  console.log('   Deberías ver las colecciones:');
  console.log('   - membershipSettings');
  console.log('   - userMemberships'); 
  console.log('   - paymentRecords\n');

  console.log('📋 ARCHIVOS CREADOS:');
  console.log('   ✅ firestore.rules - Reglas de seguridad');
  console.log('   ✅ firestore.indexes.json - Índices de consulta');
  console.log('   ✅ firebase.json - Configuración de Firebase');
  console.log('   ✅ scripts/initializeDatabase.ts - Script de inicialización\n');

  console.log('🎯 UNA VEZ CONFIGURADO PODRÁS:');
  console.log('   • Activar membresías desde Gestión de Usuarios');
  console.log('   • Ver membresías organizadas por estado');
  console.log('   • Suspender y reactivar membresías');
  console.log('   • Configurar precios y características\n');

} catch (error) {
  console.error('❌ Error en la configuración:', error.message);
}