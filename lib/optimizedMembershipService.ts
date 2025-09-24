// lib/optimizedMembershipService.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from './firebase';
import { queryOptimizer } from './queryOptimizer';
import { logger } from './logger';
import { 
  MembershipSettings, 
  UserMembership, 
  PaymentRecord, 
  MembershipStatus,
  MembershipPlan,
  MarketingPlan,
  MembershipStatusExtended,
  UserMembershipDetailed 
} from '@/types/membership';
import { UserProfile } from '@/types/auth';

export class OptimizedMembershipService {
  private static instance: OptimizedMembershipService;
  
  public static getInstance(): OptimizedMembershipService {
    if (!OptimizedMembershipService.instance) {
      OptimizedMembershipService.instance = new OptimizedMembershipService();
    }
    return OptimizedMembershipService.instance;
  }

  // OPTIMIZED CONFIGURATION FETCHING
  async getMembershipSettings(): Promise<MembershipSettings | null> {
    return queryOptimizer.getDocument<MembershipSettings>(
      doc(db, 'membershipSettings', 'default'),
      'membership_settings',
      10 * 60 * 1000 // Cache for 10 minutes
    );
  }

  async updateMembershipSettings(updates: Partial<MembershipSettings>): Promise<void> {
    try {
      const docRef = doc(db, 'membershipSettings', 'default');
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });

