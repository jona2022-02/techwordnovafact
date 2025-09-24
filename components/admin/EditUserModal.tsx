// components/admin/EditUserModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { UserProfile, UserRole } from '@/types/auth';
import { X, Save, User, Mail, Shield, Users, Phone, Image } from 'lucide-react';

interface EditUserModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (uid: string, updates: {
    displayName?: string;
    role?: UserRole;
    isActive?: boolean;
    phoneNumber?: string;
    permissions?: string[];
  }) => Promise<void>;
  loading?: boolean;
}

export function EditUserModal({ user, isOpen, onClose, onUpdateUser, loading = false }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    displayName: '',
    role: 'client' as UserRole,
    isActive: true,
    phoneNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actualizar formulario cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        role: user.role,
        isActive: user.isActive,
        phoneNumber: user.phoneNumber || '',
      });
      setErrors({});
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar displayName
    if (!formData.displayName) {
      newErrors.displayName = 'El nombre es requerido';
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar teléfono si se proporciona
    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Formato de teléfono inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    setIsSubmitting(true);
    try {
      // Solo enviar campos que han cambiado
      const updates: any = {};
      
      if (formData.displayName !== user.displayName) {
        updates.displayName = formData.displayName;
      }
      
      if (formData.role !== user.role) {
        updates.role = formData.role;
      }
      
      if (formData.isActive !== user.isActive) {
        updates.isActive = formData.isActive;
      }
      
      if (formData.phoneNumber !== (user.phoneNumber || '')) {
        updates.phoneNumber = formData.phoneNumber || null;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateUser(user.uid, updates);
      }
      
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Error al actualizar usuario'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  const roles = [
    {
      value: 'client',
      label: 'Cliente',
      description: 'Acceso limitado a funciones específicas',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      value: 'admin',
      label: 'Administrador',
      description: 'Acceso completo al sistema',
      icon: Shield,
      color: 'text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Editar Usuario</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email (solo lectura) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">El email no se puede cambiar</p>
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre completo
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Nombre completo del usuario"
                  disabled={isSubmitting}
                  className={errors.displayName ? 'border-red-500' : ''}
                />
                {errors.displayName && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.displayName}</p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono (opcional)
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1234567890"
                  disabled={isSubmitting}
                  className={errors.phoneNumber ? 'border-red-500' : ''}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.phoneNumber}</p>
                )}
              </div>

              {/* Estado activo */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Estado del usuario
                </Label>
                <div className="flex items-center space-x-3 p-3 rounded-lg border">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    disabled={isSubmitting}
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {formData.isActive ? 'Activo' : 'Inactivo'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formData.isActive ? 'El usuario puede acceder al sistema' : 'El usuario no puede acceder al sistema'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rol */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Rol del usuario</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roles.map((role) => {
                  const RoleIcon = role.icon;
                  return (
                    <label
                      key={role.value}
                      className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        formData.role === role.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      } ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={formData.role === role.value}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                        disabled={isSubmitting}
                        className="sr-only"
                      />
                      <RoleIcon className={`h-5 w-5 ${role.color}`} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Información adicional */}
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <h4 className="font-medium text-sm">Información adicional</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Creado:</span> {new Date(user.createdAt).toLocaleDateString('es-ES')}
                </div>
                <div>
                  <span className="font-medium">Último acceso:</span> {new Date(user.lastLogin).toLocaleDateString('es-ES')}
                </div>
                <div>
                  <span className="font-medium">UID:</span> {user.uid}
                </div>
                <div>
                  <span className="font-medium">Permisos:</span> {user.permissions.length} activos
                </div>
              </div>
            </div>

            {/* Error general */}
            {errors.submit && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}