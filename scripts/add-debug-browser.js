// Función para verificar y actualizar permisos de administrador
// Ejecuta esto en la consola del navegador en Firebase Console o en tu app

async function addDebugPermissionToAdmin() {
  try {
    // Esto debe ejecutarse desde el contexto de tu aplicación web
    // o desde la consola de Firebase
    
    const response = await fetch('/api/admin/update-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add-permission',
        permission: 'debug-memberships'
      })
    });
    
    const result = await response.json();
    console.log('Resultado:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Llamar la función
addDebugPermissionToAdmin();