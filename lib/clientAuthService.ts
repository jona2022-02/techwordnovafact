// lib/clientAuthService.ts
/**
 * Servicio de autenticación para el lado del cliente
 * Hace llamadas a las APIs del servidor para operaciones que requieren firebase-admin
 */

export class ClientAuthService {
  
  /**
   * Inicializar un usuario recién registrado
   */
  static async initializeUser(idToken: string, userData: {
    email: string;
    displayName?: string;
    role?: 'admin' | 'client';
  }) {
    try {
      const response = await fetch('/api/auth/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Error al inicializar usuario');
      }

      return await response.json();
    } catch (error) {
      console.error('Error inicializando usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar último login
   */
  static async updateLastLogin(idToken: string) {
    try {
      await fetch('/api/auth/update-login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
    } catch (error) {
      console.error('Error actualizando último login:', error);
      // No lanzar error ya que no es crítico
    }
  }

  /**
   * Verificar permisos de usuario
   */
  static async checkPermission(idToken: string, permissionId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/auth/check-permission?permission=${permissionId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.hasPermission;
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Sincronizar usuario actual con Firestore
   */
  static async syncCurrentUser(idToken: string) {
    try {
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al sincronizar usuario');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sincronizando usuario:', error);
      throw error;
    }
  }
}