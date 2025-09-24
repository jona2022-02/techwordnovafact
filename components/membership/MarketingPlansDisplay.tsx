"use client";

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { MarketingService } from '@/lib/marketingService';
import { MarketingPlan } from '@/types/membership';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Crown, 
  CheckCircle2, 
  Star,
  Calendar,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

// Memoized component to prevent unnecessary re-renders
export const MarketingPlansDisplay = memo(() => {
  const [plans, setPlans] = useState<MarketingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const marketingService = MarketingService.getInstance();

  useEffect(() => {
    loadPlans();
  },          []);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const plansData = await marketingService.getActivePlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Error cargando planes:', error);
    } finally {
      setLoading(false);
    }
  }, [marketingService]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white/5 rounded-lg p-6">
            <div className="h-6 bg-white/10 rounded mb-4"></div>
            <div className="h-4 bg-white/10 rounded mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-3 bg-white/10 rounded w-full"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <Crown className="h-12 w-12 text-white/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Próximamente: Sistema de membresías
        </h3>
        <p className="text-white/70">
          Estamos preparando nuestros planes de membresía para ti
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`relative transition-all duration-300 hover:scale-105 ${
            plan.isPopular 
              ? 'border-yellow-400/50 bg-gradient-to-br from-yellow-600/20 to-amber-600/20 shadow-2xl shadow-yellow-500/20' 
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          {plan.isPopular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-1 text-xs font-semibold">
                <Star className="w-3 h-3 mr-1" />
                MÁS POPULAR
              </Badge>
            </div>
          )}
          
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
              {plan.isPopular && <Crown className="w-5 h-5 text-yellow-400" />}
              {plan.name}
              {plan.isPopular && <Sparkles className="w-4 h-4 text-yellow-400" />}
            </CardTitle>
            
            <div className="flex items-baseline justify-center gap-1 mt-4">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-3xl font-bold text-white">
                {plan.price}
              </span>
              <span className="text-white/70 text-sm">
                {plan.currency}
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-white/60 text-sm mt-1">
              <Calendar className="w-4 h-4" />
              <span>{plan.duration} días</span>
            </div>
            
            <p className="text-white/80 text-sm mt-3">
              {plan.description}
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>
            
            <Link href="/login" className="w-full">
              <Button 
                className={`w-full ${
                  plan.isPopular 
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {plan.isPopular ? 'Comenzar Ahora' : 'Seleccionar Plan'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

MarketingPlansDisplay.displayName = 'MarketingPlansDisplay';

// Componente alternativo más simple para casos donde solo queremos mostrar un plan destacado
export const FeaturedPlanDisplay = memo(() => {
  const [featuredPlan, setFeaturedPlan] = useState<MarketingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const marketingService = MarketingService.getInstance();

  const loadFeaturedPlan = useCallback(async () => {
    try {
      setLoading(true);
      const popularPlan = await marketingService.getPopularPlan();
      if (popularPlan) {
        setFeaturedPlan(popularPlan);
      } else {
        // Si no hay plan popular, tomar el primero de los activos
        const allPlans = await marketingService.getActivePlans();
        if (allPlans.length > 0) {
          setFeaturedPlan(allPlans[0]);
        }
      }
    } catch (error) {
      console.error('Error cargando plan destacado:', error);
    } finally {
      setLoading(false);
    }
  }, [marketingService]);

  useEffect(() => {
    loadFeaturedPlan();
  }, [loadFeaturedPlan]);

  if (loading) {
    return (
      <div className="animate-pulse bg-white/5 rounded-lg p-6 max-w-md mx-auto">
        <div className="h-6 bg-white/10 rounded mb-4"></div>
        <div className="h-8 bg-white/10 rounded mb-2"></div>
        <div className="h-4 bg-white/10 rounded mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 bg-white/10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!featuredPlan) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 max-w-md mx-auto text-center">
        <Crown className="h-8 w-8 text-white/30 mx-auto mb-2" />
        <p className="text-white/70">
          Próximamente: Sistema de membresías
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-yellow-400/50 bg-gradient-to-br from-yellow-600/20 to-amber-600/20">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            {featuredPlan.name}
          </CardTitle>
          
          <div className="flex items-baseline justify-center gap-1 mt-4">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-3xl font-bold text-white">
              {featuredPlan.price}
            </span>
            <span className="text-white/70">
              {featuredPlan.currency}/mes
            </span>
          </div>
          
          <p className="text-white/80 text-sm mt-2">
            {featuredPlan.description}
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2 mb-6">
            {featuredPlan.features.slice(0, 4).map((feature, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-white/90">{feature}</span>
              </div>
            ))}
          </div>
          
          <Link href="/login" className="w-full">
            <Button className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold">
              Comenzar Ahora
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
});

FeaturedPlanDisplay.displayName = 'FeaturedPlanDisplay';