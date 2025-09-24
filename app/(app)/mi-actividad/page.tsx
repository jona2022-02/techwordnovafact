// app/(app)/mi-actividad/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Loader from '@/components/Loader';
import { AlertCircle, CheckCircle, FileText, Calendar, BarChart3, TrendingUp } from 'lucide-react';

interface BasicLog {
  id: string;
  tipoVerificacion: 'CSV' | 'JSON' | 'CODIGO_FECHA';
  cantidadArchivos: number;
  cantidadResultados: number;
  fechaHora: { seconds: number };
  exito: boolean;
  duracionMs: number;
}

interface UserStats {
  totalProcesos: number;
  procesosExitosos: number;
  procesosFallidos: number;
  totalArchivos: number;
  tiposVerificacion: {
    CSV: number;
    JSON: number;
    CODIGO_FECHA: number;
  };
  ultimoProceso?: string;
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
};

const getVerificationTypeLabel = (type: string): string => {
  switch (type) {
    case 'CSV': return 'Archivos CSV';
    case 'JSON': return 'JSON Individual';
    case 'CODIGO_FECHA': return 'Código y Fecha';
    default: return type;
  }
};

export default function MiActividadPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<BasicLog[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || authLoading) return;
    
    loadUserActivity();
  }, [user, authLoading]);

  const loadUserActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar logs y estadísticas
      const [logsResponse, statsResponse] = await Promise.all([
        fetch('/api/users/activity/logs'),
        fetch('/api/users/activity/stats')
      ]);

      if (!logsResponse.ok || !statsResponse.ok) {
        throw new Error('Error al cargar la actividad');
      }

      const logsData = await logsResponse.json();
      const statsData = await statsResponse.json();

      setLogs(logsData.logs || []);
      setStats(statsData.stats || null);
    } catch (error) {
      console.error('Error loading user activity:', error);
      setError('Error al cargar tu actividad. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
              <Button 
                onClick={loadUserActivity} 
                variant="outline" 
                className="mt-4"
              >
                Intentar nuevamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin actividad registrada
          </h3>
          <p className="text-gray-500">
            Aún no has procesado ningún DTE. Comienza verificando tus archivos.
          </p>
        </div>
      </div>
    );
  }

  const successRate = stats.totalProcesos > 0 
    ? ((stats.procesosExitosos / stats.totalProcesos) * 100).toFixed(1)
    : '0';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Actividad</h1>
        <p className="text-gray-600">
          Historial de verificaciones y estadísticas de uso
        </p>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Procesos
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProcesos}</div>
            <p className="text-xs text-muted-foreground">
              Verificaciones realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Éxito
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.procesosExitosos} de {stats.totalProcesos}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Archivos Procesados
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArchivos}</div>
            <p className="text-xs text-muted-foreground">
              En total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Último Proceso
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.ultimoProceso 
                ? new Date(stats.ultimoProceso).toLocaleDateString() 
                : 'Nunca'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tipos de verificación */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tipos de Verificación</CardTitle>
          <CardDescription>
            Distribución por tipo de proceso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.tiposVerificacion).map(([tipo, cantidad]) => (
              <div key={tipo} className="text-center">
                <div className="text-3xl font-bold text-blue-600">{cantidad}</div>
                <div className="text-sm text-gray-600">{getVerificationTypeLabel(tipo)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historial reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Historial Reciente</CardTitle>
          <CardDescription>
            Últimas {logs.length} verificaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay actividad reciente
            </p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {log.exito ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    
                    <div>
                      <div className="font-medium">
                        {getVerificationTypeLabel(log.tipoVerificacion)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.fechaHora.seconds * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{log.cantidadArchivos}</div>
                      <div className="text-gray-500">archivos</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{log.cantidadResultados}</div>
                      <div className="text-gray-500">resultados</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{formatDuration(log.duracionMs)}</div>
                      <div className="text-gray-500">duración</div>
                    </div>

                    <Badge variant={log.exito ? "default" : "destructive"}>
                      {log.exito ? 'Exitoso' : 'Error'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}