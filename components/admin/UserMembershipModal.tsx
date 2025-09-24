'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/types/auth';
import { membershipService } from '@/lib/membershipService';
import { UserMembership, MembershipStatus } from '@/types/membership';
import { 
  Crown, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Clock,
  DollarSign,
  User,
  Pause,
  Play
} from 'lucide-react';

interface UserMembershipModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onMembershipUpdate?: () => void;
}

export function UserMembershipModal({ user, isOpen, onClose, onMembershipUpdate }: UserMembershipModalProps) {
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para activar nueva membresía
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showActivateForm, setShowActivateForm] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadUserMembership();
      // Configurar fechas por defecto
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(nextMonth.toISOString().split('T')[0]);
    }
  }, [isOpen, user]);

  const loadUserMembership = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    try {
      const membershipStatus = await membershipService.checkMembershipStatus(user.uid);
      setMembership(membershipStatus.membership);
    } catch (err: any) {
      setError(err.message || 'Error cargando membresía');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateMembership = async () => {
    if (!user || !startDate || !endDate) return;

    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }

      await membershipService.createUserMembership(user.uid, start, end);
      setSuccess('Membresía activada exitosamente');
      setShowActivateForm(false);
      await loadUserMembership();
      onMembershipUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Error activando membresía');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendMembership = async () => {
    if (!membership) return;

    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await membershipService.suspendUserMembership(membership.id, 'Suspendida por administrador');
      setSuccess('Membresía suspendida exitosamente');
      await loadUserMembership();
      onMembershipUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Error suspendiendo membresía');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateMembership = async () => {
    if (!membership) return;

    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await membershipService.reactivateUserMembership(membership.id);
      setSuccess('Membresía reactivada exitosamente');
      await loadUserMembership();
      onMembershipUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Error reactivando membresía');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: MembershipStatus) => {
    const statusConfig = {
      active: { label: 'Activa', variant: 'default' as const, icon: CheckCircle },
      expired: { label: 'Expirada', variant: 'destructive' as const, icon: AlertCircle },
      suspended: { label: 'Suspendida', variant: 'secondary' as const, icon: Pause },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, icon: X },
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isExpired = (endDate: Date) => {
    return new Date() > endDate;
  };

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Gestionar Membresía
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Información del usuario */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium">{user.displayName || 'Sin nombre'}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-green-700 dark:text-green-300 text-sm">{success}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Cargando información de membresía...</span>
            </div>
          ) : (
            <>
              {membership ? (
                <div className="space-y-4">
                  {/* Estado actual de la membresía */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Estado Actual de la Membresía
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Estado:</label>
                        <div className="mt-1">
                          {getStatusBadge(membership.status)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Días restantes:</label>
                        <div className="mt-1">
                          {membership.status === 'active' && !isExpired(new Date(membership.endDate)) ? (
                            <span className="text-sm font-medium text-green-600">
                              {getDaysRemaining(new Date(membership.endDate))} días
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Fecha de inicio:</label>
                        <div className="mt-1 text-sm">
                          {new Date(membership.startDate).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400">Fecha de vencimiento:</label>
                        <div className="mt-1 text-sm">
                          {new Date(membership.endDate).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones disponibles */}
                  <div className="flex flex-wrap gap-2">
                    {membership.status === 'active' && (
                      <Button
                        onClick={handleSuspendMembership}
                        disabled={actionLoading}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Pause className="h-4 w-4" />
                        Suspender
                      </Button>
                    )}
                    
                    {membership.status === 'suspended' && (
                      <Button
                        onClick={handleReactivateMembership}
                        disabled={actionLoading}
                        className="flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Reactivar
                      </Button>
                    )}

                    <Button
                      onClick={() => setShowActivateForm(true)}
                      disabled={actionLoading}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Nueva Membresía
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Sin Membresía Activa
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Este usuario no tiene una membresía activa. Puedes activar una nueva membresía.
                  </p>
                  <Button
                    onClick={() => setShowActivateForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    Activar Membresía
                  </Button>
                </div>
              )}

              {/* Formulario para activar nueva membresía */}
              {showActivateForm && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Activar Nueva Membresía
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="startDate">Fecha de Inicio</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Fecha de Finalización</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleActivateMembership}
                      disabled={actionLoading || !startDate || !endDate}
                      className="flex-1"
                    >
                      {actionLoading ? 'Activando...' : 'Confirmar Activación'}
                    </Button>
                    <Button
                      onClick={() => setShowActivateForm(false)}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}