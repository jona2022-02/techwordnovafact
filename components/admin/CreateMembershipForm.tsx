import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types/auth';

interface CreateMembershipFormProps {
  onMembershipCreated: () => void;
}

export default function CreateMembershipForm({ onMembershipCreated }: CreateMembershipFormProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState({
    userId: '',
    planId: 'basic',
    durationMonths: 1,
    startDate: new Date().toISOString().split('T')[0], // Fecha actual
    useCustomEndDate: false,
    customEndDate: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/create-user');
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const payload = {
        userId: formData.userId,
        planId: formData.planId,
        startDate: formData.startDate,
        ...(formData.useCustomEndDate 
          ? { customEndDate: formData.customEndDate }
          : { durationMonths: formData.durationMonths }
        )
      };

      const response = await fetch('/api/create-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Membresía creada para: ${result.user.displayName || result.user.email}`);
        setFormData({
          userId: '',
          planId: 'basic',
          durationMonths: 1,
          startDate: new Date().toISOString().split('T')[0],
          useCustomEndDate: false,
          customEndDate: ''
        });
        onMembershipCreated();
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error de conexión: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEndDate = () => {
    if (!formData.startDate || formData.useCustomEndDate) return '';
    
    const start = new Date(formData.startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + formData.durationMonths);
    
    return end.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
      <h3 className="text-lg font-semibold mb-4">Crear Membresía</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
            Usuario *
          </label>
          <select
            id="userId"
            required
            value={formData.userId}
            onChange={(e) => setFormData({...formData, userId: e.target.value})}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar usuario</option>
            {users.map((user) => (
              <option key={user.uid} value={user.uid}>
                {user.displayName || user.email} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="planId" className="block text-sm font-medium text-gray-700">
            Plan
          </label>
          <select
            id="planId"
            value={formData.planId}
            onChange={(e) => setFormData({...formData, planId: e.target.value})}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="basic">Básico</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Empresarial</option>
          </select>
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Fecha de Inicio
          </label>
          <input
            type="date"
            id="startDate"
            value={formData.startDate}
            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="useCustomEndDate"
              checked={formData.useCustomEndDate}
              onChange={(e) => setFormData({...formData, useCustomEndDate: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="useCustomEndDate" className="ml-2 block text-sm text-gray-700">
              Usar fecha de fin personalizada
            </label>
          </div>

          {formData.useCustomEndDate ? (
            <input
              type="date"
              value={formData.customEndDate}
              onChange={(e) => setFormData({...formData, customEndDate: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Fecha de fin"
            />
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Duración (meses)
              </label>
              <select
                value={formData.durationMonths}
                onChange={(e) => setFormData({...formData, durationMonths: parseInt(e.target.value)})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>1 mes</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
              </select>
              {calculateEndDate() && (
                <p className="text-sm text-gray-600">
                  Fecha de fin: {calculateEndDate()}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creando...' : 'Crear Membresía'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}