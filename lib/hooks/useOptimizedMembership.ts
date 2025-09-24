// lib/hooks/useOptimizedMembership.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { optimizedMembershipService } from '@/lib/optimizedMembershipService';
import { logger } from '@/lib/logger';
import { 
  UserMembershipDetailed, 
  MembershipSettings, 
  MembershipStatusExtended,
  MembershipStatus,
  UserMembership
} from '@/types/membership';

interface OptimizedMembershipState {
  membership: UserMembershipDetailed | null;
  membershipSettings: MembershipSettings | null;
  status: MembershipStatusExtended | null;
  isLoading: boolean;
  error: string | null;
}

export function useOptimizedMembership() {
  const [user, setUser] = useState<User | null>(null);
  
  const [state, setState] = useState<OptimizedMembershipState>({
    membership: null,
    membershipSettings: null,
    status: null,
    isLoading: true,
    error: null
  });

  // Listen to auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  // Memoized service instance
  const service = useMemo(() => optimizedMembershipService, []);

  // Load membership data with batch optimization
  const loadMembershipData = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Batch fetch membership data and settings
      const [membershipWithSettings, status] = await Promise.all([
        service.getUserMembershipWithSettings(user.uid),
        service.checkMembershipStatus(user.uid)
      ]);

      setState({
        membership: membershipWithSettings.membership,
        membershipSettings: membershipWithSettings.settings,
        status,
        isLoading: false,
        error: null
      });

      logger.debug('Optimized membership data loaded', {
        userId: user.uid,
        hasMembership: !!membershipWithSettings.membership,
        hasSettings: !!membershipWithSettings.settings
      });

    } catch (error) {
      logger.error('Failed to load optimized membership data', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error loading membership data'
      }));
    }
  }, [user, service]);

  // Load data on mount and user change
  useEffect(() => {
    loadMembershipData();
  }, [loadMembershipData]);

  // Optimized mutation functions that don't trigger full reloads
  const createMembership = useCallback(async (startDate: Date, endDate: Date, planId = 'basic') => {
    if (!user) throw new Error('Usuario no autenticado');
    
    try {
      const newMembership = await service.createUserMembership(user.uid, startDate, endDate, planId);
      
      // Update state optimistically
      setState(prev => ({
        ...prev,
        membership: {
          ...newMembership,
          startDate,
          endDate,
          createdAt: new Date(),
          updatedAt: new Date()
        } as UserMembershipDetailed
      }));

      // Update status
      const newStatus = await service.checkMembershipStatus(user.uid);
      setState(prev => ({ ...prev, status: newStatus }));

      logger.info('Membership created optimistically', { userId: user.uid });
    } catch (error) {
      logger.error('Error creating membership', error);
      throw error;
    }
  }, [user, service]);

  const updateMembership = useCallback(async (updates: Partial<UserMembership>) => {
    if (!state.membership) throw new Error('No hay membresía para actualizar');
    
    try {
      await service.updateUserMembership(state.membership.id, updates);
      
      // Update state optimistically
      setState(prev => ({
        ...prev,
        membership: prev.membership ? { ...prev.membership, ...updates } : null
      }));

      // Refresh status if status-affecting fields were updated
      if (updates.isActive !== undefined || updates.endDate !== undefined) {
        const newStatus = await service.checkMembershipStatus(user!.uid);
        setState(prev => ({ ...prev, status: newStatus }));
      }

      logger.info('Membership updated optimistically', { membershipId: state.membership.id });
    } catch (error) {
      logger.error('Error updating membership', error);
      // Revert optimistic update by reloading data
      await loadMembershipData();
      throw error;
    }
  }, [state.membership, service, user, loadMembershipData]);

  const suspendMembership = useCallback(async (reason: string) => {
    if (!state.membership) throw new Error('No hay membresía para suspender');
    
    try {
      await service.updateUserMembership(state.membership.id, {
        isActive: false,
        suspensionReason: reason,
        suspendedAt: new Date() as any // Will be converted to Timestamp in service
      });

      // Update state optimistically
      setState(prev => ({
        ...prev,
        membership: prev.membership ? {
          ...prev.membership,
          isActive: false,
          suspensionReason: reason,
          suspendedAt: new Date()
        } : null
      }));

      // Update status
      const newStatus = await service.checkMembershipStatus(user!.uid);
      setState(prev => ({ ...prev, status: newStatus }));

      logger.info('Membership suspended optimistically', { membershipId: state.membership.id });
    } catch (error) {
      logger.error('Error suspending membership', error);
      await loadMembershipData();
      throw error;
    }
  }, [state.membership, service, user, loadMembershipData]);

  const reactivateMembership = useCallback(async () => {
    if (!state.membership) throw new Error('No hay membresía para reactivar');
    
    try {
      await service.updateUserMembership(state.membership.id, {
        isActive: true,
        suspensionReason: undefined,
        suspendedAt: undefined
      });

      // Update state optimistically
      setState(prev => ({
        ...prev,
        membership: prev.membership ? {
          ...prev.membership,
          isActive: true,
          suspensionReason: undefined,
          suspendedAt: undefined
        } : null
      }));

      // Update status
      const newStatus = await service.checkMembershipStatus(user!.uid);
      setState(prev => ({ ...prev, status: newStatus }));

      logger.info('Membership reactivated optimistically', { membershipId: state.membership.id });
    } catch (error) {
      logger.error('Error reactivating membership', error);
      await loadMembershipData();
      throw error;
    }
  }, [state.membership, service, user, loadMembershipData]);

  // Settings management
  const updateMembershipSettings = useCallback(async (updates: Partial<MembershipSettings>) => {
    try {
      await service.updateMembershipSettings(updates);
      
      // Update settings optimistically
      setState(prev => ({
        ...prev,
        membershipSettings: prev.membershipSettings ? 
          { ...prev.membershipSettings, ...updates } : null
      }));

      logger.info('Membership settings updated optimistically');
    } catch (error) {
      logger.error('Error updating membership settings', error);
      await loadMembershipData();
      throw error;
    }
  }, [service, loadMembershipData]);

  // Cache management
  const clearCache = useCallback(() => {
    if (user) {
      service.clearMembershipCache(user.uid);
      logger.info('Membership cache cleared', { userId: user.uid });
    }
  }, [user, service]);

  const refreshData = useCallback(async () => {
    clearCache();
    await loadMembershipData();
  }, [clearCache, loadMembershipData]);

  // Computed values
  const hasActiveMembership = useMemo(() => 
    state.status?.hasActiveMembership || false, [state.status]);

  const canAccessFeatures = useMemo(() => 
    state.status?.canAccessFeatures || false, [state.status]);

  const isExpired = useMemo(() => 
    state.status?.isExpired || false, [state.status]);

  const daysUntilExpiration = useMemo(() => 
    state.status?.daysUntilExpiration, [state.status]);

  return {
    // State
    membership: state.membership,
    membershipSettings: state.membershipSettings,
    status: state.status,
    isLoading: state.isLoading,
    error: state.error,

    // Computed values
    hasActiveMembership,
    canAccessFeatures,
    isExpired,
    daysUntilExpiration,

    // Actions
    createMembership,
    updateMembership,
    suspendMembership,
    reactivateMembership,
    updateMembershipSettings,
    refreshData,
    clearCache,

    // Cache stats for debugging
    getCacheStats: service.getCacheStats.bind(service)
  };
}