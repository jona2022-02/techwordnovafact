// Debug temporal - Agrega esto a cualquier componente donde tengas acceso
// Por ejemplo en /home o /configuraciones

console.log('=== DEBUG PERMISOS ===');
console.log('Usuario:', user);
console.log('Rol:', role);
console.log('Permisos actuales:', permissions);
console.log('¿Tiene admin-marketing?', permissions.includes('admin-marketing'));
console.log('¿Es admin?', role === 'admin');
console.log('Todos los permisos disponibles:', AVAILABLE_PERMISSIONS.map(p => p.id));
console.log('====================');