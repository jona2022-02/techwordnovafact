// scripts/add-debug-permission.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Configurar Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'verificadordtefinal',
  // Agregar las credenciales necesarias aquí si es necesario
};

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function addDebugPermission() {
  try {
    console.log('🔄 Agregando permiso de debug a administradores...');
    
    // Buscar usuarios con role admin
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();
    
    console.log(`👥 Administradores encontrados: ${usersSnapshot.docs.length}`);
    
    if (usersSnapshot.docs.length === 0) {
      console.log('ℹ️ No se encontraron usuarios administradores');
      return;
    }
    
    let updatedCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const currentPermissions = userData.permissions || [];
      
      // Verificar si ya tiene el permiso de debug
      if (!currentPermissions.includes('debug-memberships')) {
        console.log(`🔧 Agregando permiso debug-memberships a ${userData.email}`);
        
        await doc.ref.update({
          permissions: [...currentPermissions, 'debug-memberships'],
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
      } else {
        console.log(`✅ ${userData.email} ya tiene el permiso debug-memberships`);
      }
    }
    
    if (updatedCount > 0) {
      console.log(`✅ Se actualizaron ${updatedCount} administradores`);
    } else {
      console.log('ℹ️ No fue necesario actualizar ningún administrador');
    }
    
  } catch (error) {
    console.error('❌ Error al actualizar permisos:', error);
    process.exit(1);
  }
}

// Ejecutar el script
addDebugPermission()
  .then(() => {
    console.log('🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });