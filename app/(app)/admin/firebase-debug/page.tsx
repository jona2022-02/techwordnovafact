'use client';

import { useState } from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { auth } from '@/lib/firebase';

interface DiagnosticResult {
  clientSDK: boolean;
  adminSDK: boolean;
  firebaseAuth: boolean;
  envVars: {
    clientVars: string[];
    adminVars: string[];
  };
  userInfo: {
    uid?: string;
    email?: string;
    role?: string;
  };
}

export default function FirebaseDebugPage() {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState('');

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    throw new Error('Usuario no autenticado');
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/admin/firebase-diagnostic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || 'Error en diagnóstico');
      }
    } catch (err: any) {
      console.error('Error ejecutando diagnóstico:', err);
      setError(`Error: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
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
          <div className="p-2 bg-red-100 rounded-lg">
            <Settings className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diagnóstico Firebase</h1>
            <p className="text-gray-600">Diagnostica problemas de configuración de Firebase</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Botón de diagnóstico */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ejecutar Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runDiagnostics}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Ejecutar Diagnóstico
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {results && (
        <div className="space-y-6">
          {/* Estado de SDKs */}
          <Card>
            <CardHeader>
              <CardTitle>Estado de SDKs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Firebase Client SDK</span>
                <Badge variant={results.clientSDK ? "default" : "destructive"}>
                  {results.clientSDK ? "✓ Funcional" : "✗ Error"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Firebase Admin SDK</span>
                <Badge variant={results.adminSDK ? "default" : "destructive"}>
                  {results.adminSDK ? "✓ Funcional" : "✗ Error"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Firebase Auth</span>
                <Badge variant={results.firebaseAuth ? "default" : "destructive"}>
                  {results.firebaseAuth ? "✓ Funcional" : "✗ Error"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Variables de entorno */}
          <Card>
            <CardHeader>
              <CardTitle>Variables de Entorno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Variables Cliente:</h4>
                <div className="space-y-2">
                  {results.envVars.clientVars.map((envVar, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-mono">{envVar}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Variables Admin:</h4>
                <div className="space-y-2">
                  {results.envVars.adminVars.map((envVar, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-mono">{envVar}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del usuario */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">UID:</span>
                <span className="font-mono text-sm">{results.userInfo.uid || 'No disponible'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Email:</span>
                <span className="text-sm">{results.userInfo.email || 'No disponible'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Rol:</span>
                <Badge variant={results.userInfo.role === 'admin' ? "default" : "secondary"}>
                  {results.userInfo.role || 'No determinado'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}