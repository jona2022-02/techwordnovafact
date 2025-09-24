'use client';

import React from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { UserManagement } from '@/components/admin/UserManagement';
import { UserManagementDebug } from '@/components/admin/UserManagementDebug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Database } from 'lucide-react';

export default function UsersPage() {
  const { loading: authLoading, isAdmin } = useUserRole();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-foreground">Cargando...</span>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="max-w-md mx-auto mt-4 sm:mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-base sm:text-lg">
              <Shield className="h-5 w-5" />
              Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm sm:text-base">No tienes permisos para acceder a esta página. Solo los administradores pueden gestionar usuarios.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl">
      
      <UserManagementDebug />
      <UserManagement className="space-y-4 md:space-y-6" />
      
      <Card className="mt-4 md:mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Database className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <strong>Colección de Firestore:</strong> <code className="bg-muted px-2 py-1 rounded font-mono text-xs sm:text-sm">users</code>
          </div>
          <div className="text-sm">
            <strong>Funcionalidades:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground text-xs sm:text-sm">
              <li>Gestión completa de usuarios (CRUD)</li>
              <li>Asignación de roles (Admin/Cliente)</li>
              <li>Control granular de permisos</li>
              <li>Activación/desactivación de usuarios</li>
              <li>Sincronización con Firebase Authentication</li>
            </ul>
          </div>
          <div className="text-sm">
            <strong>Roles disponibles:</strong>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <span className="bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2 py-1 rounded-full text-xs font-semibold dark:bg-purple-500/20 dark:text-purple-400 text-center sm:text-left">
                Administrador
              </span>
              <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-1 rounded-full text-xs font-semibold dark:bg-blue-500/20 dark:text-blue-400 text-center sm:text-left">
                Cliente
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}