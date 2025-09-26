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
    <div className="flex flex-col items-center gap-2 py-2">
      <Button
        onClick={handleSync}
        disabled={loading || !user}
        className="rounded-full px-5 py-2 shadow-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
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
        <span className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</span>
      )}
    </div>
  );
}