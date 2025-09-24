// components/admin/SyncUserButton.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { RefreshCw } from 'lucide-react';

export function SyncUserButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { user, refreshClaims } = useUserRole();

  const handleSync = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setMessage(null);

      const token = await user.getIdToken();
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al sincronizar usuario');
      }

      const result = await response.json();
      
      // Forzar actualización de claims en el cliente
      await refreshClaims();
      
      // Recargar la página para aplicar cambios
      window.location.reload();
      
      setMessage('Usuario sincronizado correctamente');
    } catch (error) {
      setMessage('Error al sincronizar: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex flex-col space-y-2">
        <p className="text-sm text-yellow-800">
          <strong>¿Cambiaste tu rol desde la base de datos?</strong>
          <br />
          Sincroniza tus permisos para ver los cambios.
        </p>
        
        <Button
          onClick={handleSync}
          disabled={loading || !user}
          className="w-full"
          variant="outline"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Permisos
            </>
          )}
        </Button>
        
        {message && (
          <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}