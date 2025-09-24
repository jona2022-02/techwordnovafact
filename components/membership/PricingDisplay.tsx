// components/membership/PricingDisplay.tsx
"use client";

import { useMembershipSettings } from '@/lib/hooks/useMembership';
import { DollarSign, Crown } from 'lucide-react';

export function PricingDisplay() {
  const { settings, loading } = useMembershipSettings();

  if (loading) {
    return (
      <div className="animate-pulse bg-white/5 rounded-lg p-4">
        <div className="h-6 bg-white/10 rounded mb-2"></div>
        <div className="h-4 bg-white/10 rounded w-3/4"></div>
      </div>
    );
  }

  if (!settings || !settings.isActive) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 text-white/70">
          <Crown className="h-5 w-5" />
          <span className="text-sm">Próximamente: Sistema de membresías</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-400/30 bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-6">
      <div className="flex items-center gap-3 mb-3">
        <Crown className="h-6 w-6 text-yellow-400" />
        <h3 className="text-xl font-semibold text-white">Membresía Premium</h3>
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
        <DollarSign className="h-5 w-5 text-green-400" />
        <span className="text-2xl font-bold text-white">
          {settings.monthlyPrice}
        </span>
        <span className="text-white/70">
          {settings.currency}/mes
        </span>
      </div>
      
      <p className="text-sm text-white/80 mb-4">
        {settings.description}
      </p>

      {settings.features && settings.features.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">Incluye:</p>
          <ul className="text-sm text-white/80 space-y-1">
            {settings.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}