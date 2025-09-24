'use client';

import { useState } from 'react';
import { useMembership } from '@/lib/hooks/useMembership';
import { MembershipModal } from '@/components/membership/MembershipModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Calendar, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MiMembresiaPage() {
  const { membership, membershipSettings, loading, refreshMembership } = useMembership();
  const [showActivationModal, setShowActivationModal] = useState(false);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const getStatusInfo = () => {
    if (!membership) {
      return {
        status: 'inactive',
        icon: <AlertCircle className="h-5 w-5" />,
        title: 'Sin Membresía Activa',
        description: 'No tienes una membresía activa. Activa tu membresía para acceder a todas las funcionalidades.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    const now = new Date();
    const endDate = membership.endDate instanceof Date 
      ? membership.endDate 
      : new Date(membership.endDate);

    if (membership.status === 'active' && endDate > now) {
      return {
        status: 'active',
        icon: <CheckCircle2 className="h-5 w-5" />,
        title: 'Membresía Activa',
        description: `Tu membresía está activa hasta el ${endDate.toLocaleDateString('es-ES')}`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    return {
      status: 'expired',
      icon: <AlertCircle className="h-5 w-5" />,
      title: 'Membresía Expirada',
      description: `Tu membresía expiró el ${endDate.toLocaleDateString('es-ES')}. Renueva tu membresía para continuar accediendo.`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    };
  };

  const statusInfo = getStatusInfo();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getDaysRemaining = () => {
    if (!membership || membership.status !== 'active') return null;
    
    const now = new Date();
    const endDate = membership.endDate instanceof Date 
      ? membership.endDate 
      : new Date(membership.endDate);
    
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Crown className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Membresía</h1>
            <p className="text-gray-600">Gestiona tu membresía y acceso a la plataforma</p>
          </div>
        </div>
      </div>

      {/* Estado de la Membresía */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <Card className={`p-6 ${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg bg-white shadow-sm ${statusInfo.color}`}>
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${statusInfo.color} mb-2`}>
                {statusInfo.title}
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                {statusInfo.description}
              </p>
              
              {statusInfo.status === 'inactive' && (
                <Button 
                  onClick={() => setShowActivationModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Activar Membresía
                </Button>
              )}
              
              {statusInfo.status === 'expired' && (
                <Button 
                  onClick={() => setShowActivationModal(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Renovar Membresía
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Details Card */}
        {membership && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              Detalles de Membresía
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Estado:</span>
                <Badge 
                  variant={membership.status === 'active' ? 'default' : 'destructive'}
                >
                  {membership.status === 'active' ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Precio mensual:</span>
                <span className="font-medium">
                  {membershipSettings ? formatCurrency(membershipSettings.monthlyPrice) : 'Cargando...'}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Fecha de inicio:</span>
                <span className="text-sm">
                  {new Date(membership.startDate).toLocaleDateString('es-ES')}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Fecha de vencimiento:</span>
                <span className="text-sm">
                  {(membership.endDate instanceof Date 
                    ? membership.endDate 
                    : new Date(membership.endDate)
                  ).toLocaleDateString('es-ES')}
                </span>
              </div>
              
              {daysRemaining !== null && daysRemaining > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Días restantes:</span>
                  <span className={`text-sm font-medium ${
                    daysRemaining <= 7 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {daysRemaining} días
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Información adicional */}
      <Card className="mt-6 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-gray-600" />
          Información sobre Membresías
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">¿Qué incluye?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Acceso completo a verificadores de DTEs</li>
              <li>• Procesamiento ilimitado de documentos</li>
              <li>• Reportes y exportaciones</li>
              <li>• Soporte técnico prioritario</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">¿Cómo funciona?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Membresía mensual renovable</li>
              <li>• Activación inmediata</li>
              <li>• Precio fijo sin sorpresas</li>
              <li>• Cancela cuando quieras</li>
            </ul>
          </div>
        </div>
        
        {(!membership || membership.status !== 'active') && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button 
              onClick={() => setShowActivationModal(true)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Crown className="h-4 w-4 mr-2" />
              Activar Membresía Ahora
            </Button>
          </div>
        )}
      </Card>

      {/* Modal de Activación */}
      {showActivationModal && (
        <MembershipModal
          open={showActivationModal}
          onClose={() => {
            setShowActivationModal(false);
            refreshMembership();
          }}
          membershipSettings={membershipSettings}
        />
      )}
    </div>
  );
}