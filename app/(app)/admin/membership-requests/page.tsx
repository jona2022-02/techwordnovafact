"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { MembershipRequestService } from '@/lib/membershipRequestService';
import { MembershipService } from '@/lib/membershipService';
import { MembershipRequest, MembershipRequestStatus } from '@/types/membership';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/Loader';
import { 
  Check, 
  X, 
  Clock, 
  User, 
  Calendar,
  DollarSign,
  MessageSquare,
  Filter,
  RefreshCw
} from 'lucide-react';

export default function MembershipRequestsPage() {
  const { user, role, loading: authLoading } = useUserRole();
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<MembershipRequestStatus | 'all'>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const requestService = MembershipRequestService.getInstance();
  const membershipService = MembershipService.getInstance();

  // Cargar solicitudes
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const [requestsData, statsData] = await Promise.all([
        requestService.getAllRequests(),
        requestService.getRequestsStats()
      ]);
      
      setRequests(requestsData);
      setStats(statsData);
      
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    } finally {
      setLoading(false);
    }
  }, [requestService]);

  // Filtrar solicitudes
  useEffect(() => {
    if (filter === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(req => req.status === filter));
    }
  }, [requests, filter]);

  useEffect(() => {
    if (!authLoading && user && role === 'admin') {
      loadRequests();
    }
  }, [authLoading, user, role, loadRequests]);

  // Procesar solicitud (aprobar o rechazar)
  const handleProcessRequest = async (
    requestId: string, 
    status: 'approved' | 'rejected',
    requestData: MembershipRequest
  ) => {
    if (!user) return;
    
    setActionLoading(requestId);
    
    try {
      // Actualizar estado de la solicitud
      await requestService.processRequest(requestId, status, user.uid);
      
      // Si es aprobada, activar la membresía del usuario
      if (status === 'approved') {
        // Usar 30 días por defecto (esto debería venir del plan)
        await membershipService.activateUserMembership(
          requestData.userId,
          requestData.planId,
          30
        );
      }
      
      // Recargar solicitudes
      await loadRequests();
      
    } catch (error) {
      console.error('Error procesando solicitud:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: MembershipRequestStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: MembershipRequestStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: MembershipRequestStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Desconocido';
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Access control
  if (!user || role !== 'admin') {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p>Solo los administradores pueden acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Solicitudes de Membresía</h1>
          <p className="text-gray-600 mt-2">
            Revisa y procesa las solicitudes de membresía de los usuarios
          </p>
        </div>
        <Button onClick={loadRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Aprobadas</p>
                <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              </div>
              <Check className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Rechazadas</p>
                <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              </div>
              <X className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todas ({stats.total})
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              Pendientes ({stats.pending})
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('approved')}
            >
              Aprobadas ({stats.approved})
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('rejected')}
            >
              Rechazadas ({stats.rejected})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de solicitudes */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay solicitudes</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'No se han encontrado solicitudes de membresía.'
                : `No hay solicitudes con estado "${getStatusLabel(filter as MembershipRequestStatus)}".`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-semibold text-lg">{request.userName}</h3>
                        <p className="text-sm text-gray-600">{request.userEmail}</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Plan solicitado:</p>
                        <p className="font-medium">{request.planName}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="font-semibold">
                          ${request.planPrice.toLocaleString()} {request.planCurrency}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Solicitado: {request.requestDate.toLocaleDateString()}
                        </span>
                      </div>
                      
                      {request.processedDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Procesado: {request.processedDate.toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {request.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-sm text-gray-700">
                          <strong>Notas:</strong> {request.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 ml-4">
                    <Badge className={`${getStatusColor(request.status)} flex items-center gap-1`}>
                      {getStatusIcon(request.status)}
                      {getStatusLabel(request.status)}
                    </Badge>
                    
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => handleProcessRequest(request.id, 'approved', request)}
                          disabled={actionLoading === request.id}
                        >
                          {actionLoading === request.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Aprobar
                            </>
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => handleProcessRequest(request.id, 'rejected', request)}
                          disabled={actionLoading === request.id}
                        >
                          {actionLoading === request.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Rechazar
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}