// components/membership/MembershipStatus.tsx
"use client";

import { useState } from 'react';
import { useMembership } from '@/lib/hooks/useMembership';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Crown, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign
} from 'lucide-react';
import { MembershipModal } from './MembershipModal';

export function MembershipStatus() {
  const { 
    membership, 
    membershipSettings, 
    hasValidMembership, 
    daysRemaining, 
    loading 
  } = useMembership();
  
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-6">
          <div className="animate-pulse text-muted-foreground">
            Cargando estado de membresía...
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (!membership) return <Crown className="h-5 w-5 text-gray-400" />;
    
    switch (membership.status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <Clock className="h-5 w-5 text-red-500" />;
      case 'suspended':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Crown className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!membership) return 'secondary';
    
    switch (membership.status) {
      case 'active':
        return daysRemaining <= 7 ? 'destructive' : 'default';
      case 'expired':
        return 'destructive';
      case 'suspended':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (!membership) return 'Sin membresía activa';
    
    switch (membership.status) {
      case 'active':
        return hasValidMembership 
          ? `Activa (${daysRemaining} días restantes)`
          : 'Vencida';
      case 'expired':
        return 'Vencida';
      case 'suspended':
        return 'Suspendida';
      default:
        return 'Estado desconocido';
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getStatusIcon()}
            Estado de Membresía
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor() as any}>
                  {getStatusText()}
                </Badge>
              </div>
              
              {membershipSettings && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  ${membershipSettings.monthlyPrice}/{membershipSettings.currency} mensual
                </p>
              )}
            </div>

            {!hasValidMembership && (
              <Button 
                onClick={() => setShowModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Crown className="h-4 w-4 mr-2" />
                Activar Membresía
              </Button>
            )}
          </div>

          {membership && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
              <div>
                <p className="text-muted-foreground">Inicio:</p>
                <p className="font-medium">
                  {membership.startDate?.toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Vencimiento:</p>
                <p className="font-medium">
                  {membership.endDate?.toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          )}

          {!hasValidMembership && membership?.status === 'expired' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Tu membresía ha vencido. Renueva para continuar usando todas las funciones.
                </p>
              </div>
            </div>
          )}

          {membership?.status === 'suspended' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm text-red-800 font-medium">
                    Membresía suspendida
                  </p>
                  {membership.suspensionReason && (
                    <p className="text-sm text-red-700 mt-1">
                      Motivo: {membership.suspensionReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MembershipModal 
        open={showModal} 
        onClose={() => setShowModal(false)}
        membershipSettings={membershipSettings}
      />
    </>
  );
}