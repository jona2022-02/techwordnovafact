'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMembership } from '@/lib/hooks/useMembership';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/Loader';
import { RefreshCw, CheckCircle, XCircle, Clock, User } from 'lucide-react';

export default function DebugMembershipPage() {
  const { user, loading: authLoading } = useAuth();
  const { membership, hasValidMembership, daysRemaining, loading: membershipLoading } = useMembership();
  const [allMemberships, setAllMemberships] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const loadAllMemberships = async () => {
    if (!user) return;
    
    try {
      setLoadingAll(true);
      const response = await fetch(`/api/debug/memberships/${user.uid}`);
      const data = await response.json();
      setAllMemberships(data.memberships || []);
    } catch (error) {
      console.error('Error loading all memberships:', error);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadAllMemberships();
    }
  }, [user, authLoading]);

  if (authLoading || membershipLoading) {
    return <Loader />;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Usuario no autenticado</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'expired': return <XCircle className="h-4 w-4" />;
      case 'suspended': return <Clock className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Debug de Membresías
        </h1>
        <p className="text-gray-600">
          Información detallada sobre el estado de membresías del usuario
        </p>
      </div>

      {/* Información del Usuario */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>UID:</strong> {user.uid}
            </div>
            <div>
              <strong>Email:</strong> {user.email}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado Actual de Membresía */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Estado Actual de Membresía
            <Badge variant={hasValidMembership ? "default" : "destructive"}>
              {hasValidMembership ? 'Válida' : 'No Válida'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membership ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <strong>ID:</strong> {membership.id}
                </div>
                <div className="flex items-center gap-2">
                  <strong>Estado:</strong>
                  <Badge className={getStatusColor(membership.status)}>
                    {getStatusIcon(membership.status)}
                    {membership.status}
                  </Badge>
                </div>
                <div>
                  <strong>Plan:</strong> {membership.planId}
                </div>
                <div>
                  <strong>Fecha Inicio:</strong> {membership.startDate?.toLocaleDateString('es-ES') || 'N/A'}
                </div>
                <div>
                  <strong>Fecha Fin:</strong> {membership.endDate?.toLocaleDateString('es-ES') || 'N/A'}
                </div>
                <div>
                  <strong>Días Restantes:</strong> {daysRemaining}
                </div>
              </div>
              
              {membership.suspensionReason && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <strong>Razón de Suspensión:</strong> {membership.suspensionReason}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No se encontró membresía activa</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Todas las Membresías */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Historial Completo de Membresías
            <Button 
              onClick={loadAllMemberships} 
              disabled={loadingAll}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingAll ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
          </CardTitle>
          <CardDescription>
            Todas las membresías encontradas en la base de datos para este usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAll ? (
            <div className="text-center p-6">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p>Cargando membresías...</p>
            </div>
          ) : allMemberships.length > 0 ? (
            <div className="space-y-4">
              {allMemberships.map((membership, index) => (
                <div key={membership.id || index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Membresía #{index + 1}</h4>
                    <Badge className={getStatusColor(membership.status)}>
                      {getStatusIcon(membership.status)}
                      {membership.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <strong>ID:</strong> {membership.id || 'N/A'}
                    </div>
                    <div>
                      <strong>Plan:</strong> {membership.planId || membership.membershipId || 'N/A'}
                    </div>
                    <div>
                      <strong>Inicio:</strong> {
                        membership.startDate 
                          ? new Date(membership.startDate.seconds * 1000).toLocaleDateString('es-ES') 
                          : 'N/A'
                      }
                    </div>
                    <div>
                      <strong>Fin:</strong> {
                        membership.endDate 
                          ? new Date(membership.endDate.seconds * 1000).toLocaleDateString('es-ES') 
                          : 'N/A'
                      }
                    </div>
                    <div>
                      <strong>Creada:</strong> {
                        membership.createdAt 
                          ? new Date(membership.createdAt.seconds * 1000).toLocaleDateString('es-ES') 
                          : 'N/A'
                      }
                    </div>
                    <div>
                      <strong>Actualizada:</strong> {
                        membership.updatedAt 
                          ? new Date(membership.updatedAt.seconds * 1000).toLocaleDateString('es-ES') 
                          : 'N/A'
                      }
                    </div>
                    <div>
                      <strong>Activa:</strong> {membership.isActive ? 'Sí' : 'No'}
                    </div>
                    <div>
                      <strong>Auto Renovar:</strong> {membership.autoRenew ? 'Sí' : 'No'}
                    </div>
                  </div>

                  {membership.suspensionReason && (
                    <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
                      <strong>Razón de Suspensión:</strong> {membership.suspensionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No se encontraron membresías en la base de datos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información Técnica */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Información Técnica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div><strong>hasValidMembership:</strong> {hasValidMembership.toString()}</div>
            <div><strong>membershipLoading:</strong> {membershipLoading.toString()}</div>
            <div><strong>daysRemaining:</strong> {daysRemaining}</div>
            <div><strong>Current Date:</strong> {new Date().toISOString()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}