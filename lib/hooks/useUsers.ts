// lib/hooks/useUsers.ts
import { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types/auth';
import { useUserRole } from './useUserRole';

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, role, isAdmin } = useUserRole();

  const fetchUsers = async (role?: UserRole, limit?: number) => {
    if (!user || !isAdmin()) {
      throw new Error('Permisos insuficientes');
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const params = new URLSearchParams();
      
      if (role) params.append('role', role);
      if (limit) params.append('limit', limit.toString());

      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener usuarios');
      }

      const data = await response.json();
      setUsers(data.users);
      return data.users;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUserById = async (uid: string): Promise<UserProfile | null> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Error al obtener usuario');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    }
  };

  const updateUser = async (
    uid: string, 
    updates: {
      role?: UserRole;
      permissions?: string[];
      isActive?: boolean;
      displayName?: string;
      phoneNumber?: string;
      avatar?: string;
    }
  ): Promise<UserProfile> => {
    if (!user || !isAdmin()) {
      throw new Error('Permisos insuficientes');
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar usuario');
      }

      const updatedUser = await response.json();
      
      // Actualizar la lista local de usuarios
      setUsers(prev => prev.map(u => u.uid === uid ? updatedUser : u));
      
      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    }
  };

  const createUser = async (userData: {
    email: string;
    role: UserRole;
    displayName: string;
  }): Promise<UserProfile> => {
    if (!user || !isAdmin()) {
      throw new Error('Permisos insuficientes');
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear usuario');
      }

      const result = await response.json();
      const newUser = result.user;
      
      // Agregar a la lista local de usuarios
      setUsers(prev => [newUser, ...prev]);
      
      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteUser = async (uid: string, hardDelete: boolean = false): Promise<void> => {
    if (!user || !isAdmin()) {
      throw new Error('Permisos insuficientes');
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${uid}?hard=${hardDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }

      if (hardDelete) {
        // Eliminar de la lista local
        setUsers(prev => prev.filter(u => u.uid !== uid));
      } else {
        // Marcar como inactivo
        setUsers(prev => prev.map(u => 
          u.uid === uid ? { ...u, isActive: false } : u
        ));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    }
  };

  const toggleUserStatus = async (uid: string, isActive: boolean): Promise<void> => {
    await updateUser(uid, { isActive });
  };

  const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
    await updateUser(uid, { role });
  };

  const updateUserPermissions = async (uid: string, permissions: string[]): Promise<void> => {
    await updateUser(uid, { permissions });
  };

  // Funciones adicionales de gestión
  const sendVerificationEmail = async (uid: string): Promise<void> => {
    if (!user || !isAdmin()) {
      throw new Error('Permisos insuficientes');
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${uid}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'sendVerificationEmail' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar email de verificación');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    if (!user || !isAdmin()) {
      throw new Error('Permisos insuficientes');
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/temp/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'sendPasswordReset', email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar email de reset');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    }
  };

  const forcePasswordReset = async (uid: string): Promise<void> => {
    if (!user || !isAdmin()) {
      throw new Error('Permisos insuficientes');
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/users/${uid}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'forcePasswordReset' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al forzar reset de contraseña');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    }
  };

  // Cargar usuarios automáticamente si es admin
  useEffect(() => {
    if (user && role === 'admin') {
      fetchUsers().catch(console.error);
    }
  }, [user?.uid, role]);

  return {
    users,
    loading,
    error,
    fetchUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
    toggleUserStatus,
    updateUserRole,
    updateUserPermissions,
    sendVerificationEmail,
    sendPasswordResetEmail,
    forcePasswordReset,
    clearError: () => setError(null),
  };
}