// components/admin/UserManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UserProfile } from '@/types/auth';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { useUsers } from '@/lib/hooks/useUsers';
import { UserPermissionsModal } from './UserPermissionsModal';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { DeleteUserModal } from './DeleteUserModal';
import { UserActionsModal } from './UserActionsModal';
import { UserMembershipModal } from './UserMembershipModal';
import { Users, Shield, Search, Settings, UserPlus, Eye, Clock, Mail, Edit, Trash2, MoreVertical, Crown } from 'lucide-react';

interface UserManagementProps {
  className?: string;
}

export function UserManagement({ className }: UserManagementProps) {
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, isAdmin } = useUserRole();
  
  // Usar el hook useUsers que ya maneja correctamente la lógica de carga
  const { 
    users, 
    loading, 
    error, 
    fetchUsers, 
    updateUser, 
    createUser, 
    deleteUser, 
    sendVerificationEmail,
    sendPasswordResetEmail,
    forcePasswordReset,
    clearError 
  } = useUsers();

  // Estados para el modal de permisos
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para el modal de agregar usuario
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Estados para el modal de editar usuario
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  // Estados para el modal de eliminar usuario
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Estados para el modal de acciones adicionales
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [userForActions, setUserForActions] = useState<UserProfile | null>(null);

  // Estados para el modal de membresía
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [userForMembership, setUserForMembership] = useState<UserProfile | null>(null);

  // Filtrar usuarios basado en búsqueda
  useEffect(() => {
    console.log('🔄 UserManagement: Actualizando filteredUsers. users:', users.length, 'searchTerm:', searchTerm);
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
    console.log('✅ UserManagement: filteredUsers actualizado, cantidad:', filteredUsers.length);
  }, [users, searchTerm, filteredUsers.length]);

  const forceReloadUsers = async () => {
    console.log('� UserManagement: Forzando recarga de usuarios...');
    try {
      await fetchUsers();
    } catch (err) {
      console.error('Error al recargar usuarios:', err);
    }
  };

  const openPermissionsModal = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setIsModalOpen(true);
  };

  const closePermissionsModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleSaveUserPermissions = async (updates: {
    role?: 'admin' | 'client';
    permissions?: string[];
    displayName?: string;
  }) => {
    if (!selectedUser) return;

    try {
      await updateUser(selectedUser.uid, updates);
      closePermissionsModal();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al actualizar usuario');
    }
  };

  const handleAddUser = async (userData: {
    email: string;
    displayName: string;
    role: 'admin' | 'client';
  }) => {
    console.log('📝 UserManagement.handleAddUser: Datos recibidos:', userData);
    console.log('📝 Nombre completo:', userData.displayName);
    console.log('📝 Email:', userData.email);
    console.log('📝 Rol:', userData.role);
    
    try {
      await createUser(userData);
      console.log('✅ Usuario creado exitosamente con nombre:', userData.displayName);
    } catch (err) {
      console.error('❌ Error al crear usuario:', err);
      throw new Error(err instanceof Error ? err.message : 'Error al crear usuario');
    }
  };

  const handleEditUser = (userProfile: UserProfile) => {
    setUserToEdit(userProfile);
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (uid: string, updates: {
    displayName?: string;
    role?: 'admin' | 'client';
    isActive?: boolean;
    phoneNumber?: string;
    permissions?: string[];
  }) => {
    try {
      await updateUser(uid, updates);
      setIsEditUserModalOpen(false);
      setUserToEdit(null);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al actualizar usuario');
    }
  };

  const handleDeleteUser = (userProfile: UserProfile) => {
    setUserToDelete(userProfile);
    setIsDeleteUserModalOpen(true);
  };

  const handleConfirmDeleteUser = async (uid: string, hardDelete: boolean) => {
    try {
      await deleteUser(uid, hardDelete);
      setIsDeleteUserModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  };

  const handleUserActions = (userProfile: UserProfile) => {
    setUserForActions(userProfile);
    setIsActionsModalOpen(true);
  };

  const handleUserMembership = (userProfile: UserProfile) => {
    setUserForMembership(userProfile);
    setIsMembershipModalOpen(true);
  };

  const handleToggleStatus = async (uid: string, currentStatus: boolean) => {
    try {
      await updateUser(uid, { isActive: !currentStatus });
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const getRoleDisplayInfo = (role: 'admin' | 'client') => {
    return role === 'admin' 
      ? { label: 'Administrador', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400', icon: Shield }
      : { label: 'Cliente', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400', icon: Users };
  };

  // Debug log
  console.log('🔧 UserManagement: Estado actual - users:', users.length, 'loading:', loading, 'error:', error);

  if (!isAdmin()) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-destructive">Acceso Restringido</h2>
          <p className="text-muted-foreground mt-2">Solo los administradores pueden acceder a la gestión de usuarios.</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-foreground">Cargando usuarios...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-6 w-6 text-primary" />
                Gestión de Usuarios
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Administra usuarios, roles y permisos del sistema
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Total de usuarios: {users.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsAddUserModalOpen(true)} 
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Agregar Usuario
              </Button>
              <Button onClick={forceReloadUsers} disabled={loading} variant="outline">
                {loading ? 'Cargando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {/* Información de depuración */}
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
            <div className="font-semibold text-foreground mb-2">🔧 Debug Info:</div>
            <div className="space-y-1 text-muted-foreground">
              <div>Usuario autenticado: {user ? '✅ Sí' : '❌ No'}</div>
              <div>Email usuario: {user?.email || 'N/A'}</div>
              <div>Es admin: {isAdmin() ? '✅ Sí' : '❌ No'}</div>
              <div>Cargando: {loading ? '⏳ Sí' : '✅ No'}</div>
              <div>Total usuarios: {users.length}</div>
              {error && <div className="text-destructive">Error: {error}</div>}
            </div>
            <Button 
              onClick={forceReloadUsers} 
              variant="outline" 
              size="sm" 
              className="mt-2"
              disabled={loading}
            >
              {loading ? '⏳ Cargando...' : '🔄 Cargar Usuarios'}
            </Button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-6">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {error}
              </div>
              <Button 
                onClick={clearError} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Cerrar
              </Button>
            </div>
          )}

          {/* Barra de búsqueda */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por email o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando {filteredUsers.length} de {users.length} usuarios
              </p>
            )}
          </div>

          {/* Tabla de usuarios */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rol y Permisos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Último Acceso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredUsers.map((userProfile) => {
                    console.log('👤 UserManagement: Renderizando usuario:', userProfile.email);
                    const roleInfo = getRoleDisplayInfo(userProfile.role);
                    const RoleIcon = roleInfo.icon;
                    
                    return (
                      <tr key={userProfile.uid} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary/60 to-purple-500/60 flex items-center justify-center shadow-lg">
                                <span className="text-lg font-bold text-primary-foreground">
                                  {(userProfile.displayName || userProfile.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {userProfile.displayName || 'Sin nombre'}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {userProfile.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${roleInfo.color}`}>
                              <RoleIcon className="h-3 w-3" />
                              {roleInfo.label}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {userProfile.permissions.length} permiso{userProfile.permissions.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <Switch
                              checked={userProfile.isActive}
                              onCheckedChange={() => handleToggleStatus(userProfile.uid, userProfile.isActive)}
                            />
                            <span className={`text-xs ${userProfile.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {userProfile.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(userProfile.lastLogin).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(userProfile)}
                              className="flex items-center gap-1"
                              title="Editar usuario"
                            >
                              <Edit className="h-3 w-3" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPermissionsModal(userProfile)}
                              className="flex items-center gap-1"
                              title="Gestionar permisos"
                            >
                              <Settings className="h-3 w-3" />
                              <span className="hidden md:inline">Permisos</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserMembership(userProfile)}
                              className="flex items-center gap-1"
                              title="Gestionar membresía"
                            >
                              <Crown className="h-3 w-3" />
                              <span className="hidden lg:inline">Membresía</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserActions(userProfile)}
                              className="flex items-center gap-1"
                              title="Acciones adicionales"
                            >
                              <MoreVertical className="h-3 w-3" />
                              <span className="hidden lg:inline">Más</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(userProfile)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="hidden xl:inline">Eliminar</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredUsers.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm 
                      ? 'Intenta con otros términos de búsqueda.' 
                      : 'Los usuarios aparecerán aquí cuando se registren en el sistema.'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de permisos */}
      <UserPermissionsModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={closePermissionsModal}
        onSave={handleSaveUserPermissions}
      />

      {/* Modal para agregar usuario */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onAddUser={handleAddUser}
        loading={loading}
      />

      {/* Modal para editar usuario */}
      <EditUserModal
        user={userToEdit}
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setUserToEdit(null);
        }}
        onUpdateUser={handleUpdateUser}
        loading={loading}
      />

      {/* Modal para eliminar usuario */}
      <DeleteUserModal
        user={userToDelete}
        isOpen={isDeleteUserModalOpen}
        onClose={() => {
          setIsDeleteUserModalOpen(false);
          setUserToDelete(null);
        }}
        onDeleteUser={handleConfirmDeleteUser}
        loading={loading}
      />

      {/* Modal de acciones adicionales */}
      <UserActionsModal
        user={userForActions}
        isOpen={isActionsModalOpen}
        onClose={() => {
          setIsActionsModalOpen(false);
          setUserForActions(null);
        }}
        onSendVerificationEmail={sendVerificationEmail}
        onSendPasswordReset={sendPasswordResetEmail}
        onForcePasswordReset={forcePasswordReset}
        loading={loading}
      />

      {/* Modal de gestión de membresía */}
      <UserMembershipModal
        user={userForMembership}
        isOpen={isMembershipModalOpen}
        onClose={() => {
          setIsMembershipModalOpen(false);
          setUserForMembership(null);
        }}
      />
    </div>
  );
}