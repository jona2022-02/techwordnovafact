// components/MembershipGuard.tsx
"use client";
import { ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { useMembership } from "@/lib/hooks/useMembership";
import { useUserRole } from "@/lib/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown, Loader2 } from "lucide-react";

interface MembershipGuardProps {
  children: ReactNode;
  requireMembership?: boolean;
}

export default function MembershipGuard({ 
  children, 
  requireMembership = true 
}: MembershipGuardProps) {
  const router = useRouter();
  const { hasValidMembership, membership, loading: membershipLoading } = useMembership();
  const { role, loading: roleLoading } = useUserRole();

  // Mostrar loader mientras se cargan los datos
  if (membershipLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Los administradores siempre tienen acceso
  if (role === 'admin') {
    return <>{children}</>;
  }

  // Si no requiere membresía, permitir acceso
  if (!requireMembership) {
    return <>{children}</>;
  }

  // Si no hay membresía válida, mostrar interfaz de redirección
  if (!hasValidMembership) {
    const handleActivateMembership = () => {
      router.push('/activate-membership');
    };

    const handleGoHome = () => {
      router.push('/');
    };

    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="mt-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Crown className="h-12 w-12 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl text-yellow-700 dark:text-yellow-400">
              Membresía Requerida
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Acceso Restringido</span>
              </div>
              <p className="text-muted-foreground">
                Para acceder a esta funcionalidad necesitas tener una membresía premium activa.
                Nuestro sistema de membresías te permite acceder a todas las herramientas de verificación,
                reportes ilimitados y soporte prioritario.
              </p>
            </div>

            {membership && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">
                  <strong>Estado actual:</strong> {membership.status === 'expired' ? 'Expirada' : 'Inactiva'}
                  {membership.endDate && (
                    <>
                      <br />
                      <strong>Última fecha de vencimiento:</strong> {
                        new Date(membership.endDate).toLocaleDateString('es-ES')
                      }
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleActivateMembership}
                className="flex items-center gap-2"
              >
                <Crown className="h-4 w-4" />
                Activar Membresía
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGoHome}
              >
                Volver al Inicio
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Los administradores tienen acceso completo sin necesidad de membresía
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si hay membresía válida, mostrar el contenido
  return <>{children}</>;
}