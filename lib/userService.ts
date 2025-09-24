// lib/userService.ts
import { getAdminAuth, getAdminDb } from './firebaseAdmin';
import admin from './firebaseAdmin';
import { Timestamp } from 'firebase/firestore';
import { UserRole, UserProfile, DEFAULT_ROLE_PERMISSIONS } from '@/types/auth';
import { logger } from '@/lib/logger';

// Estructura del documento de usuario en Firestore
export interface UserDocument {
  uid: string;
  email: string;
  displayName?: string | null;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
  // Campos adicionales opcionales
  phoneNumber?: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

export class UserService {
  private static readonly COLLECTION_NAME = 'users';

  /**
   * Helper para convertir documento Firestore a UserProfile
   */
  private static documentToUserProfile(data: UserDocument): UserProfile {
    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName || null,
      role: data.role,
      permissions: data.permissions || [],
      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      lastLogin: data.lastLogin?.toDate?.()?.toISOString() || '',
      phoneNumber: data.phoneNumber || undefined,
    };
  }

  /**
   * Crear un nuevo usuario completo con Firebase Auth y Firestore
   */
  static async createUserWithAuth(
    email: string,
    displayName: string,
    role: UserRole = 'client'
  ): Promise<UserProfile> {
    try {
      logger.info('UserService.createUserWithAuth: Creating user', { email, role });
      logger.debug('Full name to set', { displayName });

      // 1. Create user in Firebase Auth
      const adminAuth = await getAdminAuth();
      const userRecord = await adminAuth.createUser({
        email,
        displayName,
        emailVerified: false, // User must verify their email
      });

      logger.info('Firebase Auth user created with UID', { uid: userRecord.uid });
      logger.debug('DisplayName set in Firebase Auth', { displayName: userRecord.displayName });

      // 2. Create profile in Firestore
      await this.createUser(userRecord.uid, email, role, displayName);

      // 3. Return the created profile
      const createdUser = await this.getUserById(userRecord.uid);
      if (!createdUser) {
        throw new Error('Error al obtener el usuario creado');
      }

      logger.info('UserService.createUserWithAuth: Complete user created');
      return createdUser;

    } catch (error: any) {
      logger.error('UserService.createUserWithAuth: Error creating user', {
        error: error.message,
        email,
        role
      });
      throw new Error(`Error al crear usuario: ${error.message}`);
    }
  }

