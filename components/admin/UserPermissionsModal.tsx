// components/admin/UserPermissionsModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserRole, UserProfile, AVAILABLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/types/auth';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { X, Users, Shield, Eye, EyeOff } from 'lucide-react';

interface UserPermissionsModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    role?: UserRole;
    permissions?: string[];
    displayName?: string;
  }) => Promise<void>;
}

export function UserPermissionsModal({ user, isOpen, onClose, onSave }: UserPermissionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useUserRole();

  // Estados del formulario
  const [formData, setFormData] = useState({
    role: 'client' as UserRole,
    permissions: [] as string[],
    displayName: '',
    useRoleDefaults: true, // Nueva opción para usar permisos por defecto del rol
  });

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        role: user.role,
        permissions: user.permissions,
        displayName: user.displayName || '',
        useRoleDefaults: false,
      });
      setError(null);
    }
  }, [user, isOpen]);

  // Actualizar permisos cuando cambia el rol
  const handleRoleChange = (newRole: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: prev.useRoleDefaults ? DEFAULT_ROLE_PERMISSIONS[newRole] : prev.permissions
    }));
  };

  // Manejar cambio de permisos específicos
  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => {
      const newPermissions = checked
        ? [...prev.permissions.filter(p => p !== permissionId), permissionId]
        : prev.permissions.filter(p => p !== permissionId);
      
      return {
        ...prev,
        permissions: newPermissions,
        useRoleDefaults: false, // Desactivar uso de defaults al personalizar
      };
    });
  };

  // Aplicar permisos por defecto del rol
  const applyRoleDefaults = () => {
    setFormData(prev => ({
      ...prev,
      permissions: DEFAULT_ROLE_PERMISSIONS[prev.role],
      useRoleDefaults: true,
    }));
  };

  // Dar todos los permisos
  const giveAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
      useRoleDefaults: false,
    }));
  };

  // Quitar todos los permisos
  const removeAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: [],
      useRoleDefaults: false,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const updates: any = {
        displayName: formData.displayName,
      };

      // Solo actualizar rol si cambió
      if (formData.role !== user.role) {
        updates.role = formData.role;
      }

      // Solo actualizar permisos si cambiaron
      const permissionsChanged = JSON.stringify(formData.permissions.sort()) !== 
                                JSON.stringify(user.permissions.sort());
      if (permissionsChanged) {
        updates.permissions = formData.permissions;
      }

      await onSave(updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cambios');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestionar Permisos: {user.email}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                UID: {user.uid}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">Nombre para mostrar</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Nombre del usuario"
                />
              </div>

              <div>
                <Label htmlFor="email">Email (solo lectura)</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            {/* Gestión de rol */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Rol de Usuario
              </Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.role === 'client'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRoleChange('client')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={formData.role === 'client'}
                      onChange={() => handleRoleChange('client')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium">Cliente</div>
                      <div className="text-sm text-gray-500">Permisos básicos de verificación</div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.role === 'admin'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRoleChange('admin')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={formData.role === 'admin'}
                      onChange={() => handleRoleChange('admin')}
                      className="w-4 h-4 text-purple-600"
                    />
                    <div>
                      <div className="font-medium">Administrador</div>
                      <div className="text-sm text-gray-500">Acceso completo al sistema</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones rápidas para permisos */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Acciones Rápidas</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyRoleDefaults}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Permisos por Defecto del Rol
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={giveAllPermissions}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Dar Todos los Permisos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeAllPermissions}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Quitar Todos los Permisos
                </Button>
              </div>
            </div>

            {/* Lista de permisos específicos */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Permisos Específicos ({formData.permissions.length} de {AVAILABLE_PERMISSIONS.length})
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {AVAILABLE_PERMISSIONS.map((permission) => {
                  const isChecked = formData.permissions.includes(permission.id);
                  return (
                    <div
                      key={permission.id}
                      className={`p-3 border rounded-lg transition-colors ${
                        isChecked
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={isChecked}
                          onCheckedChange={(checked) => handlePermissionChange(permission.id, checked)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{permission.name}</div>
                          <div className="text-xs text-gray-500">{permission.description}</div>
                          <div className="text-xs text-blue-600 font-mono">{permission.route}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}