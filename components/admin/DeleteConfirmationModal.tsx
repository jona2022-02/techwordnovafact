"use client";

import { MarketingPlan } from '@/types/membership';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  plan: MarketingPlan | null;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  plan,
  isLoading = false
}: DeleteConfirmationModalProps) {
  if (!isOpen || !plan) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Confirmar Eliminación
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-700 mb-2">
              ¿Estás seguro que deseas eliminar el plan:
            </p>
            <p className="font-bold text-lg">"{plan.name}"</p>
            <p className="text-sm text-gray-500 mt-2">
              ${plan.price} {plan.currency} - {plan.duration} días
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">
              ⚠️ Esta acción no se puede deshacer. El plan se eliminará permanentemente 
              y no estará disponible para nuevos usuarios.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Eliminando...' : 'Eliminar Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}