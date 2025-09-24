"use client";

import { useState } from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Shield, 
  Key, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { AVAILABLE_PERMISSIONS } from '@/types/auth';

export default function PermissionsDebug() {
  const { user, role, permissions, loading, refreshClaims } = useUserRole();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshClaims = async () => {
    setRefreshing(true);
    try {
      await refreshClaims();
    } catch (error) {
      console.error('Error refrescando claims:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No hay usuario autenticado</h2>
            <p className="text-gray-600">Inicia sesión para ver la información de permisos</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasMarketingPermission = permissions.includes('admin-marketing');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Debug de Permisos</h1>
        <Button 
          onClick={handleRefreshClaims} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refrescar Claims
        </Button>
      </div>

      {/* Información del Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Usuario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="font-mono">{user.email || 'No disponible'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">UID</label>
              <p className="font-mono text-xs">{user.uid}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Nombre</label>
              <p>{user.displayName || 'No configurado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Rol</label>
              <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                <Shield className="h-3 w-3 mr-1" />
                {role || 'Sin rol'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado del Permiso de Marketing */}
      <Card className={hasMarketingPermission ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasMarketingPermission ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Estado del Permiso de Marketing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className={`font-medium ${hasMarketingPermission ? 'text-green-700' : 'text-red-700'}`}>
              {hasMarketingPermission 
                ? '✅ Tienes acceso al módulo de Marketing' 
                : '❌ No tienes acceso al módulo de Marketing'}
            </p>
            <p className="text-sm text-gray-600">
              Permiso requerido: <code className="bg-gray-100 px-1 rounded">admin-marketing</code>
            </p>
            {!hasMarketingPermission && role === 'admin' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Eres administrador pero no tienes el permiso de marketing. 
                  Esto puede solucionarse ejecutando el script de sincronización de permisos.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permisos Actuales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Permisos Actuales ({permissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {permissions.map((permissionId) => {
              const permission = AVAILABLE_PERMISSIONS.find(p => p.id === permissionId);
              return (
                <Badge 
                  key={permissionId} 
                  variant={permissionId === 'admin-marketing' ? 'default' : 'secondary'}
                  className="justify-start"
                >
                  {permission?.name || permissionId}
                </Badge>
              );
            })}
          </div>
          {permissions.length === 0 && (
            <p className="text-gray-500 italic">No hay permisos asignados</p>
          )}
        </CardContent>
      </Card>

      {/* Todos los Permisos Disponibles */}
      <Card>
        <CardHeader>
          <CardTitle>Todos los Permisos Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {AVAILABLE_PERMISSIONS.map((permission) => {
              const hasPermission = permissions.includes(permission.id);
              return (
                <div 
                  key={permission.id} 
                  className={`flex items-center justify-between p-2 rounded border ${
                    hasPermission ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <p className="font-medium">{permission.name}</p>
                    <p className="text-xs text-gray-500">{permission.description}</p>
                    <code className="text-xs bg-gray-100 px-1 rounded">{permission.id}</code>
                  </div>
                  <div>
                    {hasPermission ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones de Solución */}
      {role === 'admin' && !hasMarketingPermission && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">🔧 Cómo solucionar este problema</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-2">
            <p className="font-medium">Para que aparezca el módulo de Marketing en el sidebar:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Ejecuta el script: <code className="bg-blue-100 px-1 rounded">node scripts/sync-admin-permissions.js</code></li>
              <li>Cierra sesión completamente</li>
              <li>Vuelve a iniciar sesión</li>
              <li>El módulo de Marketing debería aparecer en el sidebar</li>
            </ol>
            <p className="text-xs mt-3">
              Este problema ocurre porque los permisos se almacenan en Firebase Custom Claims 
              y necesitan ser actualizados cuando se agregan nuevos permisos al sistema.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}