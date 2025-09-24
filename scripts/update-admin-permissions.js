// scripts/update-admin-permissions.js
import { adminDb, adminAuth } from '../lib/firebaseAdmin.js';
import { AVAILABLE_PERMISSIONS } from '../types/auth.js';

async function updateAdminPermissions() {
  try {
    console.log('🔄 Actualizando permisos de administradores...');
    
    // Obtener todos los permisos disponibles
    const allPermissions = AVAILABLE_PERMISSIONS.map(p => p.id);
    console.log(`📋 Total de permisos disponibles: ${allPermissions.length}`);
    
    // Buscar usuarios con role admin
    const usersSnapshot = await adminDb.collection('users')
      .where('role', '==', 'admin')
      .get();
    
    console.log(`👥 Administradores encontrados: ${usersSnapshot.docs.length}`);
    
    if (usersSnapshot.docs.length === 0) {
      console.log('ℹ️ No se encontraron usuarios administradores');
      return;
    }
    
    let updatedCount = 0;
    const batch = adminDb.batch();
    
    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      const currentPermissions = userData.permissions || [];
      
      // Verificar si ya tiene todos los permisos
      const missingPermissions = allPermissions.filter(
        permission => !currentPermissions.includes(permission)
      );
      
      if (missingPermissions.length > 0) {
        console.log(`🔧 Actualizando permisos para ${userData.email}`);
        console.log(`   Agregando: ${missingPermissions.join(', ')}`);
        
        batch.update(doc.ref, {
          permissions: allPermissions,
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
      } else {
        console.log(`✅ ${userData.email} ya tiene todos los permisos`);
      }
    });
    
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ ${updatedCount} administradores actualizados con éxito`);
    } else {
      console.log('ℹ️ No se requieren actualizaciones');
    }
    
    // Verificar que el permiso admin-reportes esté incluido
    if (allPermissions.includes('admin-reportes')) {
      console.log('✅ El permiso admin-reportes está disponible');
    } else {
      console.log('⚠️ El permiso admin-reportes NO está en la lista de permisos');
    }
    
  } catch (error) {
    console.error('❌ Error actualizando permisos:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  updateAdminPermissions()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

export { updateAdminPermissions };