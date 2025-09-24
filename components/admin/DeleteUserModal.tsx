// components/admin/DeleteUserModal.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserProfile } from '@/types/auth';
import { X, Trash2, AlertTriangle, User, Mail, Shield } from 'lucide-react';

interface DeleteUserModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteUser: (uid: string, hardDelete: boolean) => Promise<void>;
  loading?: boolean;
}

export function DeleteUserModal({ user, isOpen, onClose, onDeleteUser, loading = false }: DeleteUserModalProps) {
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await onDeleteUser(user.uid, deleteType === 'hard');
      onClose();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDeleteType('soft');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-background border shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-600 dark:text-red-400">Eliminar Usuario</CardTitle>
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
            {/* Información del usuario */}
            <div className="p-4 rounded-lg bg-muted/30 border">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Usuario a eliminar
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{user.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Nombre:</span> {user.displayName || 'Sin nombre'}
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Rol:</span> 
                  <span className={`capitalize ${user.role === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {user.role === 'admin' ? 'Administrador' : 'Cliente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tipo de eliminación */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Tipo de eliminación</h4>
              
              <label className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                deleteType === 'soft'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-border hover:border-orange-500/50'
              } ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}>
                <input
                  type="radio"
                  name="deleteType"
                  value="soft"
                  checked={deleteType === 'soft'}
                  onChange={(e) => setDeleteType(e.target.value as 'soft')}
                  disabled={isSubmitting}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-orange-600 dark:text-orange-400">
                    Desactivar usuario
                  </div>
                  <div className="text-xs text-muted-foreground">
                    El usuario se desactiva pero mantiene sus datos. Puede reactivarse más tarde.
                  </div>
                </div>
              </label>

              <label className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                deleteType === 'hard'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-border hover:border-red-500/50'
              } ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}>
                <input
                  type="radio"
                  name="deleteType"
                  value="hard"
                  checked={deleteType === 'hard'}
                  onChange={(e) => setDeleteType(e.target.value as 'hard')}
                  disabled={isSubmitting}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-red-600 dark:text-red-400">
                    Eliminar permanentemente
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ⚠️ Esta acción NO SE PUEDE DESHACER. Se eliminan todos los datos del usuario.
                  </div>
                </div>
              </label>
            </div>

            {/* Advertencia */}
            <div className={`p-3 rounded-lg border ${
              deleteType === 'hard' 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            }`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                  deleteType === 'hard' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                }`} />
                <div className={`text-sm ${
                  deleteType === 'hard' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {deleteType === 'hard' 
                    ? '¿Estás seguro? Esta acción eliminará permanentemente al usuario y todos sus datos asociados.'
                    : '¿Estás seguro? El usuario será desactivado y no podrá acceder al sistema.'
                  }
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
                variant={deleteType === 'hard' ? 'destructive' : 'default'}
                disabled={isSubmitting || loading}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {deleteType === 'hard' ? 'Eliminando...' : 'Desactivando...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    {deleteType === 'hard' ? 'Eliminar Permanentemente' : 'Desactivar Usuario'}
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