'use client';

import { useState } from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Crown,
  CreditCard,
  RefreshCw 
} from 'lucide-react';
import { auth } from '@/lib/firebase';

interface CollectionStatus {
  membershipSettings: boolean;
  userMemberships: boolean;
  paymentRecords: boolean;
}

export default function FirebaseInitPage() {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [collections, setCollections] = useState<CollectionStatus | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    throw new Error('Usuario no autenticado');
  };

  const checkCollectionsStatus = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/admin/initialize-collections', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      console.log('Status check response:', data); // Debug log
      
      if (data.success) {
        setCollections(data.collections);
        setMessage('Estado de colecciones actualizado');
      } else {
        const errorMsg = `Error: ${data.error}${data.details ? ` - ${data.details}` : ''}${data.timestamp ? ` (${data.timestamp})` : ''}`;
        setError(errorMsg);
        console.error('Error verificando estado:', data);
      }
    } catch (err: any) {
      console.error('Error de red verificando estado:', err);
      setError(`Error de red: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const initializeCollections = async () => {
    setInitLoading(true);
    setError('');
    setMessage('');
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/admin/initialize-collections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'initialize' })
      });

      const data = await response.json();
      
      console.log('Response data:', data); // Debug log
      
      if (data.success) {
        setMessage('¡Colecciones inicializadas exitosamente!');
        // Refrescar estado
        await checkCollectionsStatus();
      } else {
        const errorMsg = `Error: ${data.error}${data.details ? ` - ${data.details}` : ''}${data.timestamp ? ` (${data.timestamp})` : ''}`;
        setError(errorMsg);
        console.error('Error desde la API:', data);
      }
    } catch (err: any) {
      console.error('Error de red o cliente:', err);
      setError(`Error de red: ${err.message || 'Error desconocido'}`);
    } finally {
      setInitLoading(false);
    }
  };

  const createExampleMembership = async () => {
    setInitLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      const token = await getAuthToken();
      const response = await fetch('/api/admin/initialize-collections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'create-example-membership', 
          userId: user.uid 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('¡Membresía de ejemplo creada para tu usuario!');
        await checkCollectionsStatus();
      } else {
        setError(data.error || 'Error creando membresía de ejemplo');
      }
    } catch (err: any) {
      setError(err.message || 'Error de red');
    } finally {
      setInitLoading(false);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600">Solo los administradores pueden acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inicialización de Firebase</h1>
            <p className="text-gray-600">Configura las colecciones de Firebase para el sistema de membresías</p>
          </div>
        </div>
      </div>

      {/* Status y mensajes */}
      <div className="grid gap-6">
        {message && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700">{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Acciones principales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Acciones de Inicialización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={checkCollectionsStatus}
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verificar Estado
              </Button>

              <Button 
                onClick={initializeCollections}
                disabled={initLoading}
              >
                {initLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Inicializar Colecciones
              </Button>

              <Button 
                onClick={createExampleMembership}
                disabled={initLoading}
                variant="secondary"
              >
                {initLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Crear Membresía de Ejemplo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estado de colecciones */}
        {collections && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Estado de las Colecciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">membershipSettings</span>
                  </div>
                  <Badge variant={collections.membershipSettings ? "default" : "destructive"}>
                    {collections.membershipSettings ? "Configurada" : "Faltante"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">userMemberships</span>
                  </div>
                  <Badge variant={collections.userMemberships ? "default" : "secondary"}>
                    {collections.userMemberships ? "Con datos" : "Vacía"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">paymentRecords</span>
                  </div>
                  <Badge variant={collections.paymentRecords ? "default" : "secondary"}>
                    {collections.paymentRecords ? "Con datos" : "Vacía"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información */}
        <Card>
          <CardHeader>
            <CardTitle>Información sobre las Colecciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">membershipSettings</h4>
              <p className="text-sm text-gray-600">
                Contiene la configuración global de membresías (precio, características, etc.). 
                Es necesaria para que funcione el sistema de membresías.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">userMemberships</h4>
              <p className="text-sm text-gray-600">
                Almacena las membresías individuales de cada usuario. Se crea automáticamente 
                cuando los usuarios activan sus membresías.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">paymentRecords</h4>
              <p className="text-sm text-gray-600">
                Registra todos los pagos realizados por los usuarios. Se crea automáticamente 
                cuando se procesan pagos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}