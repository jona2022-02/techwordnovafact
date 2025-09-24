// components/admin/AddUserModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/types/auth';
import { X, UserPlus, Mail, User, Shield, Users } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (userData: {
    email: string;
    displayName: string;
    role: UserRole;
  }) => Promise<void>;
  loading?: boolean;
}

export function AddUserModal({ isOpen, onClose, onAddUser, loading = false }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: 'client' as UserRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-focus en el campo de nombre cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const nameInput = document.getElementById('displayName');
        if (nameInput) {
          nameInput.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar nombre (ahora es el primer campo)
    if (!formData.displayName) {
      newErrors.displayName = 'El nombre completo es requerido';
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.displayName.length > 100) {
      newErrors.displayName = 'El nombre no puede exceder 100 caracteres';
    }

    // Validar email
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onAddUser(formData);
      // Resetear form
      setFormData({
        email: '',
        displayName: '',
        role: 'client',
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Error al crear usuario'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        email: '',
        displayName: '',
        role: 'client',
      });
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
      <Card className="w-full max-w-md bg-background border shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Agregar Nuevo Usuario</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Completa todos los campos marcados con *
              </p>
            </div>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre completo - Primer campo para más visibilidad */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                Nombre completo *
              </Label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Ej: Juan Carlos Pérez"
                disabled={isSubmitting}
                className={errors.displayName ? 'border-red-500' : ''}
                autoComplete="name"
                aria-describedby={errors.displayName ? "displayName-error" : undefined}
                aria-required="true"
                aria-invalid={!!errors.displayName}
              />
              {errors.displayName && (
                <p id="displayName-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.displayName}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4 text-primary" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                disabled={isSubmitting}
                className={errors.email ? 'border-red-500' : ''}
                autoComplete="email"
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-required="true"
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Rol */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Rol del usuario</Label>
              <div className="grid grid-cols-1 gap-2">
                {roles.map((role) => {
                  const RoleIcon = role.icon;
                  return (
                    <label
                      key={role.value}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
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
                    Creando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Crear Usuario
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