  /**
   * Crear usuario solo en Firestore (para usuarios ya existentes en Firebase Auth)
   */
  static async createUser(
    uid: string,
    email: string,
    role: UserRole = 'client',
    displayName?: string
  ): Promise<void> {
    try {
      logger.info('UserService.createUser: Creating user document', { uid, email, role });

      const permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
      const now = admin.firestore.Timestamp.now();

      const adminDb = await getAdminDb();
      await adminDb.collection(this.COLLECTION_NAME).doc(uid).set({
        uid,
        email,
        displayName: displayName || null,
        role,
        permissions,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as UserDocument);

      // Set custom claims in Firebase Auth
      const adminAuth = await getAdminAuth();
      await adminAuth.setCustomUserClaims(uid, {
        role,
        permissions,
      });

      logger.info('UserService.createUser: User created successfully');
    } catch (error: any) {
      logger.error('UserService.createUser: Error', { error: error.message, uid });
      throw new Error(`Error al crear usuario en base de datos: ${error.message}`);
    }
  }

  /**
   * Obtener usuario por UID
   */
  static async getUserById(uid: string): Promise<UserProfile | null> {
    try {
      console.log('🔍 UserService.getUserById: Buscando usuario:', uid);
      
      const adminDb = await getAdminDb();
      const userDoc = await adminDb.collection(this.COLLECTION_NAME).doc(uid).get();
      
      if (!userDoc.exists) {
        console.log('❌ UserService.getUserById: Usuario no encontrado:', uid);
        return null;
      }

      const data = userDoc.data() as UserDocument;
      console.log('✅ UserService.getUserById: Usuario encontrado:', uid, data.role);
      
      return this.documentToUserProfile(data);
    } catch (error: any) {
      console.error('❌ UserService.getUserById: Error:', error);
      throw new Error(`Error al obtener usuario: ${error.message}`);
    }
  }

  /**
   * Obtener todos los usuarios
   */
  static async getAllUsers(maxResults?: number): Promise<UserProfile[]> {
    try {
      logger.info('UserService.getAllUsers: Fetching all users');
      
      const adminDb = await getAdminDb();
      let query = adminDb
        .collection(this.COLLECTION_NAME)
        .orderBy('createdAt', 'desc');
      
      if (maxResults && maxResults > 0) {
        query = query.limit(maxResults);
      }
      
      const querySnapshot = await query.get();

      const users: UserProfile[] = [];
      querySnapshot.forEach((doc: any) => {
        const data = doc.data() as UserDocument;
        users.push({
          uid: data.uid,
          email: data.email,
          displayName: data.displayName || null,
          role: data.role,
          permissions: data.permissions || [],
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastLogin: data.lastLogin?.toDate?.()?.toISOString() || '',
          phoneNumber: data.phoneNumber || undefined,
        });
      });

      logger.info('UserService.getAllUsers: Retrieved users count', { count: users.length });
      return users;
    } catch (error: any) {
      logger.error('UserService.getAllUsers: Error', { error: error.message });
      throw new Error(`Error al obtener usuarios: ${error.message}`);
    }
  }

  /**
   * Buscar usuarios por email (búsqueda parcial)
   */
  static async searchUsersByEmail(emailQuery: string): Promise<UserProfile[]> {
    try {
      logger.info('UserService.searchUsersByEmail: Searching users', { emailQuery });

      const adminDb = await getAdminDb();
      const querySnapshot = await adminDb
        .collection(this.COLLECTION_NAME)
        .where('email', '>=', emailQuery)
        .where('email', '<=', emailQuery + '\uf8ff')
        .limit(20)
        .get();

      const users: UserProfile[] = [];
      querySnapshot.forEach((doc: any) => {
        const data = doc.data() as UserDocument;
        users.push({
          uid: data.uid,
          email: data.email,
          displayName: data.displayName || null,
          role: data.role,
          permissions: data.permissions || [],
          isActive: data.isActive ?? true,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastLogin: data.lastLogin?.toDate?.()?.toISOString() || '',
          phoneNumber: data.phoneNumber || undefined,
        });
      });

      logger.info('UserService.searchUsersByEmail: Found users', { count: users.length });
      return users;
    } catch (error: any) {
      logger.error('UserService.searchUsersByEmail: Error', { error: error.message, emailQuery });
      throw new Error(`Error al buscar usuarios: ${error.message}`);
    }
  }

  /**
   * Actualizar rol y permisos del usuario
   */
  static async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      logger.info('UserService.updateUserRole: Updating role', { uid, role });

      const permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
      const now = admin.firestore.Timestamp.now();

      const adminDb = await getAdminDb();
      await adminDb.collection(this.COLLECTION_NAME).doc(uid).update({
        role,
        permissions,
        updatedAt: now,
      });

      // Update Firebase Auth custom claims
      const adminAuth = await getAdminAuth();
      await adminAuth.setCustomUserClaims(uid, {
        role,
        permissions,
      });

      logger.info('UserService.updateUserRole: Role updated successfully');
    } catch (error: any) {
      logger.error('UserService.updateUserRole: Error', { error: error.message, uid, role });
      throw new Error(`Error al actualizar rol: ${error.message}`);
    }
  }

  /**
   * Actualizar permisos del usuario
   */
  static async updateUserPermissions(uid: string, permissions: string[]): Promise<void> {
    try {
      logger.info('UserService.updateUserPermissions: Updating permissions', { uid, permissions });

      // First check if user exists
      const adminDb = await getAdminDb();
      const userDoc = await adminDb.collection(this.COLLECTION_NAME).doc(uid).get();
      
      if (!userDoc.exists) {
        throw new Error('Usuario no encontrado');
      }

      const now = admin.firestore.Timestamp.now();
      await adminDb.collection(this.COLLECTION_NAME).doc(uid).update({
        permissions,
        updatedAt: now,
      });

      // Update Firebase Auth custom claims
      const userData = userDoc.data() as UserDocument;
      const adminAuth = await getAdminAuth();
      await adminAuth.setCustomUserClaims(uid, {
        role: userData.role,
        permissions,
      });

      logger.info('UserService.updateUserPermissions: Permissions updated successfully');
    } catch (error: any) {
      logger.error('UserService.updateUserPermissions: Error', { error: error.message, uid });
      throw new Error(`Error al actualizar permisos: ${error.message}`);
    }
  }

  /**
   * Actualizar información básica del usuario
   */
  static async updateUserInfo(
    uid: string,
    updates: Partial<Pick<UserDocument, 'displayName' | 'phoneNumber' | 'avatar' | 'isActive'>>
  ): Promise<void> {
    try {
      logger.info('UserService.updateUserInfo: Updating user info', { uid, updates });

      const now = admin.firestore.Timestamp.now();
      
      // Update Firebase Auth if displayName is being updated
      if (updates.displayName !== undefined) {
        const adminAuth = await getAdminAuth();
        await adminAuth.updateUser(uid, {
          displayName: updates.displayName,
        });
      }

      const adminDb = await getAdminDb();
      await adminDb.collection(this.COLLECTION_NAME).doc(uid).update({
        ...updates,
        updatedAt: now,
      });

      logger.info('UserService.updateUserInfo: User info updated successfully');
    } catch (error: any) {
      logger.error('UserService.updateUserInfo: Error', { error: error.message, uid, updates });
      throw new Error(`Error al actualizar información: ${error.message}`);
    }
  }

  /**
   * Actualizar metadata del usuario
   */
  static async updateUserMetadata(uid: string, metadata: Record<string, any>): Promise<void> {
    try {
      logger.info('UserService.updateUserMetadata: Updating metadata', { uid });

      const now = admin.firestore.Timestamp.now();

      const adminDb = await getAdminDb();
      await adminDb.collection(this.COLLECTION_NAME).doc(uid).update({
        metadata,
        updatedAt: now,
      });

      logger.info('UserService.updateUserMetadata: Metadata updated successfully');
    } catch (error: any) {
      logger.error('UserService.updateUserMetadata: Error', { error: error.message, uid });
      throw new Error(`Error al actualizar metadata: ${error.message}`);
    }
  }

  /**
   * Eliminar usuario completamente (Firebase Auth + Firestore)
   */
  static async deleteUser(uid: string, hardDelete: boolean = false): Promise<void> {
    try {
      logger.info('UserService.deleteUser: Deleting user', { uid, hardDelete });

      const adminDb = await getAdminDb();
      
      if (hardDelete) {
        // Delete from Firebase Auth and Firestore completely
        const adminAuth = await getAdminAuth();
        await Promise.all([
          adminAuth.deleteUser(uid),
          adminDb.collection(this.COLLECTION_NAME).doc(uid).delete(),
        ]);
      } else {
        // Soft delete - just mark as inactive
        await adminDb
          .collection(this.COLLECTION_NAME)
          .doc(uid)
          .update({
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }

      logger.info('UserService.deleteUser: User deleted successfully', { hardDelete });
    } catch (error: any) {
      logger.error('UserService.deleteUser: Error', { error: error.message, uid, hardDelete });
      throw new Error(`Error al eliminar usuario: ${error.message}`);
    }
  }

  /**
   * Actualizar último login
   */
  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const now = admin.firestore.Timestamp.now();

      const adminDb = await getAdminDb();
      await adminDb.collection(this.COLLECTION_NAME).doc(uid).update({
        lastLogin: now,
        updatedAt: now,
      });

      logger.debug('UserService.updateLastLogin: Updated for user', { uid });
    } catch (error: any) {
      logger.error('UserService.updateLastLogin: Error', { error: error.message, uid });
      // No lanzamos error aquí porque no es crítico
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  static async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  }> {
    try {
      logger.info('UserService.getUserStats: Getting user statistics');

      const adminDb = await getAdminDb();
      const querySnapshot = await adminDb
        .collection(this.COLLECTION_NAME)
        .get();

      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        byRole: {
          admin: 0,
          editor: 0,
          client: 0,
        } as Record<UserRole, number>,
      };

      querySnapshot.forEach((doc: any) => {
        const data = doc.data() as UserDocument;
        stats.total++;
        
        if (data.isActive) {
          stats.active++;
        } else {
          stats.inactive++;
        }
        
        if (data.role in stats.byRole) {
          stats.byRole[data.role]++;
        }
      });

      logger.info('UserService.getUserStats: Statistics computed', stats);
      return stats;
    } catch (error: any) {
      logger.error('UserService.getUserStats: Error', { error: error.message });
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Inicializar usuario desde Firebase Auth (para casos donde el usuario existe en Auth pero no en Firestore)
   */
  static async initializeUser(uid: string): Promise<UserProfile | null> {
    try {
      logger.info('UserService.initializeUser: Initializing user from Auth', { uid });

      // Check if user already exists in Firestore
      const existingUser = await this.getUserById(uid);
      if (existingUser) {
        logger.info('UserService.initializeUser: User already exists in Firestore');
        return existingUser;
      }

      // Get user from Firebase Auth
      const adminAuth = await getAdminAuth();
      const userRecord = await adminAuth.getUser(uid);
      
      // Create user in Firestore with default role
      await this.createUser(
        uid,
        userRecord.email || `user-${uid}@unknown.com`,
        'client',
        userRecord.displayName || 'Usuario'
      );

      // Set custom claims
      await adminAuth.setCustomUserClaims(uid, {
        role: 'client',
        permissions: DEFAULT_ROLE_PERMISSIONS.client,
      });

      // Return the created user
      return await this.getUserById(uid);
    } catch (error: any) {
      logger.error('UserService.initializeUser: Error', { error: error.message, uid });
      throw new Error(`Error al inicializar usuario: ${error.message}`);
    }
  }

  /**
   * Generar link de verificación de email
   */
  static async generateEmailVerificationLink(uid: string): Promise<string> {
    try {
      const adminAuth = await getAdminAuth();
      const link = await adminAuth.generateEmailVerificationLink(uid);
      return link;
    } catch (error: any) {
      logger.error('UserService.generateEmailVerificationLink: Error', { error: error.message, uid });
      throw new Error(`Error al generar link de verificación: ${error.message}`);
    }
  }

  /**
   * Generar link de reset de contraseña
   */
  static async generatePasswordResetLink(email: string): Promise<string> {
    try {
      const adminAuth = await getAdminAuth();
      const link = await adminAuth.generatePasswordResetLink(email);
      return link;
    } catch (error: any) {
      logger.error('UserService.generatePasswordResetLink: Error', { error: error.message, email });
      throw new Error(`Error al generar link de reset: ${error.message}`);
    }
  }

  /**
   * Actualizar email del usuario
   */
  static async updateUserEmail(uid: string, newEmail: string): Promise<void> {
    try {
      logger.info('UserService.updateUserEmail: Updating email', { uid, newEmail });

      const adminAuth = await getAdminAuth();
      
      // Update in Firebase Auth
      await adminAuth.updateUser(uid, {
        email: newEmail,
        emailVerified: false, // Require re-verification
      });
      
      // Get updated user info
      const user = await adminAuth.getUser(uid);
      
      // Update custom claims to ensure they're preserved
      await adminAuth.setCustomUserClaims(uid, {
        ...user.customClaims,
      });

      logger.info('UserService.updateUserEmail: Email updated successfully');
    } catch (error: any) {
      logger.error('UserService.updateUserEmail: Error', { error: error.message, uid, newEmail });
      throw new Error(`Error al actualizar email: ${error.message}`);
    }
  }

  /**
   * Verificar si un usuario tiene un permiso específico
   */
  static async userHasPermission(uid: string, permissionId: string): Promise<boolean> {
    try {
      logger.debug('UserService.userHasPermission: Checking permission', { uid, permissionId });

      const user = await this.getUserById(uid);
      if (!user) {
        logger.warn('UserService.userHasPermission: User not found', { uid });
        return false;
      }

      const hasPermission = user.permissions.includes(permissionId);
      logger.debug('UserService.userHasPermission: Result', { uid, permissionId, hasPermission });
      
      return hasPermission;
    } catch (error: any) {
      logger.error('UserService.userHasPermission: Error', { error: error.message, uid, permissionId });
      return false;
    }
  }

  /**
   * Obtener usuarios por rol
   */
  static async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    try {
      logger.info('UserService.getUsersByRole: Fetching users by role', { role });
      
      const adminDb = await getAdminDb();
      const querySnapshot = await adminDb
        .collection(this.COLLECTION_NAME)
        .where('role', '==', role)
        .orderBy('createdAt', 'desc')
        .get();

      const users: UserProfile[] = [];
      querySnapshot.forEach((doc: any) => {
        const data = doc.data() as UserDocument;
        users.push(this.documentToUserProfile(data));
      });

      logger.info('UserService.getUsersByRole: Retrieved users count', { role, count: users.length });
      return users;
    } catch (error: any) {
      logger.error('UserService.getUsersByRole: Error', { role, error: error.message });
      throw new Error(`Error al obtener usuarios por rol: ${error.message}`);
    }
  }

  /**
   * Activar/desactivar usuario
   */
  static async toggleUserStatus(uid: string, isActive: boolean): Promise<void> {
    try {
      logger.info('UserService.toggleUserStatus: Toggling user status', { uid, isActive });
      
      const adminDb = await getAdminDb();
      await adminDb
        .collection(this.COLLECTION_NAME)
        .doc(uid)
        .update({
          isActive,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      logger.info('UserService.toggleUserStatus: User status updated successfully', { uid, isActive });
    } catch (error: any) {
      logger.error('UserService.toggleUserStatus: Error', { uid, isActive, error: error.message });
      throw new Error(`Error al cambiar estado del usuario: ${error.message}`);
    }
  }

  /**
   * Actualizar perfil de usuario
   */
  static async updateUserProfile(uid: string, profileUpdates: Partial<{
    displayName: string;
    phoneNumber: string;
    avatar: string;
    metadata: Record<string, any>;
  }>): Promise<void> {
    try {
      logger.info('UserService.updateUserProfile: Updating user profile', { uid, updates: Object.keys(profileUpdates) });
      
      const adminDb = await getAdminDb();
      const updates: any = {
        ...profileUpdates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await adminDb
        .collection(this.COLLECTION_NAME)
        .doc(uid)
        .update(updates);

      logger.info('UserService.updateUserProfile: User profile updated successfully', { uid });
    } catch (error: any) {
      logger.error('UserService.updateUserProfile: Error', { uid, error: error.message });
      throw new Error(`Error al actualizar perfil del usuario: ${error.message}`);
    }
  }
}