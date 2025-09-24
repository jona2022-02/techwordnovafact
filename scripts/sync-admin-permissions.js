// scripts/sync-admin-permissions.js
const admin = require('firebase-admin');
const { UserService } = require('../lib/userService');
const { DEFAULT_ROLE_PERMISSIONS } = require('../types/auth');

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    // credential: admin.credential.applicationDefault(), // Usa esto para producción
    // projectId: 'tu-project-id', // Reemplaza con tu project ID
  });
}

async function syncAdminPermissions() {
  try {
    console.log('🔄 Sincronizando permisos de administradores...');
    
    // Obtener todos los usuarios
    const allUsers = await UserService.getAllUsers(1000);
    
    // Filtrar solo administradores
    const admins = allUsers.filter(user => user.role === 'admin');
    
    console.log(`📋 Encontrados ${admins.length} administradores`);
    
    if (admins.length === 0) {
      console.log('⚠️  No se encontraron administradores. Asegúrate de que existan usuarios con rol "admin"');
      return;
    }

    // Obtener todos los permisos disponibles para admin
    const { AVAILABLE_PERMISSIONS } = require('../types/auth');
    const allPermissions = AVAILABLE_PERMISSIONS.map(p => p.id);
    
    console.log(`🔑 Permisos disponibles: ${allPermissions.length}`);
    console.log('   Permisos:', allPermissions.join(', '));
    
    // Actualizar cada administrador
    for (const admin of admins) {
      try {
        console.log(`🔄 Actualizando permisos para: ${admin.email} (${admin.uid})`);
        
        await UserService.updateUserPermissions(admin.uid, allPermissions);
        
        console.log(`✅ Permisos actualizados para: ${admin.email}`);
      } catch (error) {
        console.error(`❌ Error actualizando ${admin.email}:`, error.message);
      }
    }
    
    console.log('🎉 ¡Sincronización completada!');
    console.log('');
    console.log('📝 Próximos pasos:');
    console.log('   1. Los administradores deben cerrar sesión y volver a iniciar');
    console.log('   2. Esto refrescará sus tokens con los nuevos permisos');
    console.log('   3. El módulo de Marketing ahora debería aparecer en el sidebar');
    
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    
    if (error.code === 'auth/project-not-found') {
      console.log('');
      console.log('🔧 CONFIGURACIÓN REQUERIDA:');
      console.log('1. Configura las credenciales de Firebase Admin');
      console.log('2. Asegúrate de que el projectId sea correcto');
      console.log('3. Verifica las variables de entorno');
    }
  }
}

// Ejecutar sincronización
syncAdminPermissions()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });