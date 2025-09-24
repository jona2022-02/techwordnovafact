// components/admin/UserActionsModal.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserProfile } from '@/types/auth';
import { X, Mail, Key, RefreshCw, AlertCircle } from 'lucide-react';

interface UserActionsModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSendVerificationEmail?: (uid: string) => Promise<void>;
  onSendPasswordReset?: (email: string) => Promise<void>;
  onForcePasswordReset?: (uid: string) => Promise<void>;
  loading?: boolean;
}

export function UserActionsModal({ 
  user, 
  isOpen, 
  onClose, 
  onSendVerificationEmail,
  onSendPasswordReset,
  onForcePasswordReset,
  loading = false 
}: UserActionsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !user) return null;

  const handleAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      await action();
      setMessage({ type: 'success', text: successMessage });
    } catch (error) {
      console.error('Error en acción:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al realizar la acción' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-background border shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle>Acciones de Usuario</CardTitle>
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
          <div className="space-y-4">
            {/* Información del usuario */}
            <div className="p-3 rounded-lg bg-muted/30 border">
              <h4 className="font-medium text-sm mb-2">Usuario seleccionado</h4>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Email:</span> {user.email}</div>
                <div><span className="text-muted-foreground">Nombre:</span> {user.displayName || 'Sin nombre'}</div>
                <div><span className="text-muted-foreground">Estado:</span> 
                  <span className={user.isActive ? 'text-green-600 dark:text-green-400 ml-1' : 'text-red-600 dark:text-red-400 ml-1'}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones disponibles */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Acciones disponibles</h4>
              
              {/* Reenviar email de verificación */}
              {onSendVerificationEmail && (
                <Button
                  variant="outline"
                  onClick={() => handleAction(
                    () => onSendVerificationEmail(user.uid),
                    'Email de verificación enviado exitosamente'
                  )}
                  disabled={isSubmitting || loading}
                  className="w-full flex items-center justify-start gap-3 p-4 h-auto"
                >
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Reenviar email de verificación</div>
                    <div className="text-xs text-muted-foreground">
                      Envía un nuevo email para verificar la cuenta
                    </div>
                  </div>
                </Button>
              )}

              {/* Enviar reset de contraseña */}
              {onSendPasswordReset && (
                <Button
                  variant="outline"
                  onClick={() => handleAction(
                    () => onSendPasswordReset(user.email),
                    'Email de recuperación de contraseña enviado'
                  )}
                  disabled={isSubmitting || loading}
                  className="w-full flex items-center justify-start gap-3 p-4 h-auto"
                >
                  <Key className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Enviar reset de contraseña</div>
                    <div className="text-xs text-muted-foreground">
                      Envía un email para que el usuario cambie su contraseña
                    </div>
                  </div>
                </Button>
              )}

              {/* Forzar cambio de contraseña */}
              {onForcePasswordReset && (
                <Button
                  variant="outline"
                  onClick={() => handleAction(
                    () => onForcePasswordReset(user.uid),
                    'Contraseña reseteada. El usuario deberá crear una nueva'
                  )}
                  disabled={isSubmitting || loading}
                  className="w-full flex items-center justify-start gap-3 p-4 h-auto border-orange-200 hover:border-orange-300"
                >
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div className="text-left">
                    <div className="font-medium text-sm text-orange-600 dark:text-orange-400">
                      Forzar cambio de contraseña
                    </div>
                    <div className="text-xs text-muted-foreground">
                      El usuario deberá crear una nueva contraseña al iniciar sesión
                    </div>
                  </div>
                </Button>
              )}
            </div>

            {/* Mensaje de respuesta */}
            {message && (
              <div className={`p-3 rounded-lg border ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <p className={`text-sm ${
                  message.type === 'success' 
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {message.text}
                </p>
              </div>
            )}

            {/* Estado de carga */}
            {isSubmitting && (
              <div className="flex items-center justify-center gap-2 p-3">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Procesando...</span>
              </div>
            )}

            {/* Botón cerrar */}
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}