      // Invalidate cache
      queryOptimizer.invalidate('membership_settings');
      logger.info('Membership settings updated and cache invalidated');
    } catch (error) {
      logger.error('Failed to update membership settings', error);
      throw error;
    }
  }

  // OPTIMIZED USER MEMBERSHIP OPERATIONS
  async getUserMembership(userId: string): Promise<UserMembershipDetailed | null> {
    const cacheKey = `user_membership:${userId}`;
    
    return queryOptimizer.getCached(
      cacheKey,
      async () => {
        const q = query(
          collection(db, 'userMemberships'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          firestoreLimit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        const data = doc.data();

        return {
          id: doc.id,
          userId: data.userId,
          planId: data.planId,
          status: data.status,
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          suspendedAt: data.suspendedAt?.toDate(),
          suspensionReason: data.suspensionReason
        } as UserMembershipDetailed;
      },
      2 * 60 * 1000 // Cache for 2 minutes
    );
  }

  async createUserMembership(
    userId: string, 
    startDate: Date, 
    endDate: Date,
    planId: string = 'basic'
  ): Promise<UserMembership> {
    try {
      const membershipData: Omit<UserMembership, 'id'> = {
        userId,
        planId,
        status: 'active' as MembershipStatus,
        startDate,
        endDate,
        isActive: true,
        createdAt: startDate,
        updatedAt: startDate
      };

      const docRef = doc(collection(db, 'userMemberships'));
      await setDoc(docRef, membershipData);

      // Invalidate user-specific cache
      queryOptimizer.invalidate(`user_membership:${userId}`);
      logger.info('User membership created', { userId, membershipId: docRef.id });

      return { id: docRef.id, ...membershipData };
    } catch (error) {
      logger.error('Failed to create user membership', error);
      throw error;
    }
  }

  async updateUserMembership(
    membershipId: string, 
    updates: Partial<UserMembership>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'userMemberships', membershipId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });

      // Get userId to invalidate specific cache
      const membership = await getDoc(docRef);
      if (membership.exists()) {
        const userId = membership.data().userId;
        queryOptimizer.invalidate(`user_membership:${userId}`);
      }

      logger.info('User membership updated', { membershipId });
    } catch (error) {
      logger.error('Failed to update user membership', error);
      throw error;
    }
  }

  // BATCH OPERATIONS FOR BETTER PERFORMANCE
  async getUserMembershipWithSettings(userId: string): Promise<{
    membership: UserMembershipDetailed | null;
    settings: MembershipSettings | null;
  }> {
    // Execute queries in parallel
    const [membership, settings] = await Promise.all([
      this.getUserMembership(userId),
      this.getMembershipSettings()
    ]);

    return {
      membership,
      settings
    };
  }

  // OPTIMIZED MEMBERSHIP STATUS CHECK
  async checkMembershipStatus(userId: string): Promise<MembershipStatusExtended> {
    const cacheKey = `membership_status:${userId}`;
    
    return queryOptimizer.getCached(
      cacheKey,
      async () => {
        const membership = await this.getUserMembership(userId);
        
        if (!membership) {
          return {
            hasActiveMembership: false,
            status: 'inactive' as MembershipStatus,
            daysUntilExpiration: null,
            isExpired: true,
            canAccessFeatures: false
          };
        }

        const now = new Date();
        const endDate = membership.endDate;
        const isExpired = endDate ? now > endDate : false;
        const daysUntilExpiration = endDate 
          ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          hasActiveMembership: membership.isActive && !isExpired,
          status: membership.status,
          daysUntilExpiration,
          isExpired,
          canAccessFeatures: membership.isActive && !isExpired,
          membership
        };
      },
      60 * 1000 // Cache for 1 minute (more frequent updates needed)
    );
  }

  // PAGINATION SUPPORT
  async getMembershipsPaginated(options: {
    limit?: number;
    startAfter?: string;
    status?: MembershipStatus;
  } = {}): Promise<{
    memberships: UserMembershipDetailed[];
    hasMore: boolean;
    lastDoc?: string;
  }> {
    const { limit = 20, startAfter, status } = options;
    const cacheKey = `memberships_page:${limit}:${startAfter || 'first'}:${status || 'all'}`;

    return queryOptimizer.getCached(
      cacheKey,
      async () => {
        let q = query(
          collection(db, 'userMemberships'),
          orderBy('createdAt', 'desc'),
          firestoreLimit(limit + 1) // Get one extra to check if there are more
        );

        if (status) {
          q = query(q, where('status', '==', status));
        }

        if (startAfter) {
          const startAfterDoc = await getDoc(doc(db, 'userMemberships', startAfter));
          if (startAfterDoc.exists()) {
            q = query(q, orderBy('createdAt', 'desc'));
          }
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs;
        const hasMore = docs.length > limit;
        
        const memberships = docs.slice(0, limit).map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            planId: data.planId,
            status: data.status,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            suspendedAt: data.suspendedAt?.toDate(),
            suspensionReason: data.suspensionReason
          } as UserMembershipDetailed;
        });

        return {
          memberships,
          hasMore,
          lastDoc: hasMore ? docs[limit - 1].id : undefined
        };
      },
      60 * 1000 // Cache for 1 minute
    );
  }

  // BULK OPERATIONS
  async bulkUpdateMemberships(
    updates: Array<{ membershipId: string; data: Partial<UserMembership> }>
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const userIds = new Set<string>();

      for (const update of updates) {
        const docRef = doc(db, 'userMemberships', update.membershipId);
        batch.update(docRef, {
          ...update.data,
          updatedAt: Timestamp.now()
        });

        // Get userId for cache invalidation
        const membership = await getDoc(docRef);
        if (membership.exists()) {
          userIds.add(membership.data().userId);
        }
      }

      await batch.commit();

      // Invalidate caches for affected users
      userIds.forEach(userId => {
        queryOptimizer.invalidate(`user_membership:${userId}`);
        queryOptimizer.invalidate(`membership_status:${userId}`);
      });

      logger.info('Bulk membership update completed', { count: updates.length });
    } catch (error) {
      logger.error('Bulk membership update failed', error);
      throw error;
    }
  }

  // CACHE MANAGEMENT
  clearMembershipCache(userId?: string): void {
    if (userId) {
      queryOptimizer.invalidate(`user_membership:${userId}`);
      queryOptimizer.invalidate(`membership_status:${userId}`);
    } else {
      queryOptimizer.invalidate('membership');
    }
  }

  getCacheStats() {
    return queryOptimizer.getCacheStats();
  }
}

// Singleton instance
export const optimizedMembershipService = OptimizedMembershipService.getInstance();