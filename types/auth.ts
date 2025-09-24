// types/auth.ts
export type UserRole = 'admin' | 'client';

export interface Permission {
  id: string;
  name: string;
  description: string;
  route: string;
  icon: string;
}

export interface UserClaims {
  role: UserRole;
  permissions: string[]; // Array de IDs de permisos
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  permissions: string[];
  createdAt: string;
  lastLogin: string;
  isActive: boolean;
  phoneNumber?: string;
  // Campos de membresía
  membershipStatus?: 'activa' | 'desactivada' | 'bloqueada';
  membershipStartDate?: string;
  membershipEndDate?: string;
  currentMembershipId?: string;
}

// Permisos disponibles en el sistema
export const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: 'home',
    name: 'Inicio',
    description: 'Acceso a la página de inicio',
    route: '/home',
    icon: 'Home'
  },
  {
    id: 'verificador-individual',
    name: 'Verificador Individual',
    description: 'Verificar DTEs individualmente',
    route: '/verificadorDTE/verificacion_individual',
    icon: 'FileCheck'
  },
  {
    id: 'verificador-masivo',
    name: 'Verificador Masivo',
    description: 'Verificar múltiples DTEs',
    route: '/verificadorDTE/verificador',
    icon: 'Files'
  },
  {
    id: 'verificador-json',
    name: 'Verificador JSON',
    description: 'Verificar DTEs por archivo JSON',
    route: '/verificadorDTE/verificadorjson',
    icon: 'FileCode'
  },
  {
    id: 'verificador-codigo-fecha',
    name: 'Verificador por Código y Fecha',
    description: 'Verificar DTEs por código y fecha',
    route: '/verificadorDTE/verificarodyfecha',
    icon: 'Calendar'
  },
  {
    id: 'bancos-davivienda',
    name: 'Bancos Davivienda',
    description: 'Gestión de datos bancarios Davivienda',
    route: '/bancos/davivienda-194',
    icon: 'Building2'
  },
  {
    id: 'configuraciones',
    name: 'Configuraciones',
    description: 'Configuraciones del sistema',
    route: '/configuraciones',
    icon: 'Settings'
  },
  {
    id: 'usuarios',
    name: 'Gestión de Usuarios',
    description: 'Administrar usuarios y permisos',
    route: '/usuarios',
    icon: 'Users'
  },
  {
    id: 'membresias',
    name: 'Gestión de Membresías',
    description: 'Administrar membresías y precios',
    route: '/membership',
    icon: 'Crown'
  },
  {
    id: 'mi-membresia',
    name: 'Mi Membresía',
    description: 'Ver y gestionar mi membresía personal',
    route: '/mi-membresia',
    icon: 'Crown'
  },
  {
    id: 'mi-actividad',
    name: 'Mi Actividad',
    description: 'Ver historial de verificaciones y estadísticas personales',
    route: '/mi-actividad',
    icon: 'TrendingUp'
  },
  {
    id: 'admin-firebase',
    name: 'Inicializar Firebase',
    description: 'Configurar colecciones de Firebase',
    route: '/admin/firebase-init',
    icon: 'Database'
  },
  {
    id: 'admin-marketing',
    name: 'Gestión de Marketing',
    description: 'Administrar planes de membresía para usuarios',
    route: '/admin/marketing',
    icon: 'TrendingUp'
  },
  {
    id: 'admin-reportes',
    name: 'Reportes de Actividad',
    description: 'Ver reportes y estadísticas de uso de clientes',
    route: '/admin/reportes',
    icon: 'BarChart3'
  },
  {
    id: 'admin-membership-requests',
    name: 'Solicitudes de Membresía',
    description: 'Gestionar solicitudes de membresía de usuarios',
    route: '/admin/membership-requests',
    icon: 'Users'
  },
  {
    id: 'debug-permissions',
    name: 'Debug de Permisos',
    description: 'Ver información detallada de permisos (desarrollo)',
    route: '/debug/permissions',
    icon: 'Settings'
  },
  {
    id: 'debug-memberships',
    name: 'Debug de Membresías',
    description: 'Ver información detallada de membresías (desarrollo)',
    route: '/debug/memberships',
    icon: 'Database'
  }
];

// Roles predefinidos con permisos por defecto
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: AVAILABLE_PERMISSIONS.map(p => p.id), // Admin tiene todos los permisos
  client: ['home', 'verificador-individual', 'verificador-json', 'mi-membresia', 'mi-actividad'] // Cliente tiene permisos básicos + su membresía + actividad
};

// Utilidades para manejar permisos
export function hasPermission(userPermissions: string[], permissionId: string): boolean {
  return userPermissions.includes(permissionId);
}

export function getPermissionByRoute(route: string): Permission | undefined {
  return AVAILABLE_PERMISSIONS.find(p => p.route === route);
}

export function getPermissionsByIds(permissionIds: string[]): Permission[] {
  return AVAILABLE_PERMISSIONS.filter(p => permissionIds.includes(p.id));
}