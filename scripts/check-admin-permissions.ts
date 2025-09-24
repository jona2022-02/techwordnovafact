// scripts/check-admin-permissions.ts
import { adminDb } from '../lib/firebaseAdmin';

async function checkAdminPermissions() {
  try {
    console.log('🔍 Verificando permisos de administradores...');
    
    const usersSnapshot = await adminDb.collection('users')
      .where('role', '==', 'admin')
      .get();
    
    console.log(`👥 Administradores encontrados: ${usersSnapshot.docs.length}`);
    
    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      const permissions = userData.permissions || [];
      console.log(`📋 ${userData.email}:`);
      console.log(`   Rol: ${userData.role}`);
      console.log(`   Permisos: ${permissions.length}`);
      console.log(`   Tiene admin-reportes: ${permissions.includes('admin-reportes')}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAdminPermissions();