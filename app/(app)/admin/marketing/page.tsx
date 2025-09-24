"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { MarketingService } from '@/lib/marketingService';
import { MarketingPlan } from '@/types/membership';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/Loader';
import MarketingPlanModal from '@/components/admin/MarketingPlanModal';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Eye, 
  EyeOff, 
  Search,
  Filter,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Target,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function MarketingPlansPage() {
  const { user, role, loading: authLoading } = useUserRole();
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive' | 'popular'>('all');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MarketingPlan | null>(null);

  const marketingService = MarketingService.getInstance();

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📊 Cargando planes de marketing...');
      const plansData = await marketingService.getAllPlans();
      console.log('📋 Planes obtenidos:', plansData.length, plansData);
      setPlans(plansData);
    } catch (error) {
      console.error('❌ Error cargando planes:', error);
    } finally {
      setLoading(false);
    }
  }, [marketingService]);

  // Filter and search logic
  useEffect(() => {
    let filtered = plans;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.features.some(feature => 
          feature.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply status filter
    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(plan => plan.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(plan => !plan.isActive);
        break;
      case 'popular':
        filtered = filtered.filter(plan => plan.isPopular);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredPlans(filtered);
  }, [plans, searchTerm, activeFilter]);

  // CRUD Operations
  const handleCreatePlan = async (planData: Partial<MarketingPlan>) => {
    setActionLoading(true);
    try {
      await marketingService.createPlan({
        ...planData,
        createdBy: user!.uid,
      } as MarketingPlan);
      await loadPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditPlan = async (planData: Partial<MarketingPlan>) => {
    setActionLoading(true);
    try {
      await marketingService.updatePlan(planData.id!, planData);
      await loadPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    
    setActionLoading(true);
    try {
      await marketingService.deletePlan(selectedPlan.id);
      await loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (plan: MarketingPlan) => {
    setActionLoading(true);
    try {
      await marketingService.updatePlan(plan.id, { isActive: !plan.isActive });
      await loadPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const togglePlanDetails = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  const getStatusBadge = (plan: MarketingPlan) => {
    if (!plan.isActive) {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-0">
          <XCircle className="h-3 w-3 mr-1" />
          Inactivo
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-0">
        <CheckCircle className="h-3 w-3 mr-1" />
        Activo
      </Badge>
    );
  };

  const getPopularityBadge = (plan: MarketingPlan) => {
    if (plan.isPopular) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-0">
          <Star className="h-3 w-3 mr-1" />
          Popular
        </Badge>
      );
    }
    return null;
  };

  const getPlansStats = () => {
    return {
      total: plans.length,
      active: plans.filter(p => p.isActive).length,
      inactive: plans.filter(p => !p.isActive).length,
      popular: plans.filter(p => p.isPopular).length
    };
  };

  // Modal handlers
  const openCreateModal = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: MarketingPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const openDeleteModal = (plan: MarketingPlan) => {
    setSelectedPlan(plan);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedPlan(null);
  };

  useEffect(() => {
    const isUserAdmin = role === 'admin';
    
    console.log('🔍 Marketing Debug:', { 
      user: user?.uid, 
      role, 
      isUserAdmin,
      authLoading,
      loading
    });
    
    // Solo cargar una vez que la autenticación haya terminado
    if (!authLoading) {
      if (user && isUserAdmin) {
        console.log('👤 Usuario es admin, cargando planes...');
        loadPlans();
      } else {
        console.log('❌ Usuario no es admin o no está logueado');
        setLoading(false);
      }
    } else {
      console.log('⏳ Esperando autenticación...');
    }
  }, [user, role, authLoading, loadPlans]);

  // Debug temporal - mostrar estado completo
  console.log('🔍 Marketing Page State:', {
    authLoading,
    loading,
    user: user?.uid,
    role
  });

  // Mostrar loading solo si realmente estamos cargando
  if (authLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-gray-600">Verificando permisos de administrador...</p>
        </div>
      </div>
    );
  }

  if (loading && user && role === 'admin') {
    return (
      <div className="p-6">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-gray-600">Cargando planes de marketing...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center p-6">
            <Target className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Acceso Denegado</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-2">
              Solo los administradores pueden acceder a esta página.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Usuario: {user?.email || 'No logueado'} | Rol: {role || 'Sin rol'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getPlansStats();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Planes de Marketing</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Administra los planes de membresía que verán los usuarios
          </p>
        </div>
        <Button onClick={openCreateModal} disabled={actionLoading} className="self-start sm:self-center">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactivos</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Populares</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.popular}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planes de Marketing */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Planes de Marketing ({filteredPlans.length})
            </CardTitle>
            
            {/* Controles de búsqueda y filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Barra de búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar planes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              
              {/* Filtros */}
              <div className="flex gap-2">
                <Button
                  variant={activeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                  className="text-xs"
                >
                  <Filter className="h-3 w-3 mr-1" />
                  Todos ({stats.total})
                </Button>
                <Button
                  variant={activeFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('active')}
                  className="text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Activos</span> ({stats.active})
                </Button>
                <Button
                  variant={activeFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('inactive')}
                  className="text-xs"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Inactivos</span> ({stats.inactive})
                </Button>
                <Button
                  variant={activeFilter === 'popular' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('popular')}
                  className="text-xs"
                >
                  <Star className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Populares</span> ({stats.popular})
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Cargando planes de marketing...</p>
              </div>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {plans.length === 0 ? 'No hay planes configurados' : 'No se encontraron planes'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {plans.length === 0 
                  ? 'Crea tu primer plan de marketing para comenzar.'
                  : searchTerm || activeFilter !== 'all'
                    ? 'Ajusta los filtros de búsqueda para ver más resultados.'
                    : 'No hay planes disponibles en este momento.'
                }
              </p>
              {plans.length === 0 && (
                <div className="space-y-2">
                  <Button onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer plan
                  </Button>
                  <Button variant="outline" onClick={loadPlans} disabled={loading}>
                    {loading ? 'Cargando...' : 'Recargar planes'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duración
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Características
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPlans.map((plan) => {
                    const isExpanded = expandedPlan === plan.id;
                    
                    return (
                      <React.Fragment key={plan.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="flex items-center space-x-2">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {plan.name}
                                  </div>
                                  {getPopularityBadge(plan)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                  {plan.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(plan)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-baseline space-x-1">
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                ${plan.price.toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {plan.currency}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              {plan.duration} días
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {plan.features.length} característica{plan.features.length !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePlanDetails(plan.id)}
                              className="p-2"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(plan)}
                              disabled={actionLoading}
                              className="p-2"
                            >
                              {plan.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(plan)}
                              disabled={actionLoading}
                              className="p-2"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(plan)}
                              disabled={actionLoading}
                              className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                        
                        {/* Fila expandible con detalles */}
                        {isExpanded && (
                          <tr className="bg-gray-50 dark:bg-gray-800">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">Descripción completa:</h4>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{plan.description}</p>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">Características incluidas:</h4>
                                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                    {plan.features.map((feature, index) => (
                                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                        {feature}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">ID del Plan:</span>
                                    <div className="font-mono text-xs text-gray-900 dark:text-white mt-1">{plan.id}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Creado por:</span>
                                    <div className="font-medium text-gray-900 dark:text-white mt-1">{plan.createdBy || 'Sistema'}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Creado:</span>
                                    <div className="font-medium text-gray-900 dark:text-white mt-1">
                                      {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Actualizado:</span>
                                    <div className="font-medium text-gray-900 dark:text-white mt-1">
                                      {plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : 'N/A'}
                                    </div>
                                  </div>
                                </div>
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
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <MarketingPlanModal
        isOpen={isModalOpen}
        onClose={closeModals}
        onSave={selectedPlan ? handleEditPlan : handleCreatePlan}
        plan={selectedPlan}
        isLoading={actionLoading}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        onConfirm={handleDeletePlan}
        plan={selectedPlan}
        isLoading={actionLoading}
      />
    </div>
  );
}