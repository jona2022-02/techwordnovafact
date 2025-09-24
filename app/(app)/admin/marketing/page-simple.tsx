"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { MarketingService } from '@/lib/marketingService';
import { MarketingPlan } from '@/types/membership';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/Loader';

export default function MarketingPlansPage() {
  const { user, role, loading: authLoading } = useUserRole();
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p>Solo los administradores pueden acceder a esta página.</p>
        <p className="text-sm text-gray-500 mt-2">Usuario: {user?.email || 'No logueado'} | Rol: {role || 'Sin rol'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Planes de Marketing</h1>
          <p className="text-gray-600 mt-2">
            Administra los planes de membresía que verán los usuarios
          </p>
        </div>
      </div>

      {/* Lista de planes */}
      <div className="grid gap-6">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-500">No hay planes de marketing configurados.</p>
                <Button 
                  onClick={loadPlans}
                  className="mt-4"
                >
                  Recargar planes
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{plan.description}</p>
                <p className="font-bold">${plan.price} {plan.currency}</p>
                <div className="mt-2">
                  {plan.features.map((feature, index) => (
                    <p key={index} className="text-sm text-gray-600">• {feature}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}