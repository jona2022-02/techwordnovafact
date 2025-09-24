// components/admin/UserManagementDebug.tsx
'use client';

import React from 'react';
import { useUsers } from '@/lib/hooks/useUsers';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UserManagementDebug() {
  const { users, loading, error } = useUsers();
  const { user, role, isAdmin } = useUserRole();

  console.log('🔧 UserManagementDebug: Estado completo:', {
    users: users.length,
    loading,
    error,
    currentUser: user?.email,
    role,
    isAdmin: isAdmin()
  });

  return (
    <Card className="p-6 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
      <CardHeader>
        <CardTitle className="text-yellow-800 dark:text-yellow-200">🔧 informacion del perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div><strong>Usuario actual:</strong> {user?.email || 'No autenticado'}</div>
          <div><strong>Rol:</strong> {role || 'Sin rol'}</div>
          <div><strong>Es admin:</strong> {isAdmin() ? 'Sí' : 'No'}</div>
        </div>
      </CardContent>
    </Card>
  );
}