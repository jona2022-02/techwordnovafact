// lib/hooks/useMembership.ts
import { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { membershipService } from '@/lib/membershipService';
import { UserMembership, MembershipSettings } from '@/types/membership';
import { hookLogger } from '@/lib/logger';

const log = hookLogger('useMembership');

export function useMembership() {
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [membershipSettings, setMembershipSettings] = useState<MembershipSettings | null>(null);
  const [hasValidMembership, setHasValidMembership] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadMembershipData = useCallback(async (currentUser?: User) => {
    const userToCheck = currentUser || user;
    if (!userToCheck) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Cargar configuración de membresías
      const settings = await membershipService.getMembershipSettings();
      setMembershipSettings(settings);

      // Verificar estado de membresía del usuario
      console.log(`[useMembership] Checking membership for user: ${userToCheck.uid}`);
      const status = await membershipService.checkMembershipStatus(userToCheck.uid);
      
      console.log(`[useMembership] Membership status result:`, {
        hasValidMembership: status.hasValidMembership,
        membership: status.membership,
        daysRemaining: status.daysRemaining
      });
      
      setMembership(status.membership);
      setHasValidMembership(status.hasValidMembership);
      setDaysRemaining(status.daysRemaining || 0);
    } catch (error) {
      log.error('Error loading membership data', error);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Removed circular dependency

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadMembershipData(currentUser);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); // ✅ Removed dependency on loadMembershipData

  const createMembership = async (startDate: Date, endDate: Date) => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      await membershipService.createUserMembership(user.uid, startDate, endDate);
      await loadMembershipData(); // Recargar datos
    } catch (error) {
      console.error('Error creating membership:', error);
      throw error;
    }
  };

  const updateMembership = async (updates: Partial<UserMembership>) => {
    if (!membership) throw new Error('No hay membresía para actualizar');
    
    try {
      await membershipService.updateUserMembership(membership.id, updates);
      await loadMembershipData(); // Recargar datos
    } catch (error) {
      console.error('Error updating membership:', error);
      throw error;
    }
  };

  const suspendMembership = async (reason: string) => {
    if (!membership) throw new Error('No hay membresía para suspender');
    
    try {
      await membershipService.suspendUserMembership(membership.id, reason);
      await loadMembershipData(); // Recargar datos
    } catch (error) {
      console.error('Error suspending membership:', error);
      throw error;
    }
  };

  const reactivateMembership = async () => {
    if (!membership) throw new Error('No hay membresía para reactivar');
    
    try {
      await membershipService.reactivateUserMembership(membership.id);
      await loadMembershipData(); // Recargar datos
    } catch (error) {
      console.error('Error reactivating membership:', error);
      throw error;
    }
  };

  const activateMembership = async (startDate: Date, endDate: Date) => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      await membershipService.createUserMembership(user.uid, startDate, endDate);
      await loadMembershipData(); // Recargar datos
    } catch (error) {
      console.error('Error activating membership:', error);
      throw error;
    }
  };

  return {
    membership,
    membershipSettings,
    hasValidMembership,
    daysRemaining,
    loading,
    createMembership,
    updateMembership,
    suspendMembership,
    reactivateMembership,
    activateMembership,
    refreshMembership: loadMembershipData
  };
}

export function useMembershipSettings() {
  const [settings, setSettings] = useState<MembershipSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const membershipSettings = await membershipService.getMembershipSettings();
      setSettings(membershipSettings);
    } catch (error) {
      console.error('Error loading membership settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<MembershipSettings>) => {
    try {
      await membershipService.updateMembershipSettings(updates);
      await loadSettings(); // Recargar
    } catch (error) {
      console.error('Error updating membership settings:', error);
      throw error;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: loadSettings
  };
}