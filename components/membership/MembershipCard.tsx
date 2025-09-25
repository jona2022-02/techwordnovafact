'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { MembershipService } from '@/lib/membershipService';
import { UserMembershipDetailed } from '@/types/membership';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MembershipCardProps {
  className?: string;
}

export default function MembershipCard({ className = '' }: MembershipCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<UserMembershipDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    loadMembershipInfo();
  }, [user]);

  const loadMembershipInfo = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const membershipService = MembershipService.getInstance();
      
      // Obtener membresía detallada
      const membershipDetailed = await membershipService.getUserMembershipDetailed(user.uid);
      setMembership(membershipDetailed);

      // Calcular días restantes si hay membresía activa
      if (membershipDetailed && membershipDetailed.status === 'active' && membershipDetailed.endDate) {
        const now = new Date();
        const endDate = new Date(membershipDetailed.endDate);
        const timeDiff = endDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        setDaysRemaining(daysDiff > 0 ? daysDiff : 0);
      } else {
        setDaysRemaining(null);
      }
      
    } catch (err) {
      console.error('Error loading membership info:', err);
      setError('Error al cargar información de membresía');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'expired': return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'suspended': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'cancelled': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default: return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4" />;
      case 'expired': 
      case 'suspended': 
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Crown className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'expired': return 'Expirada';
      case 'suspended': return 'Suspendida';
      case 'cancelled': return 'Cancelada';
      case 'pending': return 'Pendiente';
      default: return 'Desconocida';
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'No definida';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className={`border ${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border border-red-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!membership) {
    return (
      <Card className={`border border-dashed ${className}`}>
        <CardContent className="p-4 text-center">
          <Crown className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">Sin membresía activa</p>
          <p className="text-xs text-gray-400 mt-1">
            Contacta al administrador para obtener acceso
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="border transition-colors hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Mi Membresía</h3>
            </div>
            <Badge 
              variant="outline" 
              className={`${getStatusColor(membership.status)} font-medium`}
            >
              <span className="flex items-center gap-1">
                {getStatusIcon(membership.status)}
                {getStatusText(membership.status)}
              </span>
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Plan Details */}
          {membership.planDetails && (
            <div>
              <p className="text-sm font-medium text-foreground">
                {membership.planDetails.name}
              </p>
              {membership.planDetails.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {membership.planDetails.description}
                </p>
              )}
            </div>
          )}

          {/* Fecha y tiempo restante */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Válida hasta:</span>
              <span className="font-medium">{formatDate(membership.endDate)}</span>
            </div>

            {membership.status === 'active' && daysRemaining !== null && (
              <div className="text-sm">
                {daysRemaining > 0 ? (
                  <span className="text-green-600 font-medium">
                    {daysRemaining} día{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    Membresía expirada
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Características del plan */}
          {membership.planDetails?.features && membership.planDetails.features.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-muted-foreground mb-2">Incluye:</p>
              <div className="flex flex-wrap gap-1">
                {membership.planDetails.features.slice(0, 3).map((feature, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs px-2 py-0.5"
                  >
                    {feature}
                  </Badge>
                ))}
                {membership.planDetails.features.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    +{membership.planDetails.features.length - 3} más
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}