// app/(app)/membership/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { useMembershipSettings } from '@/lib/hooks/useMembership';
import { membershipService } from '@/lib/membershipService';
import { UserMembership } from '@/types/membership';
import { UserService } from '@/lib/userService';
import { 
  Settings, 
  DollarSign, 
  Crown, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  Pause,
  Play,
  User,
  Mail,
  Eye,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';

// Interfaz extendida para incluir datos del usuario
interface MembershipWithUser extends UserMembership {
  user?: {
    displayName?: string;
    email: string;
  } | null;
}

export default function MembershipManagementPage() {
  const { role, loading: roleLoading } = useUserRole();
  const { settings, updateSettings, loading: settingsLoading } = useMembershipSettings();
  const [userMemberships, setUserMemberships] = useState<MembershipWithUser[]>([]);
  const [filteredMemberships, setFilteredMemberships] = useState<MembershipWithUser[]>([]);
  const [loadingMemberships, setLoadingMemberships] = useState(true);
  const [expandedMembership, setExpandedMembership] = useState<string | null>(null);
  
  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'expired' | 'suspended'>('all');

  // Form states
  const [price, setPrice] = useState(15);
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('Acceso completo a todas las funciones de NovaFact');
  const [features, setFeatures] = useState(['Verificación ilimitada de DTEs', 'Reportes avanzados', 'Soporte prioritario']);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (settings) {
      setPrice(settings.monthlyPrice);
      setCurrency(settings.currency);
      setDescription(settings.description);
      setFeatures(settings.features || []);
      setIsActive(settings.isActive);
    }
  }, [settings]);

  useEffect(() => {
    if (role === 'admin') {
      loadUserMemberships();
    }
  }, [role]);

  // Efecto para filtrar membresías
  useEffect(() => {
    let filtered = userMemberships;
    
    if (activeFilter !== 'all') {
      filtered = userMemberships.filter(membership => membership.status === activeFilter);
    }
    
    setFilteredMemberships(filtered);
    setCurrentPage(1); // Reset a la primera página cuando se cambia el filtro
  }, [userMemberships, activeFilter]);

  // Calcular membresías para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMemberships = filteredMemberships.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMemberships.length / itemsPerPage);

  const loadUserMemberships = async () => {
    try {
      setLoadingMemberships(true);
      const memberships = await membershipService.getAllUserMemberships();
      
      // Enriquecer con datos de usuarios
      const enrichedMemberships: MembershipWithUser[] = await Promise.all(
        memberships.map(async (membership) => {
          try {
            // Buscar información del usuario
            const response = await fetch(`/api/users/${membership.userId}`);
            if (response.ok) {
              const userData = await response.json();
              return {
                ...membership,
                user: {
                  displayName: userData.displayName,
                  email: userData.email
                }
              };
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
          
          return {
            ...membership,
            user: null
          };
        })
      );
      
      setUserMemberships(enrichedMemberships);
    } catch (error) {
      console.error('Error loading memberships:', error);
    } finally {
      setLoadingMemberships(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        monthlyPrice: price,
        currency,
        description,
        features,
        isActive
      });
      alert('Configuración actualizada correctamente');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Error al actualizar la configuración');
    }
  };

  const handleSuspendMembership = async (membershipId: string, reason: string) => {
    try {
      await membershipService.suspendUserMembership(membershipId, reason);
      await loadUserMemberships();
    } catch (error) {
      console.error('Error suspending membership:', error);
      alert('Error al suspender la membresía');
    }
  };

  const handleReactivateMembership = async (membershipId: string) => {
    try {
      await membershipService.reactivateUserMembership(membershipId);
      await loadUserMemberships();
    } catch (error) {
      console.error('Error reactivating membership:', error);
      alert('Error al reactivar la membresía');
    }
  };

  const toggleMembershipDetails = (membershipId: string) => {
    setExpandedMembership(expandedMembership === membershipId ? null : membershipId);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedMembership(null); // Cerrar detalles al cambiar de página
  };

  const handleFilterChange = (filter: 'all' | 'active' | 'expired' | 'suspended') => {
    setActiveFilter(filter);
    setExpandedMembership(null); // Cerrar detalles al cambiar filtro
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
        icon: CheckCircle,
        text: 'Activa'
      },
      expired: { 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
        icon: Calendar,
        text: 'Vencida'
      },
      suspended: { 
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
        icon: AlertTriangle,
        text: 'Suspendida'
      }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.expired;
    const IconComponent = statusConfig.icon;
    
    return (
      <Badge className={`text-xs ${statusConfig.color} border-0`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {statusConfig.text}
      </Badge>
    );
  };

  const getDaysInfo = (membership: MembershipWithUser) => {
    const now = new Date();
    const daysRemaining = Math.ceil(
      (membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysExpired = Math.ceil(
      (now.getTime() - membership.endDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (membership.status === 'active') {
      return {
        value: daysRemaining > 0 ? `${daysRemaining}` : '0',
        label: 'días restantes',
        color: daysRemaining <= 7 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
      };
    } else if (membership.status === 'expired') {
      return {
        value: `${daysExpired}`,
        label: 'días vencida',
        color: 'text-red-600 dark:text-red-400'
      };
    } else {
      return {
        value: '-',
        label: 'suspendida',
        color: 'text-orange-600 dark:text-orange-400'
      };
    }
  };

  // Componente de paginación
  const Pagination = () => {
    const getPageNumbers = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredMemberships.length)} de {filteredMemberships.length} membresías
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-center sm:justify-end space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1"
            >
              <span className="hidden sm:inline">Anterior</span>
              <span className="sm:hidden">‹</span>
            </Button>
            
            <div className="flex items-center space-x-1">
              {getPageNumbers().map((pageNum, index) => (
                <Button
                  key={index}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                  disabled={pageNum === '...'}
                  className="px-3 py-1 min-w-[40px]"
                >
                  {pageNum}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <span className="sm:hidden">›</span>
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center p-6">
            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Acceso Denegado</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Solo los administradores pueden acceder a esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Crown className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Membresías</h1>
        </div>      {/* CONFIGURACIÓN DE PRECIOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Membresía
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Precio mensual
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive">Membresía activa</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción de la membresía"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Características incluidas</Label>
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...features];
                        newFeatures[index] = e.target.value;
                        setFeatures(newFeatures);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFeatures = features.filter((_, i) => i !== index);
                        setFeatures(newFeatures);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFeatures([...features, ''])}
                >
                  Agregar característica
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={settingsLoading}>
              {settingsLoading ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* LISTA DE MEMBRESÍAS DE USUARIOS */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membresías de Usuarios ({filteredMemberships.length})
            </CardTitle>
            
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('all')}
                className="text-xs"
              >
                Todas ({userMemberships.length})
              </Button>
              <Button
                variant={activeFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('active')}
                className="text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Activas</span> ({userMemberships.filter(m => m.status === 'active').length})
              </Button>
              <Button
                variant={activeFilter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('expired')}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Vencidas</span> ({userMemberships.filter(m => m.status === 'expired').length})
              </Button>
              <Button
                variant={activeFilter === 'suspended' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('suspended')}
                className="text-xs"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Suspendidas</span> ({userMemberships.filter(m => m.status === 'suspended').length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMemberships ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : filteredMemberships.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {activeFilter === 'all' ? 'No hay membresías' : `No hay membresías ${activeFilter === 'active' ? 'activas' : activeFilter === 'expired' ? 'vencidas' : 'suspendidas'}`}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {activeFilter === 'all' 
                  ? 'No se encontraron membresías de usuarios en el sistema.' 
                  : `Cambia el filtro para ver todas las membresías.`
                }
              </p>
            </div>
          ) : (
            <>
              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Fechas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Días
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentMemberships.map((membership) => {
                      const daysInfo = getDaysInfo(membership);
                      const isExpanded = expandedMembership === membership.id;

                      return (
                        <React.Fragment key={membership.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {membership.user?.displayName || 'Usuario sin nombre'}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {membership.user?.email || 'Sin email'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(membership.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {membership.planId || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <div>
                                <div className="text-xs">Inicio: {membership.startDate.toLocaleDateString()}</div>
                                <div className="text-xs">Fin: {membership.endDate.toLocaleDateString()}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${daysInfo.color}`}>
                                {daysInfo.value}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                {daysInfo.label}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMembershipDetails(membership.id)}
                                className="p-2"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {membership.status === 'active' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => {
                                    const reason = prompt('Motivo de suspensión:');
                                    if (reason) {
                                      handleSuspendMembership(membership.id, reason);
                                    }
                                  }}
                                >
                                  <Pause className="h-3 w-3 mr-1" />
                                  Suspender
                                </Button>
                              )}
                              
                              {membership.status === 'suspended' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => handleReactivateMembership(membership.id)}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Reactivar
                                </Button>
                              )}
                            </td>
                          </tr>
                          
                          {/* Fila expandible con detalles */}
                          {isExpanded && (
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">ID de Usuario:</span>
                                    <div className="font-mono text-xs text-gray-900 dark:text-white mt-1">
                                      {membership.userId}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Activa:</span>
                                    <div className="font-medium text-gray-900 dark:text-white mt-1">
                                      {membership.isActive ? 'Sí' : 'No'}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Creado:</span>
                                    <div className="font-medium text-gray-900 dark:text-white mt-1">
                                      {membership.createdAt.toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Actualizado:</span>
                                    <div className="font-medium text-gray-900 dark:text-white mt-1">
                                      {membership.updatedAt.toLocaleDateString()}
                                    </div>
                                  </div>
                                  
                                  {membership.suspensionReason && (
                                    <div className="col-span-2 md:col-span-4">
                                      <span className="text-gray-500 dark:text-gray-400">Motivo de suspensión:</span>
                                      <div className="font-medium text-orange-600 dark:text-orange-400 mt-1">
                                        {membership.suspensionReason}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación */}
              <Pagination />
            </>
          )}
        </CardContent>
      </Card>

      {/* ESTADÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {userMemberships.filter(m => m.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vencidas</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {userMemberships.filter(m => m.status === 'expired').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Suspendidas</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {userMemberships.filter(m => m.status === 'suspended').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {userMemberships.length}
                </p>
              </div>
              <Crown className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}