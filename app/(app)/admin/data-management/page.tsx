'use client';

import React, { useState, useEffect } from 'react';
import CreateUserForm from '@/components/admin/CreateUserForm';
import CreateMembershipForm from '@/components/admin/CreateMembershipForm';
import { UserProfile } from '@/types/auth';
import { UserMembership } from '@/types/membership';

export default function AdminDataManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'memberships'>('users');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/create-user');
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.users);
      } else {
        setMessage(`Error al cargar usuarios: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error de conexión: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserMembership = async (userId: string) => {
    try {
      const response = await fetch(`/api/create-membership?userId=${userId}`);
      const result = await response.json();
      return result.membership;
    } catch (error) {
      console.error('Error getting membership:', error);
      return null;
    }
  };

  const testDatabaseOperations = async () => {
    try {
      setMessage('🔄 Probando operaciones de base de datos...');
      
      const response = await fetch('/api/test-operations');
      const result = await response.json();
      
      if (result.success) {
        setMessage('✅ Operaciones de base de datos funcionando correctamente');
      } else {
        setMessage(`❌ Error en operaciones: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error de conexión: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Datos - Usuarios y Membresías
          </h1>
          <p className="text-gray-600">
            Crear y administrar usuarios y membresías en el sistema
          </p>
        </div>

        {/* Test Operations */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Pruebas del Sistema</h2>
          <button
            onClick={testDatabaseOperations}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            🧪 Probar Operaciones de Base de Datos
          </button>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : message.includes('🔄')
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 Usuarios ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('memberships')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'memberships'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💎 Membresías
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Formulario de crear usuario */}
                <CreateUserForm onUserCreated={loadUsers} />

                {/* Lista de usuarios existentes */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Usuarios Existentes ({users.length})
                  </h3>
                  
                  {isLoading ? (
                    <div className="text-gray-500">Cargando usuarios...</div>
                  ) : users.length === 0 ? (
                    <div className="text-gray-500">No hay usuarios registrados</div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {users.map((user) => (
                        <div
                          key={user.uid}
                          className="bg-white p-4 rounded-md border border-gray-200"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.displayName || 'Sin nombre'}
                              </p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <p className="text-xs text-gray-500">
                                {user.role === 'admin' ? '👑 Admin' : '👤 Cliente'}
                                {user.isActive ? ' • ✅ Activo' : ' • ❌ Inactivo'}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {user.uid.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={loadUsers}
                    disabled={isLoading}
                    className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md text-sm disabled:opacity-50"
                  >
                    🔄 Actualizar Lista
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'memberships' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Formulario de crear membresía */}
                <CreateMembershipForm onMembershipCreated={() => {}} />

                {/* Información de membresías */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Información de Membresías
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-md border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2">Planes Disponibles:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>basic</strong> - Plan Básico</li>
                        <li>• <strong>premium</strong> - Plan Premium</li>
                        <li>• <strong>enterprise</strong> - Plan Empresarial</li>
                      </ul>
                    </div>

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2">Estados de Membresía:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <span className="text-green-600">active</span> - Activa</li>
                        <li>• <span className="text-red-600">expired</span> - Expirada</li>
                        <li>• <span className="text-yellow-600">suspended</span> - Suspendida</li>
                        <li>• <span className="text-gray-600">cancelled</span> - Cancelada</li>
                        <li>• <span className="text-blue-600">pending</span> - Pendiente</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">💡 Tip:</h4>
                      <p className="text-sm text-blue-800">
                        Las membresías se pueden crear con duración específica (1, 3, 6, 12 meses) 
                        o con fechas personalizadas de inicio y fin.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}