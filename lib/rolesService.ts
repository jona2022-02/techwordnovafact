// lib/rolesService.ts
import admin from './firebaseAdmin';
import { UserService } from './userService';
import { UserRole, UserProfile } from '@/types/auth';

export class RolesService {
  
  /**
   * Asignar rol y permisos a un usuario usando Firebase Custom Claims
   * @deprecated Usar UserService.updateUserRole() en su lugar
   */
  static async setUserRole(uid: string, role: UserRole, _permissions?: string[]): Promise<void> {
    console.warn('RolesService.setUserRole está deprecado. Usa UserService.updateUserRole()');
    await UserService.updateUserRole(uid, role);
  }

  /**
   * Obtener el perfil completo de un usuario
   * @deprecated Usar UserService.getUserById() en su lugar
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    console.warn('RolesService.getUserProfile está deprecado. Usa UserService.getUserById()');
    return await UserService.getUserById(uid);
  }

  /**
   * Listar todos los usuarios con sus roles
   * @deprecated Usar UserService.getAllUsers() en su lugar
   */
  static async listAllUsers(maxResults: number = 100): Promise<UserProfile[]> {
    console.warn('RolesService.listAllUsers está deprecado. Usa UserService.getAllUsers()');
    return await UserService.getAllUsers(maxResults);
  }

  /**
   * Actualizar permisos específicos de un usuario
   * @deprecated Usar UserService.updateUserPermissions() en su lugar
   */
  static async updateUserPermissions(uid: string, permissions: string[]): Promise<void> {
    console.warn('RolesService.updateUserPermissions está deprecado. Usa UserService.updateUserPermissions()');
    await UserService.updateUserPermissions(uid, permissions);
  }

  /**
   * Verificar si un usuario tiene un permiso específico
   * @deprecated Usar UserService.userHasPermission() en su lugar
   */
  static async userHasPermission(uid: string, permissionId: string): Promise<boolean> {
    console.warn('RolesService.userHasPermission está deprecado. Usa UserService.userHasPermission()');
    return await UserService.userHasPermission(uid, permissionId);
  }

  /**
   * Inicializar usuario con rol por defecto al registrarse
   * @deprecated Usar UserService.initializeNewUser() en su lugar
   */
  static async initializeNewUser(uid: string, email: string, defaultRole: UserRole = 'client'): Promise<void> {
    console.warn('RolesService.initializeNewUser está deprecado. Usa UserService.initializeNewUser()');
    await UserService.initializeNewUser(uid, email, undefined, defaultRole);
  }

  /**
   * Verificar si un usuario es administrador
   */
  static async isAdmin(uid: string): Promise<boolean> {
    try {
      console.log('🔍 RolesService.isAdmin: Verificando usuario:', uid);
      const profile = await UserService.getUserById(uid);
      const isAdmin = profile?.role === 'admin';
      console.log('📋 RolesService.isAdmin: Resultado para', uid, ':', isAdmin, 'Role:', profile?.role);
      return isAdmin;
    } catch (error) {
      console.error('🚨 RolesService.isAdmin: Error verificando admin:', error);
      return false;
    }
  }

  /**
   * Cambiar estado activo/inactivo de un usuario
   * @deprecated Usar UserService.toggleUserStatus() en su lugar
   */
  static async toggleUserStatus(uid: string, isActive: boolean): Promise<void> {
    console.warn('RolesService.toggleUserStatus está deprecado. Usa UserService.toggleUserStatus()');
    await UserService.toggleUserStatus(uid, isActive);
  }
}