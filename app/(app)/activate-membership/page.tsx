'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Crown, ArrowRight, AlertCircle, CheckCircle2, Clock, Star } from 'lucide-react';
import { useMembership } from '@/lib/hooks/useMembership';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { MarketingService } from '@/lib/marketingService';
import { MembershipRequestService } from '@/lib/membershipRequestService';
import { MarketingPlan } from '@/types/membership';
import Loader from '@/components/Loader';

export default function ActivateMembershipPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUserRole();
  const { hasValidMembership, loading: membershipLoading } = useMembership();
  
  // State para planes y solicitudes
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MarketingPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const marketingService = MarketingService.getInstance();
  const requestService = MembershipRequestService.getInstance();

  // Cargar planes y verificar solicitudes pendientes
  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Cargar planes activos
      const plansData = await marketingService.getActivePlans();
      setPlans(plansData);
      
      // Verificar si hay solicitud pendiente
      const hasPending = await requestService.hasUserPendingRequest(user.uid);
      setHasPendingRequest(hasPending);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error cargando la información');
    } finally {
      setLoading(false);
    }
  }, [user, marketingService, requestService]);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, loadData]);

  // Manejar envío de solicitud
  const handleRequestMembership = async (plan: MarketingPlan) => {
    if (!user) return;
    
    setError('');
    setIsSubmitting(true);
    setSelectedPlan(plan);

    try {
      await requestService.createRequest({
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || '',
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.price,
        planCurrency: plan.currency,
        status: 'pending',
        requestDate: new Date()
      });

      setSuccess(true);
      setHasPendingRequest(true);
      
    } catch (err: any) {
      setError(err.message || 'Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    router.push('/home');
  };

  // Loading states
  if (authLoading || membershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Si el usuario ya tiene membresía, redirigir
  if (hasValidMembership) {
    router.push('/home');
    return null;
  }

  // Pantalla de éxito
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
              ¡Solicitud Enviada!
            </h2>
            <p className="text-muted-foreground mb-4">
              Tu solicitud de membresía para el plan <strong>{selectedPlan?.name}</strong> ha sido enviada.
              Un administrador la revisará pronto.
            </p>
            <Button onClick={handleGoBack} className="w-full">
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Crown className="h-12 w-12 text-yellow-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {hasPendingRequest ? 'Solicitud en Proceso' : 'Solicita tu Membresía Premium'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {hasPendingRequest 
                ? 'Ya tienes una solicitud de membresía pendiente. Un administrador la revisará pronto.'
                : 'Selecciona el plan que mejor se adapte a tus necesidades y envía tu solicitud de membresía.'
              }
            </p>
          </div>

          {/* Mensaje de solicitud pendiente */}
          {hasPendingRequest && (
            <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-yellow-600" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      Solicitud Pendiente
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                      Ya tienes una solicitud de membresía en proceso. Te notificaremos cuando sea aprobada.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error message */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          )}

          {/* Planes disponibles */}
          {!loading && plans.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all duration-300 hover:scale-105 ${
                    plan.isPopular 
                      ? 'border-yellow-400/50 bg-gradient-to-br from-yellow-600/20 to-amber-600/20 shadow-xl' 
                      : 'border-gray-200 dark:border-gray-700 hover:shadow-lg'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-1 text-xs font-semibold rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        MÁS POPULAR
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
                      {plan.isPopular && <Crown className="w-5 h-5 text-yellow-500" />}
                      {plan.name}
                    </CardTitle>
                    
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-3xl font-bold">
                        ${plan.price.toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {plan.currency}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>{plan.duration} días</span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-3">
                      {plan.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className={`w-full ${
                        plan.isPopular 
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600'
                          : ''
                      }`}
                      onClick={() => handleRequestMembership(plan)}
                      disabled={isSubmitting || hasPendingRequest}
                    >
                      {isSubmitting && selectedPlan?.id === plan.id ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Enviando...
                        </div>
                      ) : hasPendingRequest ? (
                        'Solicitud Pendiente'
                      ) : (
                        <div className="flex items-center gap-2">
                          Solicitar Plan
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Sin planes disponibles */}
          {!loading && plans.length === 0 && (
            <Card className="text-center p-8">
              <CardContent>
                <Crown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hay planes disponibles</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Actualmente no hay planes de membresía disponibles.
                  Por favor, contacta al administrador.
                </p>
                <Button onClick={handleGoBack}>
                  Volver al Inicio
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Botón volver */}
          <div className="flex justify-center mt-8">
            <Button variant="outline" onClick={handleGoBack}>
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}