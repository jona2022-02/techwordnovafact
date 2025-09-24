// lib/hooks/useUserRole.ts
import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ClientAuthService } from '@/lib/clientAuthService';
import { UserRole, DEFAULT_ROLE_PERMISSIONS, AVAILABLE_PERMISSIONS } from '@/types/auth';

export interface UserClaims {
  role?: UserRole;
  permissions?: string[];
  [key: string]: any; // permite claims adicionales
}

export interface UseUserRoleResult {
  user: User | null;
  role: UserRole | null;
  permissions: string[];
  loading: boolean;
  hasPermission: (permissionId: string) => boolean;
  isAdmin: () => boolean;
  refreshClaims: () => Promise<void>;
}

// 🔧 Parser para evitar el error de ParsedToken
function parseUserClaims(claims: any): UserClaims {
  return {
    role: claims?.role ?? 'client',
    permissions: claims?.permissions ?? DEFAULT_ROLE_PERMISSIONS['client'],
  };
}

export function useUserRole(): UseUserRoleResult {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const updateUserClaims = async (currentUser: User) => {
    try {
      // Refrescar el token para obtener claims actualizados
      await currentUser.reload();
      const tokenResult = await currentUser.getIdTokenResult(true);

      const userClaims = parseUserClaims(tokenResult.claims);

      const userRole = userClaims.role ?? 'client';
      let userPermissions = userClaims.permissions ?? DEFAULT_ROLE_PERMISSIONS[userRole];

      // ✅ CORRECCIÓN: Si el usuario es admin, asegurar que tenga TODOS los permisos disponibles
      if (userRole === 'admin') {
        userPermissions = AVAILABLE_PERMISSIONS.map(p => p.id);
      }

      setRole(userRole);
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error obteniendo claims del usuario:', error);
      // Valores por defecto en caso de error
      setRole('client');
      setPermissions(DEFAULT_ROLE_PERMISSIONS['client']);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Inicializar usuario en Firestore si es necesario
          const token = await currentUser.getIdToken();
          await ClientAuthService.initializeUser(token, {
            email: currentUser.email || '',
            displayName: currentUser.displayName || undefined,
          });
        } catch (error) {
          console.error('Error inicializando usuario:', error);
        }
        
        // Actualizar claims
        await updateUserClaims(currentUser);
      } else {
        setRole(null);
        setPermissions([]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const hasPermission = (permissionId: string): boolean => {
    // Los administradores siempre tienen acceso a todo
    if (role === 'admin') {
      return true;
    }
    return permissions.includes(permissionId);
  };

  const isAdmin = (): boolean => {
    return role === 'admin';
  };

  const refreshClaims = async (): Promise<void> => {
    if (user) {
      await updateUserClaims(user);
    }
  };

  return {
    user,
    role,
    permissions,
    loading,
    hasPermission,
    isAdmin,
    refreshClaims,
  };
}
