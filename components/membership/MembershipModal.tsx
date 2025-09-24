// components/membership/MembershipModal.tsx
"use client";

import { useState } from 'react';
import { useMembership } from '@/lib/hooks/useMembership';
import { MembershipSettings } from '@/types/membership';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Crown, DollarSign, X } from 'lucide-react';

interface MembershipModalProps {
  open: boolean;
  onClose: () => void;
  membershipSettings: MembershipSettings | null;
}

export function MembershipModal({ open, onClose, membershipSettings }: MembershipModalProps) {
  const { activateMembership } = useMembership();
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end <= start) {
        alert('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }

      await activateMembership(start, end);
      onClose();
    } catch (error) {
      console.error('Error activating membership:', error);
      alert('Error al activar la membresía. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateCost = () => {
    if (!membershipSettings) return 0;
    const days = calculateDays();
    const monthlyPrice = membershipSettings.monthlyPrice;
    return ((days / 30) * monthlyPrice).toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Activar Membresía</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="p-1 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {membershipSettings && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">
                  ${membershipSettings.monthlyPrice} {membershipSettings.currency}/mes
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {membershipSettings.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de inicio
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de fin
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Resumen */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-2">Resumen</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Duración:</span>
                <span className="font-medium">{calculateDays()} días</span>
              </div>
              {membershipSettings && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo total:</span>
                  <span className="font-medium">
                    ${calculateCost()} {membershipSettings.currency}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? 'Activando...' : 'Activar Membresía'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}